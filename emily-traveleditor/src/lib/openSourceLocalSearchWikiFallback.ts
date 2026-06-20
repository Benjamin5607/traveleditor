/** Wikipedia는 EOSLS 최후 폴백 — OSM 등으로 부족할 때만 */
import { isGenericPlaceName } from "./placeNaming";
import { fetchWikiSummaryLang, searchWikipediaLang } from "./multilingualSearch";
import { buildMultilingualQueries } from "./multilingualSearch";
import type { SearchSource } from "./openSourceLocalSearch";

type RawHit = {
  title: string;
  why: string;
  lat?: number;
  lng?: number;
  source: SearchSource;
  source_urls: string[];
  confidence: number;
};

export async function searchWikipediaFallback(
  city: string,
  theme: string,
  countryCode: string | undefined
): Promise<RawHit[]> {
  const hits: RawHit[] = [];
  const seen = new Set<string>();
  const queries = buildMultilingualQueries(city, theme, countryCode);

  for (const { lang, query } of queries.slice(0, 4)) {
    const results = await searchWikipediaLang(lang.wikiApi, query, 2);
    for (const result of results) {
      if (seen.has(result.title.toLowerCase())) continue;
      const summary = await fetchWikiSummaryLang(result.lang, result.title);
      if (!summary) continue;
      if (isGenericPlaceName(summary.title)) continue;
      seen.add(summary.title.toLowerCase());
      hits.push({
        title: summary.title,
        why: `[폴백] ${lang.label} Wikipedia — 로컬 OSM 결과 부족 시 보조`,
        lat: summary.lat,
        lng: summary.lng,
        source: "wikipedia",
        source_urls: summary.url ? [summary.url] : [],
        confidence: 35,
      });
    }
  }
  return hits;
}
