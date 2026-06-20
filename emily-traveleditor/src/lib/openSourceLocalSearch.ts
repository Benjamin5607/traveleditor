/**
 * Emily Open Source Local Search (EOSLS)
 */
import type { GeoResult } from "./geoTypes";
import {
  buildQualityWhy,
  isGlobalChain,
  passesQualityGate,
  scorePlaceQuality,
  type PlaceSource,
} from "./placeQuality";
import {
  filterPlacesInMetro,
  isWithinMetro,
  metroBoundingBox,
  overpassBboxString,
} from "./geoFence";
import { beachWhy, isGenericPlaceName, pickBestOsmName, resolveOsmPlaceName } from "./placeNaming";
import { isAdministrativePlace, isJunkPlaceTitle, isPhysicalPlace } from "./placeTitleFilter";
import { getEmilyTheme } from "./themes";
import {
  GENERAL_CITY_OSM,
  GENERAL_PHOTON_TAGS,
  THEME_OSM,
  THEME_PHOTON_TAGS,
  filterPlacesForTheme,
  passesFaithHeritageFilter,
} from "./themeFilters";
import { isStrictTheme, maxPlacePoolSize } from "./themeBlend";
import type { Locale } from "./i18n";
import { fetchWikidataPois } from "./wikidata";
import { parseVenuesForTheme, parseVenuesFromWikivoyage } from "./wikivoyageParser";
import { buildMultilingualQueries } from "./multilingualSearch";
import type { PlaceCandidate } from "./tripTypes";
import { slugifyPlaceId } from "./travelData";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "EmilyTravelEditor/1.0 EOSLS (github.com/Benjamin5607/traveleditor)";

export type SearchSource = PlaceSource;

type RawHit = {
  title: string;
  localName?: string;
  why: string;
  lat?: number;
  lng?: number;
  source: SearchSource;
  source_urls: string[];
  qualityScore: number;
  tags?: Record<string, string>;
  wikivoyageSection?: string;
};

function cacheKey(city: string, theme: string, cc?: string) {
  return `emily-eosls-v11:${city}:${theme}:${cc ?? "xx"}`.toLowerCase();
}

function readCache(key: string): PlaceCandidate[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as PlaceCandidate[]) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, places: PlaceCandidate[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(places));
  } catch {
    /* ignore */
  }
}

function osmWhy(tags: Record<string, string>, label: string, city: string, placeName?: string) {
  const kind =
    tags.natural === "beach" && placeName
      ? `해변 · ${placeName}`
      : tags.natural === "beach"
        ? "해변"
        : label;
  const parts = [`${city} OSM`, kind];
  if (tags.cuisine) parts.push(`요리: ${tags.cuisine}`);
  if (tags.heritage) parts.push(`문화유산: ${tags.heritage}`);
  if (tags.historic) parts.push(`역사: ${tags.historic}`);
  if (tags.stars || tags["michelin:stars"]) parts.push(`등급: ${tags.stars ?? tags["michelin:stars"]}`);
  if (tags.wikipedia) parts.push("Wikipedia 등록");
  if (tags.wikidata) parts.push("Wikidata 등록");
  if (tags.opening_hours) parts.push(`영업: ${tags.opening_hours}`);
  const addr = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  if (addr) parts.push(`주소: ${addr}`);
  return parts.join(" · ");
}

function osmUrl(type: string, id: number) {
  return `https://www.openstreetmap.org/${type}/${id}`;
}

function isFaithTheme(themeId: string) {
  return themeId === "faith_heritage";
}

function hitFromQuality(
  partial: Omit<RawHit, "qualityScore"> & { nominatimImportance?: number },
  themeId: string,
  options?: { relaxedGate?: boolean }
): RawHit | null {
  if (
    !isPhysicalPlace(partial.title, partial.why, {
      lat: partial.lat,
      lng: partial.lng,
      source: partial.source,
      wikivoyageSection: partial.wikivoyageSection,
      tags: partial.tags,
    })
  ) {
    return null;
  }

  const qualityScore = scorePlaceQuality({
    title: partial.title,
    why: partial.why,
    source: partial.source,
    themeId: themeId as import("./themes").ThemeId,
    tags: partial.tags,
    wikivoyageSection: partial.wikivoyageSection,
    nominatimImportance: partial.nominatimImportance,
  });

  const gate = passesQualityGate(
    {
      title: partial.title,
      why: partial.why,
      source: partial.source,
      themeId: themeId as import("./themes").ThemeId,
      tags: partial.tags,
      wikivoyageSection: partial.wikivoyageSection,
      nominatimImportance: partial.nominatimImportance,
    },
    { relaxed: options?.relaxedGate }
  );

  if (!gate) return null;

  return { ...partial, qualityScore };
}

