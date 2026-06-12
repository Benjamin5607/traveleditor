/** 도시 국가코드 → 로컬 Wikipedia 언어 + 다국어 검색 쿼리 생성 */

export type SearchLang = { code: string; label: string; wikiApi: string };

const WIKI_API = (lang: string) => `https://${lang}.wikipedia.org/w/api.php`;

export const SEARCH_LANGUAGES: Record<string, SearchLang> = {
  ko: { code: "ko", label: "한국어", wikiApi: WIKI_API("ko") },
  en: { code: "en", label: "English", wikiApi: WIKI_API("en") },
  ja: { code: "ja", label: "日本語", wikiApi: WIKI_API("ja") },
  th: { code: "th", label: "ไทย", wikiApi: WIKI_API("th") },
  vi: { code: "vi", label: "Tiếng Việt", wikiApi: WIKI_API("vi") },
  zh: { code: "zh", label: "中文", wikiApi: WIKI_API("zh") },
  fr: { code: "fr", label: "Français", wikiApi: WIKI_API("fr") },
  de: { code: "de", label: "Deutsch", wikiApi: WIKI_API("de") },
  es: { code: "es", label: "Español", wikiApi: WIKI_API("es") },
  it: { code: "it", label: "Italiano", wikiApi: WIKI_API("it") },
};

const COUNTRY_TO_LANG: Record<string, string> = {
  kr: "ko",
  jp: "ja",
  th: "th",
  vn: "vi",
  cn: "zh",
  tw: "zh",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
  gb: "en",
  us: "en",
  sg: "en",
};

const THEME_KEYWORDS_I18N: Record<string, Record<string, string[]>> = {
  "마음의 평화": {
    ko: ["차집", "카페", "산책"],
    en: ["tea house", "coffee", "garden"],
    ja: ["茶屋", "カフェ", "庭園"],
    th: ["ร้านชา", "คาเฟ่"],
    vi: ["trà", "cà phê"],
    fr: ["salon de thé", "café"],
  },
  "인생이 무료": {
    ko: ["와이너리", "양조장", "증류소"],
    en: ["winery", "brewery", "distillery"],
    ja: ["ワイナリー", "醸造所"],
    th: ["โรงเบียร์", "ไวน์"],
  },
  "오늘은 욜로": {
    ko: ["클럽", "바", "나이트라이프"],
    en: ["nightclub", "speakeasy", "bar"],
    ja: ["クラブ", "バー"],
    th: ["ผับ", "คลับ"],
  },
  "신앙": {
    ko: ["사원", "성당", "모스크", "사찰"],
    en: ["temple", "cathedral", "mosque"],
    ja: ["寺", "神社", "モスク"],
    th: ["วัด", "มัสยิด"],
  },
};

export function resolveSearchLanguages(countryCode?: string): SearchLang[] {
  const localCode = countryCode ? COUNTRY_TO_LANG[countryCode.toLowerCase()] : undefined;
  const langs: SearchLang[] = [SEARCH_LANGUAGES.ko, SEARCH_LANGUAGES.en];
  if (localCode && SEARCH_LANGUAGES[localCode] && !langs.some((l) => l.code === localCode)) {
    langs.push(SEARCH_LANGUAGES[localCode]);
  }
  return langs;
}

export function buildMultilingualQueries(city: string, theme: string, countryCode?: string): Array<{ lang: SearchLang; query: string }> {
  const langs = resolveSearchLanguages(countryCode);
  const queries: Array<{ lang: SearchLang; query: string }> = [];

  for (const lang of langs) {
    const keywords = THEME_KEYWORDS_I18N[theme]?.[lang.code] ?? THEME_KEYWORDS_I18N[theme]?.en ?? ["travel"];
    for (const keyword of keywords.slice(0, 2)) {
      queries.push({
        lang,
        query: lang.code === "ko" ? `${city} ${keyword}` : `"${city}" ${keyword}`,
      });
    }
  }
  return queries;
}

export async function searchWikipediaLang(
  wikiApi: string,
  query: string,
  limit = 2
): Promise<Array<{ title: string; lang: string }>> {
  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      list: "search",
      srsearch: query,
      srlimit: String(limit),
    });
    const response = await fetch(`${wikiApi}?${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    const lang = new URL(wikiApi).hostname.split(".")[0];
    return (data.query?.search ?? []).map((r: { title: string }) => ({ title: r.title, lang }));
  } catch {
    return [];
  }
}

export async function fetchWikiSummaryLang(lang: string, title: string) {
  const base = `https://${lang}.wikipedia.org/api/rest_v1/page/summary`;
  try {
    const response = await fetch(`${base}/${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.extract) return null;
    return {
      title: data.title as string,
      extract: String(data.extract).slice(0, 280),
      url: data.content_urls?.desktop?.page as string | undefined,
      lat: data.coordinates?.lat as number | undefined,
      lng: data.coordinates?.lon as number | undefined,
      lang,
    };
  } catch {
    return null;
  }
}
