/**
 * Emily Open Source Local Search (EOSLS)
 */
import type { GeoResult } from "./geoTypes";
import { getEmilyTheme } from "./themes";
import {
  THEME_OSM,
  THEME_PHOTON_TAGS,
  filterPlacesForTheme,
  passesFaithHeritageFilter,
} from "./themeFilters";
import { fetchWikidataPois } from "./wikidata";
import { parseVenuesFromWikivoyage } from "./wikivoyageParser";
import { buildMultilingualQueries } from "./multilingualSearch";
import type { PlaceCandidate } from "./tripTypes";
import { slugifyPlaceId } from "./travelData";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "EmilyTravelEditor/1.0 EOSLS (github.com/Benjamin5607/traveleditor)";

export type SearchSource = "wikivoyage" | "osm" | "nominatim" | "photon" | "wikidata" | "wikipedia";

type RawHit = {
  title: string;
  localName?: string;
  why: string;
  lat?: number;
  lng?: number;
  source: SearchSource;
  source_urls: string[];
  confidence: number;
};

const LANG_BY_COUNTRY: Record<string, string[]> = {
  kr: ["ko", "en"],
  jp: ["ja", "en", "ko"],
  th: ["th", "en"],
  vn: ["vi", "en"],
  cn: ["zh", "en"],
  tw: ["zh", "en"],
  fr: ["fr", "en"],
  de: ["de", "en"],
  es: ["es", "en"],
  it: ["it", "en"],
};