async function overpassSearch(
  bbox: string,
  themeId: string,
  city: string,
  cityGeo: GeoResult,
  countryCode?: string,
  options?: { filters?: Array<{ filter: string; label: string }>; relaxedGate?: boolean }
): Promise<RawHit[]> {
  const filters = options?.filters ?? THEME_OSM[themeId as keyof typeof THEME_OSM] ?? [
    { filter: '["tourism"="attraction"]', label: "명소" },
  ];
  const hits: RawHit[] = [];
  const seen = new Set<string>();

  const parts = filters
    .map(
      (f) =>
        `node${f.filter}(${bbox});way${f.filter}(${bbox});relation${f.filter}(${bbox});`
    )
    .join("");

  const query = `[out:json][timeout:25];(${parts});out center 40;`;
  try {
    const response = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return hits;
    const data = await response.json();
    for (const el of data.elements ?? []) {
      const tags = (el.tags ?? {}) as Record<string, string>;
      const name = await resolveOsmPlaceName(tags, countryCode);
      if (!name || isGenericPlaceName(name, tags) || seen.has(name.toLowerCase())) continue;
      if (isGlobalChain(name, tags)) continue;
      if (isJunkPlaceTitle(name)) continue;

      const label = tags.historic || tags.amenity || tags.tourism || tags.natural || "POI";
      const why =
        tags.natural === "beach"
          ? beachWhy(name, city)
          : osmWhy(tags, label, city, name);

      if (isFaithTheme(themeId)) {
        const hasHeritage =
          Boolean(tags.historic) || Boolean(tags.heritage) || Boolean(tags.start_date);
        if (!hasHeritage && !passesFaithHeritageFilter(name, why)) continue;
      }

      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (typeof lat === "number" && typeof lon === "number") {
        if (!isWithinMetro(lat, lon, city, cityGeo)) continue;
      }

      const hit = hitFromQuality(
        {
          title: name,
          localName: tags.name !== name ? tags.name : undefined,
          why,
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lon === "number" ? lon : undefined,
          source: "osm",
          source_urls: [osmUrl(el.type, el.id)],
          tags,
        },
        themeId,
        { relaxedGate: options?.relaxedGate }
      );
      if (!hit) continue;

      seen.add(name.toLowerCase());
      hits.push(hit);
    }
  } catch {
    /* skip */
  }
  return hits.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 22);
}

async function photonSearch(
  cityGeo: GeoResult,
  themeId: string,
  city: string,
  options?: { tags?: string[]; relaxedGate?: boolean }
): Promise<RawHit[]> {
  const tags = options?.tags ?? THEME_PHOTON_TAGS[themeId as keyof typeof THEME_PHOTON_TAGS] ?? ["tourism:attraction"];
  const hits: RawHit[] = [];
  const seen = new Set<string>();

  const themeKeywords =
    buildMultilingualQueries(city, themeId, cityGeo.countryCode)[0]?.query.replace(`"${city}"`, city).trim() ??
    `${city} attraction`;

  for (const osmTag of tags.slice(0, 3)) {
    try {
      const params = new URLSearchParams({
        q: themeKeywords,
        lat: String(cityGeo.lat),
        lon: String(cityGeo.lng),
        limit: "12",
        osm_tag: osmTag,
      });
      const response = await fetch(`${PHOTON}?${params}`);
      if (!response.ok) continue;
      const data = await response.json();
      for (const feature of data.features ?? []) {
        const props = feature.properties ?? {};
        const tagMap: Record<string, string> = {
          amenity: props.amenity ?? "",
          cuisine: props.cuisine ?? "",
          tourism: props.tourism ?? "",
          natural: props.natural ?? "",
          leisure: props.leisure ?? "",
          brand: props.brand ?? "",
        };
        const name = pickBestOsmName(
          {
            name: props.name,
            "name:ko": props["name:ko"],
            "name:ja": props["name:ja"],
            "name:th": props["name:th"],
            "name:vi": props["name:vi"],
            ...tagMap,
          },
          cityGeo.countryCode
        );
        if (!name || isGenericPlaceName(name, tagMap) || seen.has(String(name).toLowerCase())) continue;

        if (isGlobalChain(String(name), tagMap)) continue;
        if (isJunkPlaceTitle(String(name))) continue;

        const plat = feature.geometry?.coordinates?.[1];
        const plng = feature.geometry?.coordinates?.[0];
        if (typeof plat === "number" && typeof plng === "number") {
          if (!isWithinMetro(plat, plng, city, cityGeo)) continue;
        }

        const why =
          tagMap.natural === "beach"
            ? beachWhy(String(name), city)
            : `${city} Photon (${osmTag})`;
        const hit = hitFromQuality(
          {
            title: String(name),
            why,
            lat: plat,
            lng: plng,
            source: "photon",
            source_urls: props.osm_id ? [osmUrl(props.osm_type ?? "node", props.osm_id)] : [],
            tags: tagMap,
          },
          themeId,
          { relaxedGate: options?.relaxedGate }
        );
        if (!hit) continue;

        seen.add(String(name).toLowerCase());
        hits.push(hit);
      }
    } catch {
      /* skip */
    }
  }
  return hits;
}

