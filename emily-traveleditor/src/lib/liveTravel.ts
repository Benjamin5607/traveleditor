import { getCachedGeo, saveCachedGeo } from "./geoCache";
import {
  buildMultilingualQueries,
  fetchWikiSummaryLang,
  searchWikipediaLang,
} from "./multilingualSearch";
import { getEmilyTheme } from "./themes";
import { fetchWikidataPois } from "./wikidata";
import { parseWikivoyageCosts } from "./wikivoyageCosts";
import type { PlaceCandidate } from "./tripTypes";
import type { CityCostIndex } from "./travelData";
import { slugifyPlaceId } from "./travelData";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIVOYAGE_API = "https://en.wikivoyage.org/w/api.php";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
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
  hongkong: "Hong Kong",
  "hong kong": "Hong Kong",
  newyork: "New York",
  "new york": "New York",
  losangeles: "Los Angeles",
};

const THEME_SEARCH_KEYWORDS: Record<string, string[]> = {
  "마음의 평화": ["tea house", "coffee roastery", "botanical garden"],
  "인생이 무료": ["winery", "brewery", "distillery"],
  "오늘은 욜로": ["nightclub", "speakeasy bar", "nightlife"],
  "신앙": ["temple", "cathedral", "mosque"],
};

const THEME_OSM_QUERIES: Record<string, string[]> = {
  "마음의 평화": ['node["amenity"="cafe"]', 'node["shop"="tea"]'],
  "인생이 무료": ['node["craft"="brewery"]', 'node["amenity"="pub"]'],
  "오늘은 욜로": ['node["amenity"="nightclub"]', 'node["amenity"="bar"]'],
  "신앙": ['node["amenity"="place_of_worship"]'],
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
    /* ignore */
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

async function photonGeocode(query: string): Promise<GeoResult | null> {
  try {
    const response = await fetch(
      `${PHOTON}?${new URLSearchParams({ q: query, limit: "1", lang: "en" })}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    const extent = feature.properties?.extent as number[] | undefined;
    const boundingBox: [number, number, number, number] | undefined = extent?.length === 4
      ? [extent[1], extent[3], extent[0], extent[2]]
      : undefined;
    return {
      lat,
      lng,
      displayName: feature.properties?.name,
      countryCode: feature.properties?.countrycode,
      boundingBox,
    };
  } catch {
    return null;
  }
}

async function wikiCityGeo(title: string): Promise<GeoResult | null> {
  try {
    const response = await fetch(`${WIKI_SUMMARY}/${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    const data = await response.json();
    const lat = data.coordinates?.lat;
    const lng = data.coordinates?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { lat, lng, displayName: data.title };
  } catch {
    return null;
  }
}

async function nominatimSearch(query: string) {
  const response = await fetch(
    `${NOMINATIM}?${new URLSearchParams({ q: query, format: "json", limit: "1", addressdetails: "1" })}`,
    { headers: { Accept: "application/json", "User-Agent": USER_AGENT } }
  );
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
    boundingbox?: [string, string, string, string];
    address?: { country_code?: string };
  }>;
  const row = results[0];
  if (!row) return null;
  const bb = row.boundingbox;
  return {
    lat: Number(row.lat),
    lng: Number(row.lon),
    displayName: row.display_name,
    countryCode: row.address?.country_code,
    boundingBox: bb ? [Number(bb[0]), Number(bb[1]), Number(bb[2]), Number(bb[3])] as [number, number, number, number] : undefined,
  };
}

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const title = resolveCityTitle(city);
  const key = cacheKey("city", title);
  const sessionCached = readCache<GeoResult>(key);
  if (sessionCached) return sessionCached;

  const staticOrIdb = await getCachedGeo(title);
  if (staticOrIdb) {
    writeCache(key, staticOrIdb);
    return staticOrIdb;
  }

  const chain = [
    () => photonGeocode(title),
    () => wikiCityGeo(title),
    () => enqueueNominatim(() => nominatimSearch(title)),
  ];

  for (const attempt of chain) {
    const geo = await attempt();
    if (geo && !Number.isNaN(geo.lat) && !Number.isNaN(geo.lng)) {
      writeCache(key, geo);
      await saveCachedGeo(title, geo);
      return geo;
    }
  }
  return null;
}

export async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = cacheKey("geo", query);
  const cached = readCache<{ lat: number; lng: number }>(key);
  if (cached) return cached;

  const photon = await photonGeocode(query);
  if (photon) {
    const coords = { lat: photon.lat, lng: photon.lng };
    writeCache(key, coords);
    return coords;
  }

  try {
    const result = await enqueueNominatim(() => nominatimSearch(query));
    if (!result) return null;
    const coords = { lat: result.lat, lng: result.lng };
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

export async function fetchWikivoyageExtract(city: string): Promise<{ extract: string; url: string; title: string } | null> {
  const title = resolveCityTitle(city);
  const cache = readCache<{ extract: string; url: string; title: string }>(cacheKey("voyage", title));
  if (cache) return cache;

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
    const result = {
      title: page.title ?? title,
      extract: String(page.extract),
      url: `https://en.wikivoyage.org/wiki/${encodeURIComponent((page.title ?? title).replace(/ /g, "_"))}`,
    };
    writeCache(cacheKey("voyage", title), result);
    return result;
  } catch {
    return null;
  }
}

/** Wikivoyage 본문에서 물가 힌트 추출 */
export async function fetchLiveCostHints(
  city: string,
  rates?: { USD?: number; EUR?: number; JPY?: number }
): Promise<Partial<CityCostIndex>> {
  const voyage = await fetchWikivoyageExtract(city);
  if (!voyage?.extract) return {};
  return parseWikivoyageCosts(voyage.extract, rates);
}

async function fetchOsmPois(cityGeo: GeoResult, theme: string, city: string): Promise<PlaceCandidate[]> {
  const bb = cityGeo.boundingBox;
  if (!bb) return [];

  const bbox = `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`;
  const queries = THEME_OSM_QUERIES[theme] ?? ['node["tourism"="attraction"]'];
  const themeMeta = getEmilyTheme(theme);
  const places: PlaceCandidate[] = [];
  const seen = new Set<string>();

  for (const tagQuery of queries) {
    if (places.length >= 3) break;
    const overpass = `[out:json][timeout:15];(${tagQuery}(${bbox}););out center 3;`;
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
          why: `${city} OSM POI`,
          source_urls: [`https://www.openstreetmap.org/${element.type}/${element.id}`],
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lon === "number" ? lon : undefined,
        });
      }
    } catch {
      /* skip */
    }
  }
  return places;
}

