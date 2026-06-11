import { getEmilyTheme } from "./themes";
import type { PlaceCandidate } from "./tripTypes";
import { slugifyPlaceId } from "./travelData";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIVOYAGE_API = "https://en.wikivoyage.org/w/api.php";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const CITY_ALIASES: Record<string, string> = {
  danang: "Da Nang",
};

const THEME_SEARCH_KEYWORDS: Record<string, string[]> = {
  "마음의 평화": ["tea house", "coffee roastery", "botanical garden"],
  "인생이 무료": ["winery", "brewery", "distillery"],
  "오늘은 욜로": ["nightclub", "speakeasy bar", "nightlife"],
  "신앙": ["temple", "cathedral", "mosque"],
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

export async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = cacheKey("geo", query);
  const cached = readCache<{ lat: number; lng: number }>(key);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${NOMINATIM}?${new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
      })}`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
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
  const enriched = await Promise.all(
    places.map(async (place) => {
      if (place.lat != null && place.lng != null) return place;
      const coords =
        (await geocodeQuery(`${place.title}, ${city}`)) ??
        (await geocodeQuery(`${city} ${place.title}`));
      return coords ? { ...place, lat: coords.lat, lng: coords.lng } : place;
    })
  );
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
  const title = CITY_ALIASES[normalize(city)] ?? city;
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

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]/g, "");
}

/** JSON에 없을 때 무료 공개 API로 장소 후보를 즉시 수집 */
export async function fetchLivePlaces(city: string, theme: string): Promise<PlaceCandidate[]> {
  const cache = readCache<PlaceCandidate[]>(cacheKey("places", `${city}:${theme}`));
  if (cache?.length) return cache;

  const themeMeta = getEmilyTheme(theme);
  const keywords = THEME_SEARCH_KEYWORDS[theme] ?? ["travel"];
  const cityTitle = CITY_ALIASES[normalize(city)] ?? city;
  const places: PlaceCandidate[] = [];
  const seen = new Set<string>();

  const voyage = await fetchWikivoyageCity(city);
  if (voyage) {
    const coords = await geocodeQuery(cityTitle);
    places.push({
      id: slugifyPlaceId(city, voyage.title),
      title: voyage.title,
      angle: `${city} 여행 가이드`,
      why: voyage.extract,
      source_urls: [voyage.url],
      lat: coords?.lat,
      lng: coords?.lng,
    });
    seen.add(voyage.title.toLowerCase());
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
      if (places.length >= 5) break;
    }
    if (places.length >= 5) break;
  }

  const geocoded = await geocodePlaces(city, places);
  writeCache(cacheKey("places", `${city}:${theme}`), geocoded);
  return geocoded;
}
