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
  hk: "zh",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
  pt: "pt",
  br: "pt",
  ru: "ru",
  id: "id",
  nl: "nl",
  pl: "pl",
  tr: "tr",
  mx: "es",
  ar: "es",
  gb: "en",
  us: "en",
  sg: "en",
  au: "en",
  in: "en",
  ph: "en",
};

const THEME_KEYWORDS_I18N: Record<string, Record<string, string[]>> = {
  peace_calm: {
    ko: ["차집", "카페", "정원"],
    en: ["tea house", "coffee", "garden"],
    ja: ["茶屋", "カフェ", "庭園"],
  },
  drink_craft: {
    ko: ["와이너리", "양조장", "증류소"],
    en: ["winery", "brewery", "distillery"],
    ja: ["ワイナリー", "醸造所"],
  },
  yolo_night: {
    ko: ["클럽", "바", "나이트라이프"],
    en: ["nightclub", "speakeasy", "bar"],
    ja: ["クラブ", "バー"],
  },
  faith_heritage: {
    ko: ["문화유산 사찰", "유적 성당", "세계유산 사원"],
    en: ["heritage temple", "historic cathedral", "UNESCO mosque"],
    ja: ["文化財 寺", "歴史 教会"],
    th: ["มรดกโลก วัด", "โบสถ์"],
  },
  nature_trail: {
    ko: ["해변", "국립공원", "트레킹", "전망대"],
    en: ["beach", "national park", "hiking trail", "viewpoint"],
    ja: ["ビーチ", "海岸", "国立公園"],
    th: ["ชายหาด", "อุทยานแห่งชาติ"],
    vi: ["bãi biển", "vườn quốc gia"],
  },
  art_culture: {
    ko: ["미술관", "박물관", "갤러리"],
    en: ["art museum", "gallery", "theater"],
  },
  food_market: {
    ko: ["전통시장", "맛집", "푸드마켓"],
    en: ["food market", "local restaurant", "street food"],
  },
  history_heritage: {
    ko: ["역사 유적", "궁궐", "세계유산"],
    en: ["historic site", "palace", "UNESCO"],
  },
  family_fun: {
    ko: ["동물원", "수족관", "테마파크"],
    en: ["zoo", "aquarium", "theme park"],
  },
  wellness_spa: {
    ko: ["온천", "스파", "사우나"],
    en: ["hot spring", "spa", "wellness"],
  },
  shopping_style: {
    ko: ["쇼핑거리", "빈티지", "로컬 브랜드"],
    en: ["shopping district", "vintage", "boutique"],
  },
  photo_landmark: {
    ko: ["해변", "랜드마크", "전망", "야경"],
    en: ["beach", "landmark", "viewpoint", "iconic"],
    th: ["ชายหาด", "แลนด์มาร์ก"],
  },
};

export function resolveSearchLanguages(countryCode?: string, uiLocale?: "ko" | "en"): SearchLang[] {
  const langs: SearchLang[] = [];
  const seen = new Set<string>();

  const push = (code: string) => {
    if (seen.has(code) || !SEARCH_LANGUAGES[code]) return;
    seen.add(code);
    langs.push(SEARCH_LANGUAGES[code]);
  };

  const localCode = countryCode ? COUNTRY_TO_LANG[countryCode.toLowerCase()] : undefined;
  if (localCode) push(localCode);

  if (uiLocale === "en") {
    push("en");
    push("ko");
  } else {
    push("ko");
    push("en");
  }

  return langs;
}

export function buildMultilingualQueries(
  city: string,
  themeId: string,
  countryCode?: string,
  uiLocale?: "ko" | "en"
): Array<{ lang: SearchLang; query: string }> {
  const langs = resolveSearchLanguages(countryCode, uiLocale);
  const queries: Array<{ lang: SearchLang; query: string }> = [];

  for (const lang of langs) {
    const keywords =
      THEME_KEYWORDS_I18N[themeId]?.[lang.code] ??
      THEME_KEYWORDS_I18N[themeId]?.en ??
      (lang.code === "ko" ? ["관광", "명소"] : ["attraction", "sightseeing"]);
    for (const keyword of keywords.slice(0, 2)) {
      queries.push({
        lang,
        query: lang.code === "en" ? `"${city}" ${keyword}` : `${city} ${keyword}`,
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
      extract: data.extract as string,
      lat: data.coordinates?.lat as number | undefined,
      lng: data.coordinates?.lon as number | undefined,
      url: data.content_urls?.desktop?.page as string | undefined,
    };
  } catch {
    return null;
  }
}