let nominatimQueue = Promise.resolve();

function enqueueNominatim<T>(task: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(task, task);
  nominatimQueue = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100))
  );
  return run;
}

async function nominatimLocalSearch(
  query: string,
  cityGeo: GeoResult,
  city: string,
  themeId: string,
  options?: { relaxedGate?: boolean }
): Promise<RawHit[]> {
  const [south, north, west, east] = metroBoundingBox(city, cityGeo);
  const params: Record<string, string> = {
    q: query,
    format: "json",
    limit: "8",
    addressdetails: "1",
    extratags: "1",
    viewbox: `${west},${north},${east},${south}`,
    bounded: "1",
  };
  if (cityGeo.countryCode) {
    params.countrycodes = cityGeo.countryCode.toLowerCase();
  }

  try {
    const response = await enqueueNominatim(() =>
      fetch(`${NOMINATIM}?${new URLSearchParams(params)}`, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      })
    );
    if (!response.ok) return [];
    const rows = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      class: string;
      type: string;
      importance?: number;
      extratags?: Record<string, string>;
      osm_type?: string;
      osm_id?: number;
    }>;

    const hits: RawHit[] = [];
    const allowNatural = themeId === "nature_trail" || themeId === "photo_landmark";

    for (const r of rows) {
      const classType = `${r.class}/${r.type}`;
      if (/place\/(suburb|quarter|neighbourhood|city|town|village)|boundary\/administrative|highway\/(residential|primary|secondary)/.test(classType)) {
        continue;
      }
      if ((r.importance ?? 0) < 0.28) continue;
      if (!/tourism|amenity|shop|leisure|historic/.test(classType)) {
        if (!(allowNatural && /natural\/beach/.test(classType))) continue;
      }

      const extratags = r.extratags ?? {};
      const fromDisplay = r.display_name.split(",")[0]?.trim() || r.display_name;
      const name =
        pickBestOsmName({ name: fromDisplay, ...extratags }, cityGeo.countryCode) ?? fromDisplay;

      if (isGenericPlaceName(name, extratags)) continue;
      if (isGlobalChain(name, extratags)) continue;
      if (isJunkPlaceTitle(name)) continue;

      const lat = Number(r.lat);
      const lng = Number(r.lon);
      if (!isWithinMetro(lat, lng, city, cityGeo)) continue;

      const why =
        r.type === "beach" || extratags.natural === "beach"
          ? beachWhy(name, city)
          : `Nominatim (${r.class}/${r.type}) · ${city}`;
      if (isAdministrativePlace(name, why)) continue;
      if (isFaithTheme(themeId) && !passesFaithHeritageFilter(name, why)) continue;

      const hit = hitFromQuality(
        {
          title: name,
          why,
          lat,
          lng,
          source: "nominatim",
          source_urls: r.osm_id ? [osmUrl(r.osm_type ?? "node", r.osm_id)] : [],
          tags: r.extratags,
          nominatimImportance: r.importance,
        },
        themeId,
        { relaxedGate: options?.relaxedGate }
      );
      if (hit) hits.push(hit);
    }
    return hits;
  } catch {
    return [];
  }
}

