import type { PlaceCandidate } from "./tripTypes";
import { slugifyPlaceId } from "./travelData";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

/** 테마별 Wikidata 엔티티 타입 */
const THEME_TYPES: Record<string, string[]> = {
  "마음의 평화": ["wd:Q30022", "wd:Q136222", "wd:Q167346"],
  "인생이 무료": ["wd:Q156362", "wd:Q131734", "wd:Q185583"],
  "오늘은 욜로": ["wd:Q622425", "wd:Q187456"],
  "신앙": ["wd:Q2977", "wd:Q32815", "wd:Q8441", "wd:Q44613"],
};

type SparqlRow = {
  item?: { value: string };
  itemLabel?: { value: string };
  lat?: { value: string };
  lon?: { value: string };
};

async function runSparql(query: string) {
  const response = await fetch(WIKIDATA_SPARQL, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `query=${encodeURIComponent(query)}`,
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.results?.bindings ?? []) as SparqlRow[];
}

/** 도시 중심 반경(km) 내 테마 POI — Overpass보다 1회 쿼리로 빠름 */
export async function fetchWikidataPois(
  city: string,
  theme: string,
  center: { lat: number; lng: number },
  radiusKm = 18
): Promise<PlaceCandidate[]> {
  const types = THEME_TYPES[theme];
  if (!types?.length) return [];

  const values = types.join(" ");
  const query = `
SELECT ?item ?itemLabel ?lat ?lon WHERE {
  VALUES ?type { ${values} }
  ?item wdt:P31/wdt:P279* ?type .
  ?item wdt:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  FILTER(geof:distance("Point(${center.lng} ${center.lat})"^^geo:wktLiteral, ?coord, unit:Kilometer) < ${radiusKm})
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ko". }
}
LIMIT 8`;

  try {
    const rows = await runSparql(query);
    const seen = new Set<string>();
    const places: PlaceCandidate[] = [];

    for (const row of rows) {
      const title = row.itemLabel?.value;
      const lat = Number(row.lat?.value);
      const lon = Number(row.lon?.value);
      const itemUrl = row.item?.value;
      if (!title || title.startsWith("Q") || seen.has(title.toLowerCase())) continue;
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      seen.add(title.toLowerCase());
      places.push({
        id: slugifyPlaceId(city, title),
        title,
        angle: theme,
        why: `${city} 인근 Wikidata 공개 데이터 (${radiusKm}km 반경)`,
        source_urls: itemUrl ? [itemUrl] : [],
        lat,
        lng: lon,
      });
    }
    return places;
  } catch {
    return [];
  }
}
