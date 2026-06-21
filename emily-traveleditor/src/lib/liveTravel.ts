import {
  detectInputLanguages,
  geocodeMatchesCityHint,
  geocodeQueryVariants,
  getCityCountryHint,
  lookupCityHint,
  resolveCanonicalCity,
  scoreGeocodeCandidate,
  wikivoyageLangsForCity,
  WIKIVOYAGE_LANGS,
} from "./cityGeocoding";
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
  astana: "Astana",
  nursultan: "Astana",
  "nur-sultan": "Astana",
  almaty: "Almaty",
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

const GEO_CACHE_VERSION = "v3";

function cacheKey(kind: string, value: string) {
  return `emily-live:${kind}:${GEO_CACHE_VERSION}:${value.toLowerCase()}`;
}

function acceptCityGeocode(city: string, geo: GeoResult | null): geo is GeoResult {
  if (!geo || Number.isNaN(geo.lat) || Number.isNaN(geo.lng)) return false;
  return geocodeMatchesCityHint(city, geo);
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

let nominatimQueue = Promise.resolve();

function enqueueNominatim<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(task, task);
  nominatimQueue = run.then(
    () => new Promise((resolve) => setTimeout(resolve, 1100)),
    () => new Promise((resolve) => setTimeout(resolve, 1100))
  );
  return run;
}

function resolveCityTitle(city: string) {
  const lower = city.trim().toLowerCase();
  const alias = CITY_ALIASES[lower] ?? CITY_ALIASES[normalize(city)];
  return resolveCanonicalCity(city, alias);
}

async function photonGeocode(
  query: string,
  near?: GeoResult,
  lang = "en",
  preferCountry?: string
): Promise<GeoResult | null> {
  try {
    const params: Record<string, string> = { q: query, limit: "8", lang };
    if (near) {
      params.lat = String(near.lat);
      params.lon = String(near.lng);
      params.location_bias_scale = "0.2";
    }
    const response = await fetch(`${PHOTON}?${new URLSearchParams(params)}`);
    if (!response.ok) return null;
    const data = await response.json();

    let best: GeoResult | null = null;
    let bestScore = -1;

    for (const feature of data.features ?? []) {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      const props = feature.properties ?? {};
      const cc = props.countrycode?.toLowerCase();
      if (near?.countryCode && cc && cc !== near.countryCode.toLowerCase()) continue;
      if (preferCountry && cc && cc !== preferCountry.toLowerCase()) continue;

      const score = scoreGeocodeCandidate(
        props.osm_value ?? props.type,
        props.name,
        query,
        props.countrycode,
        preferCountry
      );
      if (score <= bestScore) continue;

      const extent = props.extent as number[] | undefined;
      const boundingBox: [number, number, number, number] | undefined =
        extent?.length === 4 ? [extent[1], extent[3], extent[0], extent[2]] : undefined;

      bestScore = score;
      best = {
        lat,
        lng,
        displayName: props.name,
        countryCode: props.countrycode,
        boundingBox,
      };
    }
    return best;
  } catch {
    return null;
  }
}

function wikiLangForTitle(lang: string, title: string): boolean {
  if (lang === "en") {
    return /[a-zA-Z]/.test(title) && !/[\uac00-\ud7af\u3040-\u30ff\u4e00-\u9fff\u0e00-\u0e7f]/.test(title);
  }
  if (lang === "ko") return /[\uac00-\ud7af]/.test(title);
  if (lang === "ja") return /[\u3040-\u30ff]/.test(title);
  if (lang === "th") return /[\u0e00-\u0e7f]/.test(title);
  if (lang === "zh") return /[\u4e00-\u9fff]/.test(title) && !/[\u3040-\u30ff]/.test(title);
  return true;
}

