import { getCachedGeo, saveCachedGeo } from "./geoCache";
import {
  filterPlacesInMetro,
  isWithinMetro,
  metroBoundingBox,
} from "./geoFence";
import { isJunkPlaceTitle } from "./placeTitleFilter";
import { formatSourcesLabel, searchLocalPlaces, type SearchSource } from "./openSourceLocalSearch";
import { parseWikivoyageCosts } from "./wikivoyageCosts";
import type { PlaceCandidate } from "./tripTypes";
import type { CityCostIndex } from "./travelData";

const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKIVOYAGE_API = "https://en.wikivoyage.org/w/api.php";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
const USER_AGENT = "EmilyTravelEditor/1.0 (github.com/Benjamin5607/traveleditor)";

const CITY_ALIASES: Record<string, string> = {
  danang: "Da Nang",
  "da nang": "Da Nang",
  bangkok: "Bangkok",
  singapore: "Singapore",
  taipei: "Taipei",
  osaka: "Osaka",
  kyoto: "Kyoto",
  tokyo: "Tokyo",
  seoul: "Seoul",
  barcelona: "Barcelona",
  rome: "Rome",
  berlin: "Berlin",
  hongkong: "Hong Kong",
  "hong kong": "Hong Kong",
  newyork: "New York",
  "new york": "New York",
  losangeles: "Los Angeles",
};

export type { GeoResult } from "./geoTypes";
import type { GeoResult } from "./geoTypes";

export type LivePlacesResult = {
  places: PlaceCandidate[];
  sourcesUsed: SearchSource[];
  sourcesLabel: string;
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

async function photonGeocode(query: string, near?: GeoResult): Promise<GeoResult | null> {
  try {
    const params: Record<string, string> = { q: query, limit: "3", lang: "en" };
    if (near) {
      params.lat = String(near.lat);
      params.lon = String(near.lng);
      params.location_bias_scale = "0.2";
    }
    const response = await fetch(`${PHOTON}?${new URLSearchParams(params)}`);
    if (!response.ok) return null;
    const data = await response.json();

    for (const feature of data.features ?? []) {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      if (near) {
        const cc = feature.properties?.countrycode?.toLowerCase();
        if (near.countryCode && cc && cc !== near.countryCode.toLowerCase()) continue;
      }

      const extent = feature.properties?.extent as number[] | undefined;
      const boundingBox: [number, number, number, number] | undefined =
        extent?.length === 4 ? [extent[1], extent[3], extent[0], extent[2]] : undefined;

      return {
        lat,
        lng,
        displayName: feature.properties?.name,
        countryCode: feature.properties?.countrycode,
        boundingBox,
      };
    }
    return null;
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

async function nominatimSearch(query: string, near?: GeoResult) {
  const params: Record<string, string> = {
    q: query,
    format: "json",
    limit: "3",
    addressdetails: "1",
  };
  if (near?.countryCode) {
    params.countrycodes = near.countryCode.toLowerCase();
  }
  if (near) {
    const [south, north, west, east] = metroBoundingBox("", near);
    params.viewbox = `${west},${north},${east},${south}`;
    params.bounded = "1";
  }

  const response = await fetch(`${NOMINATIM}?${new URLSearchParams(params)}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
    boundingbox?: [string, string, string, string];
    address?: { country_code?: string };
  }>;

  for (const row of results) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (near && !isWithinMetro(lat, lng, near.displayName?.split(",")[0] ?? "city", near)) continue;

    const bb = row.boundingbox;
    return {
      lat,
      lng,
      displayName: row.display_name,
      countryCode: row.address?.country_code,
      boundingBox: bb
        ? ([Number(bb[0]), Number(bb[1]), Number(bb[2]), Number(bb[3])] as [
            number,
            number,
            number,
            number,
          ])
        : undefined,
    };
  }
  return null;
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

  for (const attempt of [
    () => photonGeocode(title),
    () => wikiCityGeo(title),
    () => enqueueNominatim(() => nominatimSearch(title)),
  ]) {
    const geo = await attempt();
    if (geo && !Number.isNaN(geo.lat) && !Number.isNaN(geo.lng)) {
      writeCache(key, geo);
      await saveCachedGeo(title, geo);
      return geo;
    }
  }
  return null;
}

export async function geocodeQuery(
  query: string,
  city: string,
  cityGeo: GeoResult
): Promise<{ lat: number; lng: number } | null> {
  const key = cacheKey("geo", `${city}:${query}`);
  const cached = readCache<{ lat: number; lng: number }>(key);
  if (cached) {
    if (isWithinMetro(cached.lat, cached.lng, city, cityGeo)) return cached;
    return null;
  }

  const photon = await photonGeocode(query, cityGeo);
  if (photon && isWithinMetro(photon.lat, photon.lng, city, cityGeo)) {
    const coords = { lat: photon.lat, lng: photon.lng };
    writeCache(key, coords);
    return coords;
  }

  try {
    const result = await enqueueNominatim(() => nominatimSearch(query, cityGeo));
    if (!result || !isWithinMetro(result.lat, result.lng, city, cityGeo)) return null;
    const coords = { lat: result.lat, lng: result.lng };
    writeCache(key, coords);
    return coords;
  } catch {
    return null;
  }
}

export async function geocodePlaces(
  city: string,
  places: PlaceCandidate[],
  cityGeo: GeoResult
): Promise<PlaceCandidate[]> {
  const enriched: PlaceCandidate[] = [];
  for (const place of places) {
    if (isJunkPlaceTitle(place.title, place.why)) continue;

    if (place.lat != null && place.lng != null) {
      if (isWithinMetro(place.lat, place.lng, city, cityGeo)) {
        enriched.push(place);
      }
      continue;
    }

    const coords =
      (await geocodeQuery(`${place.title}, ${city}`, city, cityGeo)) ??
      (await geocodeQuery(`${city} ${place.title}`, city, cityGeo));

    if (coords) {
      enriched.push({ ...place, lat: coords.lat, lng: coords.lng });
    }
  }
  return enriched;
}

export async function fetchWikivoyageExtract(
  city: string
): Promise<{ extract: string; url: string; title: string } | null> {
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

export async function fetchLiveCostHints(
  city: string,
  rates?: { USD?: number; EUR?: number; JPY?: number }
): Promise<Partial<CityCostIndex>> {
  const voyage = await fetchWikivoyageExtract(city);
  if (!voyage?.extract) return {};
  return parseWikivoyageCosts(voyage.extract, rates);
}

export async function fetchLivePlaces(
  city: string,
  theme: string,
  countryCode?: string
): Promise<LivePlacesResult> {
  const cityGeo = await geocodeCity(city);
  if (!cityGeo) {
    return { places: [], sourcesUsed: [], sourcesLabel: "지오코딩 실패" };
  }

  const voyage = await fetchWikivoyageExtract(city);
  const { places, sourcesUsed } = await searchLocalPlaces({
    city,
    theme,
    cityGeo,
    countryCode: countryCode ?? cityGeo.countryCode,
    voyageExtract: voyage?.extract,
  });

  const geocoded = await geocodePlaces(city, places, cityGeo);
  const fenced = filterPlacesInMetro(geocoded, city, cityGeo);

  return {
    places: fenced,
    sourcesUsed,
    sourcesLabel: formatSourcesLabel(sourcesUsed),
  };
}
