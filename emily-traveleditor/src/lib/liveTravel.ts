import { getEmilyTheme } from "./themes";
import type { PlaceCandidate } from "./tripTypes";
import { slugifyPlaceId } from "./travelData";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIVOYAGE_API = "https://en.wikivoyage.org/w/api.php";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "EmilyTravelEditor/1.0 (free travel guidebook; github.com/Benjamin5607/traveleditor)";

const CITY_ALIASES: Record<string, string> = {
  danang: "Da Nang",
  "da nang": "Da Nang",
  bangkok: "Bangkok",
  singapore: "Singapore",
  taipei: "Taipei",
  osaka: "Osaka",
  kyoto: "Kyoto",
  barcelona: "Barcelona",
  rome: "Rome",
  berlin: "Berlin",
};

const THEME_SEARCH_KEYWORDS: Record<string, string[]> = {
  "마음의 평화": ["tea house", "coffee roastery", "botanical garden"],
  "인생이 무료": ["winery", "brewery", "distillery"],
  "오늘은 욜로": ["nightclub", "speakeasy bar", "nightlife"],
  "신앙": ["temple", "cathedral", "mosque"],
};

/** OSM Overpass 태그 — 테마별 무료 POI 검색 */
const THEME_OSM_QUERIES: Record<string, string[]> = {
  "마음의 평화": ['node["amenity"="cafe"]', 'node["shop"="tea"]', 'node["leisure"="garden"]'],
  "인생이 무료": ['node["craft"="brewery"]', 'node["amenity"="pub"]', 'node["craft"="winery"]'],
  "오늘은 욜로": ['node["amenity"="nightclub"]', 'node["amenity"="bar"]'],
  "신앙": ['node["amenity"="place_of_worship"]', 'way["amenity"="place_of_worship"]'],
};

export type GeoResult = {
  lat: number;
  lng: number;
  displayName?: string;
  countryCode?: string;
  boundingBox?: [number, number, number, number];
};

function wikiParams(params: Record<string, string>) {
  return new URLSearchParams({ format: "json", origin: "*", ...params }).toString();
}

function cacheKey(kind: string, value: string) {
  return `emily-live:${kind}:${value.toLowerCase()}`;
}

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]/g, "");
}

function resolveCityTitle(city: string) {
  const lower = city.trim().toLowerCase();
  return CITY_ALIASES[lower] ?? CITY_ALIASES[normalize(city)] ?? city;
}

let nominatimQueue = Promise.resolve();

function enqueueNominatim<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(task, task);
  nominatimQueue = run.then(
    () => new Promise((resolve) => setTimeout(resolve, 1100)),
    () => new Promise((resolve) => setTimeout(resolve, 1100))
  );
  return run;
}

async function nominatimSearch(query: string, limit = "1") {
  const response = await fetch(
    `${NOMINATIM}?${new URLSearchParams({
      q: query,
      format: "json",
      limit,
      addressdetails: "1",
    })}`,
    { headers: { Accept: "application/json", "User-Agent": USER_AGENT } }
  );
  if (!response.ok) return [];
  return (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
    boundingbox?: [string, string, string, string];
    address?: { country_code?: string };
  }>;
}

function parseGeoResult(row: {
  lat: string;
  lon: string;
  display_name?: string;
  boundingbox?: [string, string, string, string];
  address?: { country_code?: string };
}): GeoResult {
  const bb = row.boundingbox;
  return {
    lat: Number(row.lat),
    lng: Number(row.lon),
    displayName: row.display_name,
    countryCode: row.address?.country_code,
    boundingBox: bb
      ? [Number(bb[0]), Number(bb[1]), Number(bb[2]), Number(bb[3])]
      : undefined,
  };
}

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const title = resolveCityTitle(city);
  const key = cacheKey("city", title);
  const cached = readCache<GeoResult>(key);
  if (cached) return cached;

  try {
    const results = await enqueueNominatim(() => nominatimSearch(title));
    const row = results[0];
    if (!row) return null;
    const geo = parseGeoResult(row);
    if (Number.isNaN(geo.lat) || Number.isNaN(geo.lng)) return null;
    writeCache(key, geo);
    return geo;
  } catch {
    return null;
  }
}

export async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = cacheKey("geo", query);
  const cached = readCache<{ lat: number; lng: number }>(key);
  if (cached) return cached;

  try {
    const results = await enqueueNominatim(() => nominatimSearch(query));
    if (!results[0]) return null;
    const coords = { lat: Number(results[0].lat), lng: Number(results[0].lon) };
    if (Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) return null;
    writeCache(key, coords);
    return coords;
  } catch {
    return null;
  }
}

export async function geocodePlaces(city: string, places: PlaceCandidate[]): Promise<PlaceCandidate[]> {
  const enriched: PlaceCandidate[] = [];
  for (const place of places) {
    if (place.lat != null && place.lng != null) {
      enriched.push(place);
      continue;
    }
    const coords =
      (await geocodeQuery(`${place.title}, ${city}`)) ??
      (await geocodeQuery(`${city} ${place.title}`));
    enriched.push(coords ? { ...place, lat: coords.lat, lng: coords.lng } : place);
  }
  return enriched;
}

