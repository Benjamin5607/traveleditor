/** 도시명 입력 스크립트·국가코드 기반 다국어 지오코딩 헬퍼 */

export type CityHint = {
  canonical: string;
  countryCode: string;
  queries: string[];
};

function normCityKey(s: string) {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * 동명이인·짧은 영문 도시명 — 국가 힌트와 검색 변형.
 * Astana만 치면 말레이시아·인도네시아가 먼저 나오는 문제 방지.
 */
export const CITY_HINTS: Record<string, CityHint> = {
  astana: {
    canonical: "Astana",
    countryCode: "kz",
    queries: ["Astana, Kazakhstan", "Nur-Sultan, Kazakhstan", "Nur-Sultan"],
  },
  nursultan: {
    canonical: "Astana",
    countryCode: "kz",
    queries: ["Astana, Kazakhstan", "Nur-Sultan, Kazakhstan"],
  },
  almaty: {
    canonical: "Almaty",
    countryCode: "kz",
    queries: ["Almaty, Kazakhstan", "Алматы"],
  },
  tbilisi: {
    canonical: "Tbilisi",
    countryCode: "ge",
    queries: ["Tbilisi, Georgia"],
  },
  yerevan: {
    canonical: "Yerevan",
    countryCode: "am",
    queries: ["Yerevan, Armenia"],
  },
  baku: {
    canonical: "Baku",
    countryCode: "az",
    queries: ["Baku, Azerbaijan"],
  },
  tashkent: {
    canonical: "Tashkent",
    countryCode: "uz",
    queries: ["Tashkent, Uzbekistan"],
  },
  bishkek: {
    canonical: "Bishkek",
    countryCode: "kg",
    queries: ["Bishkek, Kyrgyzstan"],
  },
  dushanbe: {
    canonical: "Dushanbe",
    countryCode: "tj",
    queries: ["Dushanbe, Tajikistan"],
  },
  ashgabat: {
    canonical: "Ashgabat",
    countryCode: "tm",
    queries: ["Ashgabat, Turkmenistan"],
  },
  ulaanbaatar: {
    canonical: "Ulaanbaatar",
    countryCode: "mn",
    queries: ["Ulaanbaatar, Mongolia"],
  },
  kathmandu: {
    canonical: "Kathmandu",
    countryCode: "np",
    queries: ["Kathmandu, Nepal"],
  },
  colombo: {
    canonical: "Colombo",
    countryCode: "lk",
    queries: ["Colombo, Sri Lanka"],
  },
  portland: {
    canonical: "Portland",
    countryCode: "us",
    queries: ["Portland, Oregon", "Portland, USA"],
  },
  alexandria: {
    canonical: "Alexandria",
    countryCode: "eg",
    queries: ["Alexandria, Egypt"],
  },
  아스타나: {
    canonical: "Astana",
    countryCode: "kz",
    queries: ["Astana, Kazakhstan", "Nur-Sultan"],
  },
  알마티: {
    canonical: "Almaty",
    countryCode: "kz",
    queries: ["Almaty, Kazakhstan"],
  },
  누르술탄: {
    canonical: "Astana",
    countryCode: "kz",
    queries: ["Astana, Kazakhstan", "Nur-Sultan"],
  },
};

export function lookupCityHint(city: string): CityHint | null {
  const key = normCityKey(city);
  return CITY_HINTS[key] ?? CITY_HINTS[city.trim().toLowerCase()] ?? null;
}

export function resolveCanonicalCity(city: string, englishAlias?: string): string {
  return lookupCityHint(city)?.canonical ?? englishAlias ?? city.trim();
}

export function getCityCountryHint(city: string): string | undefined {
  return lookupCityHint(city)?.countryCode;
}

export function detectInputLanguages(text: string): string[] {
  const langs: string[] = [];
  const t = text.trim();
  if (!t) return ["en"];

  if (/[\uac00-\ud7af]/.test(t)) langs.push("ko");
  if (/[\u3040-\u30ff]/.test(t)) langs.push("ja");
  if (/[\u4e00-\u9fff]/.test(t) && !/[\u3040-\u30ff]/.test(t)) langs.push("zh");
  if (/[\u0e00-\u0e7f]/.test(t)) langs.push("th");
  if (/[àáâãäåæçèéêëìíîïñòóôõöùúûüý]/i.test(t)) langs.push("fr", "es", "it", "pt", "de");
  if (/[а-яё]/i.test(t)) langs.push("ru");

  if (!langs.includes("en")) langs.push("en");
  return langs;
}

/** Wikivoyage / Wikipedia API 언어 코드 */
export const COUNTRY_WIKI_LANG: Record<string, string> = {
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
  kz: "ru",
  uz: "ru",
  kg: "ru",
  tj: "ru",
  tm: "ru",
  ge: "ru",
  am: "ru",
  az: "ru",
  mn: "ru",
  id: "id",
  my: "ms",
  ph: "en",
  in: "en",
  gb: "en",
  us: "en",
  au: "en",
  sg: "en",
  nl: "nl",
  pl: "pl",
  tr: "tr",
  ae: "ar",
  sa: "ar",
  eg: "ar",
  mx: "es",
  ar: "es",
  cl: "es",
  co: "es",
  pe: "es",
};

export const WIKIVOYAGE_LANGS = ["en", "de", "es", "fr", "it", "ja", "nl", "pl", "pt", "ru", "sv", "zh", "vi", "ko"] as const;

export function wikivoyageLangsForCity(city: string, countryCode?: string): string[] {
  const out: string[] = [];
  for (const lang of detectInputLanguages(city)) {
    if (WIKIVOYAGE_LANGS.includes(lang as (typeof WIKIVOYAGE_LANGS)[number]) && !out.includes(lang)) {
      out.push(lang);
    }
  }
  const local = countryCode ? COUNTRY_WIKI_LANG[countryCode.toLowerCase()] : undefined;
  if (local && WIKIVOYAGE_LANGS.includes(local as (typeof WIKIVOYAGE_LANGS)[number]) && !out.includes(local)) {
    out.push(local);
  }
  if (!out.includes("en")) out.push("en");
  return out;
}

export function geocodeQueryVariants(city: string, englishAlias?: string): string[] {
  const raw = city.trim();
  const hint = lookupCityHint(raw);
  const canonical = hint?.canonical ?? englishAlias;
  const variants: string[] = [];

  // 동명이인 도시 — 국가 포함 쿼리를 먼저 (Astana → 말레이시아 오인 방지)
  if (hint) {
    variants.push(...hint.queries, hint.canonical);
  }
  variants.push(raw);
  if (canonical && canonical !== raw && !variants.includes(canonical)) {
    variants.push(canonical);
  }
  if (englishAlias && englishAlias !== raw && !variants.includes(englishAlias)) {
    variants.push(englishAlias);
  }

  return [...new Set(variants.filter(Boolean))];
}

/** Photon/Nominatim 결과 — 도시·수도 우선 점수 */
const PLACE_TYPE_SCORE: Record<string, number> = {
  city: 100,
  town: 85,
  municipality: 80,
  administrative: 55,
  state: 50,
  village: 20,
  hamlet: 15,
  house: 1,
  yes: 0,
  castle: 5,
};

export function scoreGeocodeCandidate(
  placeType: string | undefined,
  name: string | undefined,
  query: string,
  countryCode?: string,
  preferCountry?: string,
  importance = 0
): number {
  const typeKey = (placeType ?? "").toLowerCase();
  let score = PLACE_TYPE_SCORE[typeKey] ?? 25;
  const q = query.split(",")[0].trim().toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (n === q) score += 20;
  else if (n.includes(q) || q.includes(n)) score += 8;
  if (preferCountry && countryCode?.toLowerCase() === preferCountry.toLowerCase()) score += 60;
  score += Math.min(15, importance * 20);
  return score;
}