function cacheKey(city: string, theme: string, cc?: string) {
  return `emily-eosls:${city}:${theme}:${cc ?? "xx"}`.toLowerCase();
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

function pickOsmName(tags: Record<string, string>, countryCode?: string): string | null {
  const langs = countryCode ? LANG_BY_COUNTRY[countryCode.toLowerCase()] ?? [] : [];
  for (const lang of langs) {
    const v = tags[`name:${lang}`];
    if (v?.trim()) return v.trim();
  }
  return tags.name?.trim() || tags.official_name?.trim() || tags["name:en"]?.trim() || null;
}

function osmWhy(tags: Record<string, string>, label: string, city: string) {
  const parts = [`${city} 로컬 OSM 데이터`, label];
  if (tags.heritage) parts.push(`문화유산: ${tags.heritage}`);
  if (tags.historic) parts.push(`역사: ${tags.historic}`);
  if (tags.cuisine) parts.push(`요리: ${tags.cuisine}`);
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

async function overpassSearch(
  bbox: string,
  themeId: string,
  city: string,
  countryCode?: string
): Promise<RawHit[]> {
  const filters = THEME_OSM[themeId as keyof typeof THEME_OSM] ?? [
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

  const query = `[out:json][timeout:25];(${parts});out center 20;`;
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
      const name = pickOsmName(tags, countryCode);
      if (!name || seen.has(name.toLowerCase())) continue;

      const why = osmWhy(tags, tags.historic || tags.amenity || tags.tourism || "POI", city);

      if (isFaithTheme(themeId)) {
        const hasHeritage =
          Boolean(tags.historic) || Boolean(tags.heritage) || Boolean(tags.start_date);
        if (!hasHeritage && !passesFaithHeritageFilter(name, why)) continue;
      }

      seen.add(name.toLowerCase());
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      hits.push({
        title: name,
        localName: tags.name !== name ? tags.name : undefined,
        why,
        lat: typeof lat === "number" ? lat : undefined,
        lng: typeof lon === "number" ? lon : undefined,
        source: "osm",
        source_urls: [osmUrl(el.type, el.id)],
        confidence: tags.heritage || tags.historic ? 92 : tags.website ? 88 : 82,
      });
    }
  } catch {
    /* skip */
  }
  return hits;
}

async function photonSearch(cityGeo: GeoResult, themeId: string, city: string): Promise<RawHit[]> {
  const tags = THEME_PHOTON_TAGS[themeId as keyof typeof THEME_PHOTON_TAGS] ?? ["tourism:attraction"];
  const hits: RawHit[] = [];
  const seen = new Set<string>();

  for (const osmTag of tags.slice(0, 3)) {
    try {
      const params = new URLSearchParams({
        q: city,
        lat: String(cityGeo.lat),
        lon: String(cityGeo.lng),
        limit: "8",
        osm_tag: osmTag,
      });
      const response = await fetch(`${PHOTON}?${params}`);
      if (!response.ok) continue;
      const data = await response.json();
      for (const feature of data.features ?? []) {
        const props = feature.properties ?? {};
        const name =
          props["name:ko"] ||
          props["name:ja"] ||
          props["name:th"] ||
          props["name:vi"] ||
          props.name;
        if (!name || seen.has(String(name).toLowerCase())) continue;
        const why = `${city} Photon/OSM (${osmTag})`;
        if (isFaithTheme(themeId) && !passesFaithHeritageFilter(String(name), why)) continue;
        seen.add(String(name).toLowerCase());
        const [lng, lat] = feature.geometry?.coordinates ?? [];
        hits.push({
          title: String(name),
          why,
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lng === "number" ? lng : undefined,
          source: "photon",
          source_urls: props.osm_id ? [osmUrl(props.osm_type ?? "node", props.osm_id)] : [],
          confidence: 78,
        });
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
  city: string
): Promise<RawHit[]> {
  const bb = cityGeo.boundingBox;
  const params: Record<string, string> = {
    q: query,
    format: "json",
    limit: "6",
    addressdetails: "1",
    extratags: "1",
  };
  if (bb) {
    params.viewbox = `${bb[2]},${bb[1]},${bb[3]},${bb[0]}`;
    params.bounded = "1";
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
      osm_type?: string;
      osm_id?: number;
    }>;

    return rows
      .filter((r) => /tourism|amenity|shop|leisure|historic/.test(`${r.class}/${r.type}`))
      .map((r) => {
        const name = r.display_name.split(",")[0]?.trim() || r.display_name;
        return {
          title: name,
          why: `Nominatim (${r.class}/${r.type}) · ${city}`,
          lat: Number(r.lat),
          lng: Number(r.lon),
          source: "nominatim" as const,
          source_urls: r.osm_id ? [osmUrl(r.osm_type ?? "node", r.osm_id)] : [],
          confidence: 80,
        };
      });
  } catch {
    return [];
  }
}

function mergeHits(hits: RawHit[]): RawHit[] {
  const byKey = new Map<string, RawHit>();
  for (const hit of hits.sort((a, b) => b.confidence - a.confidence)) {
    const key = hit.title.toLowerCase().replace(/\s+/g, "");
    const existing = byKey.get(key);
    if (!existing || hit.confidence > existing.confidence) {
      byKey.set(key, hit);
    }
  }
  return [...byKey.values()].sort((a, b) => b.confidence - a.confidence);
}

function toPlaceCandidate(city: string, hit: RawHit, angle: string): PlaceCandidate {
  return {
    id: slugifyPlaceId(city, hit.title),
    title: hit.title,
    angle: `${angle} [${hit.source.toUpperCase()}]`,
    why: hit.why,
    source_urls: hit.source_urls,
    lat: hit.lat,
    lng: hit.lng,
  };
}

export async function searchLocalPlaces(params: {
  city: string;
  theme: string;
  cityGeo: GeoResult;
  countryCode?: string;
  voyageExtract?: string;
}): Promise<{ places: PlaceCandidate[]; sourcesUsed: SearchSource[] }> {
  const { city, theme, cityGeo, countryCode, voyageExtract } = params;
  const themeMeta = getEmilyTheme(theme);
  const themeId = themeMeta.id;
  const key = cacheKey(city, themeId, countryCode);
  const cached = readCache(key);
  if (cached?.length) {
    return { places: cached, sourcesUsed: ["osm", "nominatim", "photon", "wikivoyage", "wikidata"] };
  }

  const hits: RawHit[] = [];
  const sourcesUsed = new Set<SearchSource>();

  if (voyageExtract) {
    const venues = parseVenuesFromWikivoyage(voyageExtract);
    for (const v of venues) {
      if (isFaithTheme(themeId) && !passesFaithHeritageFilter(v.name, v.why)) continue;
      hits.push({
        title: v.name,
        why: `Wikivoyage ${v.section} — ${v.why}`,
        source: "wikivoyage",
        source_urls: [],
        confidence: 92,
      });
    }
    if (venues.length) sourcesUsed.add("wikivoyage");
  }

  const bb = cityGeo.boundingBox;
  if (bb) {
    const bbox = `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`;
    const osmHits = await overpassSearch(bbox, themeId, city, countryCode);
    hits.push(...osmHits);
    if (osmHits.length) sourcesUsed.add("osm");
  }

  const photonHits = await photonSearch(cityGeo, themeId, city);
  hits.push(...photonHits);
  if (photonHits.length) sourcesUsed.add("photon");

  const queries = buildMultilingualQueries(city, themeId, countryCode);
  for (const { lang, query } of queries.slice(0, 6)) {
    const nomHits = await nominatimLocalSearch(query, cityGeo, city);
    for (const h of nomHits) {
      if (isFaithTheme(themeId) && !passesFaithHeritageFilter(h.title, h.why)) continue;
      hits.push({ ...h, why: `${h.why} (${lang.label})` });
    }
    if (nomHits.length) sourcesUsed.add("nominatim");
  }

  const wikidataHits = await fetchWikidataPois(city, themeId, cityGeo);
  for (const p of wikidataHits) {
    if (isFaithTheme(themeId) && !passesFaithHeritageFilter(p.title, p.why)) continue;
    hits.push({
      title: p.title,
      why: p.why ?? `${city} Wikidata`,
      lat: p.lat,
      lng: p.lng,
      source: "wikidata",
      source_urls: p.source_urls ?? [],
      confidence: 72,
    });
  }
  if (wikidataHits.length) sourcesUsed.add("wikidata");

  let merged = mergeHits(hits);

  if (merged.length < 4 && !isFaithTheme(themeId)) {
    const { searchWikipediaFallback } = await import("./openSourceLocalSearchWikiFallback");
    const wikiHits = await searchWikipediaFallback(city, themeId, countryCode);
    merged = mergeHits([...merged, ...wikiHits]);
    if (wikiHits.length) sourcesUsed.add("wikipedia");
  }

  let places = merged.slice(0, 14).map((h) => toPlaceCandidate(city, h, themeMeta.shortLabel));
  places = filterPlacesForTheme(places, themeId);
  writeCache(key, places);

  return { places, sourcesUsed: [...sourcesUsed] };
}

export function formatSourcesLabel(sources: SearchSource[]) {
  const labels: Record<SearchSource, string> = {
    osm: "OpenStreetMap",
    nominatim: "Nominatim",
    photon: "Photon",
    wikivoyage: "Wikivoyage",
    wikidata: "Wikidata",
    wikipedia: "Wikipedia (폴백)",
  };
  return sources.map((s) => labels[s]).join(" · ");
}