function mergeAndRankHits(hits: RawHit[]): RawHit[] {
  const byKey = new Map<string, RawHit>();
  for (const hit of hits) {
    const key = hit.title.toLowerCase().replace(/\s+/g, "");
    const existing = byKey.get(key);
    if (!existing || hit.qualityScore > existing.qualityScore) {
      byKey.set(key, hit);
    }
  }
  return [...byKey.values()].sort((a, b) => b.qualityScore - a.qualityScore);
}

function toPlaceCandidate(city: string, hit: RawHit, angle: string): PlaceCandidate {
  return {
    id: slugifyPlaceId(city, hit.title),
    title: hit.title,
    angle: `${angle} [${hit.source.toUpperCase()} · Q${hit.qualityScore}]`,
    why: buildQualityWhy(hit.why, hit.qualityScore),
    source_urls: hit.source_urls,
    lat: hit.lat,
    lng: hit.lng,
    qualityScore: hit.qualityScore,
  };
}

export async function searchLocalPlaces(params: {
  city: string;
  theme: string;
  cityGeo: GeoResult;
  countryCode?: string;
  voyageExtract?: string;
  uiLocale?: Locale;
}): Promise<{ places: PlaceCandidate[]; sourcesUsed: SearchSource[] }> {
  const { city, theme, cityGeo, countryCode, voyageExtract, uiLocale = "ko" } = params;
  const themeMeta = getEmilyTheme(theme);
  const themeId = themeMeta.id;
  const key = cacheKey(city, themeId, countryCode);
  const cached = readCache(key);
  if (cached?.length) {
    return { places: cached, sourcesUsed: ["wikivoyage", "osm", "nominatim", "photon", "wikidata"] };
  }

  const hits: RawHit[] = [];
  const sourcesUsed = new Set<SearchSource>();

  if (voyageExtract) {
    const venues = parseVenuesForTheme(voyageExtract, themeId, 6);
    for (const v of venues) {
      if (isFaithTheme(themeId) && !passesFaithHeritageFilter(v.name, v.why)) continue;
      if (isGlobalChain(v.name)) continue;
      if (isJunkPlaceTitle(v.name, v.why)) continue;

      const hit = hitFromQuality(
        {
          title: v.name,
          why: `Wikivoyage ${v.section} — ${v.why}`,
          source: "wikivoyage",
          source_urls: [],
          wikivoyageSection: v.section,
        },
        themeId
      );
      if (hit) hits.push(hit);
    }
    if (venues.length) sourcesUsed.add("wikivoyage");
  }

  {
    const bbox = overpassBboxString(city, cityGeo);
    const osmHits = await overpassSearch(bbox, themeId, city, cityGeo, countryCode);
    hits.push(...osmHits);
    if (osmHits.length) sourcesUsed.add("osm");
  }

  const photonHits = await photonSearch(cityGeo, themeId, city);
  hits.push(...photonHits);
  if (photonHits.length) sourcesUsed.add("photon");

  const queries = buildMultilingualQueries(city, themeId, countryCode, uiLocale);
  for (const { lang, query } of queries.slice(0, 6)) {
    const nomHits = await nominatimLocalSearch(query, cityGeo, city, themeId);
    for (const h of nomHits) {
      hits.push({ ...h, why: `${h.why} (${lang.label})` });
    }
    if (nomHits.length) sourcesUsed.add("nominatim");
  }

  const wikidataHits = await fetchWikidataPois(city, themeId, cityGeo);
  for (const p of wikidataHits) {
    if (isFaithTheme(themeId) && !passesFaithHeritageFilter(p.title, p.why)) continue;
    if (isGlobalChain(p.title)) continue;
    if (isGenericPlaceName(p.title)) continue;
    if (isJunkPlaceTitle(p.title, p.why)) continue;
    if (p.lat != null && p.lng != null && !isWithinMetro(p.lat, p.lng, city, cityGeo)) continue;

    const hit = hitFromQuality(
      {
        title: p.title,
        why: p.why ?? `${city} Wikidata`,
        lat: p.lat,
        lng: p.lng,
        source: "wikidata",
        source_urls: p.source_urls ?? [],
      },
      themeId
    );
    if (hit) hits.push(hit);
  }
  if (wikidataHits.length) sourcesUsed.add("wikidata");

  let merged = mergeAndRankHits(hits);

  const skipWikiFallback =
    isFaithTheme(themeId) || themeId === "food_market" || merged.length >= 4;

  if (!skipWikiFallback && merged.length < 2) {
    const { searchWikipediaFallback } = await import("./openSourceLocalSearchWikiFallback");
    const wikiHits = await searchWikipediaFallback(city, themeId, countryCode);
    for (const w of wikiHits) {
      if (isGlobalChain(w.title)) continue;
      if (isJunkPlaceTitle(w.title, w.why)) continue;
      if (w.lat != null && w.lng != null && !isWithinMetro(w.lat, w.lng, city, cityGeo)) continue;
      if (
        !isPhysicalPlace(w.title, w.why, {
          lat: w.lat,
          lng: w.lng,
          source: "wikipedia",
        })
      ) {
        continue;
      }
      const hit = hitFromQuality(
        {
          title: w.title,
          why: w.why,
          lat: w.lat,
          lng: w.lng,
          source: "wikipedia",
          source_urls: w.source_urls,
        },
        themeId
      );
      if (hit) merged.push(hit);
    }
    if (wikiHits.length) sourcesUsed.add("wikipedia");
    merged = mergeAndRankHits(merged);
  }

  let places = merged.slice(0, 18).map((h) => toPlaceCandidate(city, h, themeMeta.shortLabel));
  places = filterPlacesForTheme(places, themeId);
  places = filterPlacesInMetro(places, city, cityGeo);
  writeCache(key, places);

  return { places, sourcesUsed: [...sourcesUsed] };
}

