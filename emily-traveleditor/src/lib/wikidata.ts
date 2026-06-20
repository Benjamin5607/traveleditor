import { THEME_WIKIDATA_TYPES } from "./themeFilters";
import type { PlaceCandidate } from "./tripTypes";
import { slugifyPlaceId } from "./travelData";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

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

export async function fetchWikidataPois(
  city: string,
  themeId: string,
  center: { lat: number; lng: number },
  radiusKm = 18
): Promise<PlaceCandidate[]> {
  const types = THEME_WIKIDATA_TYPES[themeId as keyof typeof THEME_WIKIDATA_TYPES];
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
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q515 }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q486972 }
  FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q15284 }
  FILTER(BOUND(?itemLabel) && STRLEN(?itemLabel) > 2)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ko,ja,th,vi,zh". }
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
        angle: themeId,
        why: `${city} Wikidata (${radiusKm}km)`,
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