/** JSON에 없을 때 무료 공개 API로 장소 후보를 즉시 수집 (한·영·로컬어 Wikipedia) */
export async function fetchLivePlaces(
  city: string,
  theme: string,
  countryCode?: string
): Promise<PlaceCandidate[]> {
  const cacheKeyPlaces = cacheKey("places", `${city}:${theme}:${countryCode ?? "xx"}`);
  const cache = readCache<PlaceCandidate[]>(cacheKeyPlaces);
  if (cache?.length) return cache;

  const themeMeta = getEmilyTheme(theme);
  const keywords = THEME_SEARCH_KEYWORDS[theme] ?? ["travel"];
  const cityTitle = resolveCityTitle(city);
  const cityGeo = await geocodeCity(city);
  const places: PlaceCandidate[] = [];
  const seen = new Set<string>();

  const voyage = await fetchWikivoyageExtract(city);
  if (voyage) {
    places.push({
      id: slugifyPlaceId(city, `Wikivoyage: ${voyage.title}`),
      title: `Wikivoyage: ${voyage.title}`,
      angle: `${city} 여행 가이드`,
      why: voyage.extract.slice(0, 320),
      source_urls: [voyage.url],
      lat: cityGeo?.lat,
      lng: cityGeo?.lng,
    });
    seen.add(voyage.title.toLowerCase());
  }

  if (cityGeo) {
    const wikidataPlaces = await fetchWikidataPois(city, theme, cityGeo);
    for (const place of wikidataPlaces) {
      if (seen.has(place.title.toLowerCase())) continue;
      seen.add(place.title.toLowerCase());
      places.push(place);
    }

    if (places.length < 4) {
      const osmPlaces = await fetchOsmPois(cityGeo, theme, city);
      for (const place of osmPlaces) {
        if (seen.has(place.title.toLowerCase())) continue;
        seen.add(place.title.toLowerCase());
        places.push(place);
      }
    }
  }

  const mlQueries = buildMultilingualQueries(city, theme, countryCode);
  for (const { lang, query } of mlQueries) {
    if (places.length >= 10) break;
    const results = await searchWikipediaLang(lang.wikiApi, query, 2);
    for (const result of results) {
      if (seen.has(result.title.toLowerCase())) continue;
      const summary = await fetchWikiSummaryLang(result.lang, result.title);
      if (!summary) continue;
      seen.add(summary.title.toLowerCase());
      places.push({
        id: slugifyPlaceId(city, summary.title),
        title: summary.title,
        angle: `${themeMeta.shortLabel} (${lang.label})`,
        why: `[${lang.label} Wikipedia] ${summary.extract}`,
        source_urls: summary.url ? [summary.url] : [],
        lat: summary.lat,
        lng: summary.lng,
      });
    }
  }

  for (const keyword of keywords) {
    if (places.length >= 10) break;
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
    }
  }

  const geocoded = await geocodePlaces(city, places);
  writeCache(cacheKeyPlaces, geocoded);
  return geocoded;
}