/** 테마 밖 도시 대표 명소 — 유연 테마의 긴 일정 보충용 */
export async function searchSupplementaryPlaces(params: {
  city: string;
  cityGeo: GeoResult;
  countryCode?: string;
  voyageExtract?: string;
  themeId: string;
  locale?: Locale;
}): Promise<PlaceCandidate[]> {
  const { city, cityGeo, countryCode, voyageExtract, themeId, locale = "ko" } = params;
  const themeMeta = getEmilyTheme(themeId);
  if (isStrictTheme(themeMeta.id)) return [];

  const hits: RawHit[] = [];
  const bbox = overpassBboxString(city, cityGeo);
  const cityLabel = locale === "en" ? "City highlight" : "도시 명소";

  hits.push(
    ...(await overpassSearch(bbox, themeId, city, cityGeo, countryCode, {
      filters: GENERAL_CITY_OSM,
      relaxedGate: true,
    }))
  );

  hits.push(
    ...(await photonSearch(cityGeo, themeId, city, {
      tags: GENERAL_PHOTON_TAGS,
      relaxedGate: true,
    }))
  );

  if (voyageExtract) {
    for (const v of parseVenuesFromWikivoyage(voyageExtract, 5)) {
      if (isGlobalChain(v.name)) continue;
      if (isJunkPlaceTitle(v.name, v.why)) continue;
      const hit = hitFromQuality(
        {
          title: v.name,
          why: `Wikivoyage ${v.section} — ${v.why}`,
          source: "wikivoyage",
          source_urls: [],
          wikivoyageSection: v.section,
        },
        themeId,
        { relaxedGate: true }
      );
      if (hit) hits.push(hit);
    }
  }

  const attractionQuery = locale === "en" ? `${city} tourist attraction` : `${city} 관광 명소`;
  const nomHits = await nominatimLocalSearch(attractionQuery, cityGeo, city, themeId, {
    relaxedGate: true,
  });
  hits.push(...nomHits);

  const merged = mergeAndRankHits(hits);
  const places = merged
    .slice(0, 22)
    .map((h) => toPlaceCandidate(city, h, cityLabel))
    .filter((p) => !isJunkPlaceTitle(p.title, p.why));

  return filterPlacesInMetro(places, city, cityGeo);
}

export function formatSourcesLabel(sources: SearchSource[], locale: Locale = "ko") {
  const labels: Record<SearchSource, { ko: string; en: string }> = {
    osm: { ko: "OpenStreetMap", en: "OpenStreetMap" },
    nominatim: { ko: "Nominatim", en: "Nominatim" },
    photon: { ko: "Photon", en: "Photon" },
    wikivoyage: { ko: "Wikivoyage", en: "Wikivoyage" },
    wikidata: { ko: "Wikidata", en: "Wikidata" },
    wikipedia: { ko: "Wikipedia (폴백)", en: "Wikipedia (fallback)" },
  };
  return sources.map((s) => labels[s][locale]).join(" · ");
}