async function fetchWikiSummary(title: string) {
  try {
    const response = await fetch(`${WIKI_SUMMARY}/${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.extract) return null;
    return {
      title: data.title as string,
      extract: String(data.extract).slice(0, 280),
      url: data.content_urls?.desktop?.page as string | undefined,
      lat: data.coordinates?.lat as number | undefined,
      lng: data.coordinates?.lon as number | undefined,
    };
  } catch {
    return null;
  }
}

async function searchWikipedia(query: string, limit = 2) {
  try {
    const response = await fetch(`${WIKI_API}?${wikiParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: String(limit),
    })}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.query?.search ?? []) as Array<{ title: string }>;
  } catch {
    return [];
  }
}

async function fetchWikivoyageCity(city: string) {
  const title = resolveCityTitle(city);
  try {
    const response = await fetch(`${WIKIVOYAGE_API}?${wikiParams({
      action: "query",
      prop: "extracts",
      explaintext: "1",
      titles: title,
      redirects: "1",
    })}`);
    if (!response.ok) return null;
    const data = await response.json();
    const page = Object.values(data.query?.pages ?? {})[0] as { title?: string; extract?: string };
    if (!page?.extract) return null;
    return {
      title: `Wikivoyage: ${page.title ?? title}`,
      extract: String(page.extract).slice(0, 320),
      url: `https://en.wikivoyage.org/wiki/${encodeURIComponent((page.title ?? title).replace(/ /g, "_"))}`,
    };
  } catch {
    return null;
  }
}

async function fetchOsmPois(cityGeo: GeoResult, theme: string, city: string): Promise<PlaceCandidate[]> {
  const bb = cityGeo.boundingBox;
  if (!bb) return [];

  const south = bb[0];
  const north = bb[1];
  const west = bb[2];
  const east = bb[3];
  const bbox = `${south},${west},${north},${east}`;
  const queries = THEME_OSM_QUERIES[theme] ?? ['node["tourism"="attraction"]'];
  const themeMeta = getEmilyTheme(theme);
  const places: PlaceCandidate[] = [];
  const seen = new Set<string>();

  for (const tagQuery of queries) {
    if (places.length >= 4) break;
    const overpass = `[out:json][timeout:20];(${tagQuery}(${bbox}););out center 4;`;
    try {
      const response = await fetch(OVERPASS, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpass)}`,
      });
      if (!response.ok) continue;
      const data = await response.json();
      for (const element of data.elements ?? []) {
        const name = element.tags?.name as string | undefined;
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        places.push({
          id: slugifyPlaceId(city, name),
          title: name,
          angle: themeMeta.shortLabel,
          why: `${city} OpenStreetMap 무료 POI (${element.tags?.amenity || element.tags?.shop || "venue"})`,
          source_urls: [`https://www.openstreetmap.org/${element.type}/${element.id}`],
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lon === "number" ? lon : undefined,
        });
        if (places.length >= 4) break;
      }
    } catch {
      /* skip failed overpass query */
    }
  }

  return places;
}

/** JSON에 없을 때 무료 공개 API로 장소 후보를 즉시 수집 */
export async function fetchLivePlaces(city: string, theme: string): Promise<PlaceCandidate[]> {
  const cache = readCache<PlaceCandidate[]>(cacheKey("places", `${city}:${theme}`));
  if (cache?.length) return cache;

  const themeMeta = getEmilyTheme(theme);
  const keywords = THEME_SEARCH_KEYWORDS[theme] ?? ["travel"];
  const cityTitle = resolveCityTitle(city);
  const cityGeo = await geocodeCity(city);
  const places: PlaceCandidate[] = [];
  const seen = new Set<string>();

  const voyage = await fetchWikivoyageCity(city);
  if (voyage) {
    places.push({
      id: slugifyPlaceId(city, voyage.title),
      title: voyage.title,
      angle: `${city} 여행 가이드`,
      why: voyage.extract,
      source_urls: [voyage.url],
      lat: cityGeo?.lat,
      lng: cityGeo?.lng,
    });
    seen.add(voyage.title.toLowerCase());
  }

  if (cityGeo) {
    const osmPlaces = await fetchOsmPois(cityGeo, theme, city);
    for (const place of osmPlaces) {
      if (seen.has(place.title.toLowerCase())) continue;
      seen.add(place.title.toLowerCase());
      places.push(place);
    }
  }

  for (const keyword of keywords) {
    const results = await searchWikipedia(`"${cityTitle}" ${keyword}`, 2);
    for (const result of results) {
      if (seen.has(result.title.toLowerCase())) continue;
      const summary = await fetchWikiSummary(result.title);
      if (!summary) continue;
      seen.add(summary.title.toLowerCase());
      places.push({
        id: slugifyPlaceId(city, summary.title),
        title: summary.title,
        angle: themeMeta.shortLabel,
        why: summary.extract,
        source_urls: summary.url ? [summary.url] : [],
        lat: summary.lat,
        lng: summary.lng,
      });
      if (places.length >= 6) break;
    }
    if (places.length >= 6) break;
  }

  const geocoded = await geocodePlaces(city, places);
  writeCache(cacheKey("places", `${city}:${theme}`), geocoded);
  return geocoded;
}