async function wikiCityGeo(title: string, lang = "en"): Promise<GeoResult | null> {
  if (!wikiLangForTitle(lang, title)) return null;
  try {
    const base =
      lang === "en"
        ? WIKI_SUMMARY
        : `https://${lang}.wikipedia.org/api/rest_v1/page/summary`;
    const response = await fetch(`${base}/${encodeURIComponent(title)}`);
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

async function nominatimSearch(
  query: string,
  near?: GeoResult,
  acceptLangs: string[] = ["en"],
  preferCountry?: string
) {
  const params: Record<string, string> = {
    q: query,
    format: "json",
    limit: "6",
    addressdetails: "1",
    "accept-language": acceptLangs.join(","),
  };
  const countryFilter = near?.countryCode ?? preferCountry;
  if (countryFilter) {
    params.countrycodes = countryFilter.toLowerCase();
  }
  if (near) {
    const [south, north, west, east] = metroBoundingBox("", near);
    params.viewbox = `${west},${north},${east},${south}`;
    params.bounded = "1";
  }

  const response = await fetch(`${NOMINATIM}?${new URLSearchParams(params)}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": acceptLangs.join(","),
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
    boundingbox?: [string, string, string, string];
    type?: string;
    addresstype?: string;
    importance?: number;
    address?: { country_code?: string };
  }>;

  let best: GeoResult | null = null;
  let bestScore = -1;

  for (const row of results) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    const rowCc = row.address?.country_code?.toLowerCase();
    if (preferCountry && rowCc && rowCc !== preferCountry.toLowerCase()) continue;
    if (near && !isWithinMetro(lat, lng, near.displayName?.split(",")[0] ?? "city", near)) continue;

    const score = scoreGeocodeCandidate(
      row.addresstype ?? row.type,
      row.display_name?.split(",")[0],
      query,
      row.address?.country_code,
      preferCountry,
      row.importance ?? 0
    );
    if (score <= bestScore) continue;

    const bb = row.boundingbox;
    bestScore = score;
    best = {
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
  return best;
}

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  const raw = city.trim();
  if (!raw) return null;

  const key = cacheKey("city", raw.toLowerCase());
  const sessionCached = readCache<GeoResult>(key);
  if (acceptCityGeocode(raw, sessionCached)) return sessionCached;

  const staticOrIdb =
    (await getCachedGeo(raw)) ?? (await getCachedGeo(resolveCityTitle(raw)));
  if (acceptCityGeocode(raw, staticOrIdb)) {
    writeCache(key, staticOrIdb);
    return staticOrIdb;
  }

  const inputLangs = detectInputLanguages(raw);
  const queries = geocodeQueryVariants(raw, resolveCityTitle(raw));
  const preferCountry = getCityCountryHint(raw) ?? lookupCityHint(raw)?.countryCode;

  for (const query of queries) {
    for (const lang of inputLangs) {
      const photon = await photonGeocode(query, undefined, lang, preferCountry);
      if (acceptCityGeocode(raw, photon)) {
        writeCache(key, photon);
        await saveCachedGeo(raw, photon);
        return photon;
      }
    }

    const nominatim = await enqueueNominatim(() =>
      nominatimSearch(query, undefined, inputLangs, preferCountry)
    );
    if (acceptCityGeocode(raw, nominatim)) {
      writeCache(key, nominatim);
      await saveCachedGeo(raw, nominatim);
      return nominatim;
    }

    const wikiLangs = [...new Set([...inputLangs, "en"])];
    for (const lang of wikiLangs) {
      const wiki = await wikiCityGeo(query, lang);
      if (acceptCityGeocode(raw, wiki)) {
        writeCache(key, wiki);
        await saveCachedGeo(raw, wiki);
        return wiki;
      }
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

async function fetchWikivoyageExtractLang(
  city: string,
  lang: string
): Promise<{ extract: string; url: string; title: string; lang: string } | null> {
  const queries = geocodeQueryVariants(city, resolveCityTitle(city));
  const api =
    lang === "en" ? WIKIVOYAGE_API : `https://${lang}.wikivoyage.org/w/api.php`;

  for (const title of queries) {
    try {
      const response = await fetch(`${api}?${wikiParams({
        action: "query",
        prop: "extracts",
        explaintext: "1",
        titles: title,
        redirects: "1",
      })}`);
      if (!response.ok) continue;
      const data = await response.json();
      const page = Object.values(data.query?.pages ?? {})[0] as {
        title?: string;
        extract?: string;
        missing?: string;
      };
      if (!page?.extract || page.missing !== undefined) continue;
      const pageTitle = page.title ?? title;
      return {
        title: pageTitle,
        extract: String(page.extract),
        url: `https://${lang}.wikivoyage.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`,
        lang,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchWikivoyageExtract(
  city: string,
  countryCode?: string
): Promise<{ extract: string; url: string; title: string; lang?: string } | null> {
  const cacheKeyBase = `${city.trim().toLowerCase()}:${countryCode ?? "xx"}`;
  const cache = readCache<{ extract: string; url: string; title: string; lang?: string }>(
    cacheKey("voyage", cacheKeyBase)
  );
  if (cache) return cache;

  const langsToTry = wikivoyageLangsForCity(city, countryCode).filter((l) =>
    WIKIVOYAGE_LANGS.includes(l as (typeof WIKIVOYAGE_LANGS)[number])
  );

  for (const lang of langsToTry) {
    const result = await fetchWikivoyageExtractLang(city, lang);
    if (result) {
      const { lang: foundLang, ...rest } = result;
      const payload = { ...rest, lang: foundLang };
      writeCache(cacheKey("voyage", cacheKeyBase), payload);
      return payload;
    }
  }

  return null;
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
  countryCode?: string,
  uiLocale: "ko" | "en" = "ko",
  knownCityGeo?: GeoResult | null
): Promise<LivePlacesResult> {
  const searchCity = resolveCanonicalCity(city);
  const cityGeo = knownCityGeo ?? (await geocodeCity(city));
  if (!cityGeo) {
    return {
      places: [],
      sourcesUsed: [],
      sourcesLabel: uiLocale === "en" ? "Geocoding failed" : "지오코딩 실패",
    };
  }

  const voyage = await fetchWikivoyageExtract(
    searchCity,
    countryCode ?? cityGeo.countryCode
  );
  const { places, sourcesUsed } = await searchLocalPlaces({
    city: searchCity,
    theme,
    cityGeo,
    countryCode: countryCode ?? cityGeo.countryCode,
    voyageExtract: voyage?.extract,
    uiLocale,
  });

  const geocoded = await geocodePlaces(searchCity, places, cityGeo);
  const fenced = filterPlacesInMetro(geocoded, searchCity, cityGeo);

  return {
    places: fenced,
    sourcesUsed,
    sourcesLabel: formatSourcesLabel(sourcesUsed, uiLocale),
  };
}
