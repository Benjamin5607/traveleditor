/** 도시명 입력 스크립트·국가코드 기반 다국어 지오코딩 헬퍼 */

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
  const variants = [raw];
  if (englishAlias && englishAlias !== raw) variants.push(englishAlias);
  return [...new Set(variants)];
}
