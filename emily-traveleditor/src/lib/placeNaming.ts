/** OSM·Nominatim 등에서 온 장소명 정제 — 'Public Beach' 같은 타입 라벨 제외 */

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

const GENERIC_NAME_PATTERNS = [
  /^public\s+beach$/i,
  /^private\s+beach$/i,
  /^beach$/i,
  /^해변$/,
  /^해변가$/,
  /^공공\s*해변$/,
  /^공용\s*해변$/,
  /^sand(?:y)?\s+beach$/i,
  /^rocky\s+beach$/i,
  /^small\s+beach$/i,
  /^local\s+beach$/i,
  /^city\s+beach$/i,
  /^municipal\s+beach$/i,
  /^natural\s+beach$/i,
  /^unnamed\s+beach$/i,
  /^ชายหาด$/,
  /^海滩$/,
  /^ビーチ$/,
  /^strand$/i,
  /^plage$/i,
  /^playa$/i,
  // 식당·카페 등 타입 라벨만 있는 이름
  /^restaurant$/i,
  /^cafe$/i,
  /^coffee\s*shop$/i,
  /^coffee$/i,
  /^bar$/i,
  /^pub$/i,
  /^bistro$/i,
  /^diner$/i,
  /^eatery$/i,
  /^food\s*court$/i,
  /^fast\s*food$/i,
  /^bakery$/i,
  /^식당$/,
  /^음식점$/,
  /^레스토랑$/,
  /^카페$/,
  /^커피숍$/,
  /^커피\s*숍$/,
  /^커피$/,
  /^분식점$/,
  /^술집$/,
  /^주점$/,
  /^아침\s*식사$/,
  /^점심\s*식사$/,
  /^저녁\s*식사$/,
  /^breakfast$/i,
  /^lunch$/i,
  /^dinner$/i,
  /^coffee\s*break$/i,
  /^커피[·・]?\s*디저트\s*휴식$/,
  /^meal$/i,
  /^snack\s*bar$/i,
  /^공중\s*화장실$/,
  /^public\s*(?:toilet|restroom|wc)$/i,
  /^restroom$/i,
  /^toilet$/i,
  /^wc$/i,
  /^화장실$/,
];

const wikidataLabelCache = new Map<string, string>();

/** 타입명·무의미 라벨만 있는 '가짜 이름' */
export function isGenericPlaceName(name: string, tags?: Record<string, string>): boolean {
  const t = name.trim();
  if (!t || t.length < 2) return true;
  if (GENERIC_NAME_PATTERNS.some((re) => re.test(t))) return true;

  const typeWord =
    tags?.natural || tags?.tourism || tags?.leisure || tags?.amenity || tags?.historic || tags?.shop;
  if (typeWord) {
    const normalized = t.toLowerCase().replace(/[\s_-]+/g, "");
    const typeNorm = typeWord.toLowerCase().replace(/[\s_-]+/g, "");
    if (normalized === typeNorm) return true;
    if (normalized === `public${typeNorm}`) return true;
  }

  if (tags?.amenity === "restaurant" && /^(restaurant|식당|음식점|레스토랑)$/i.test(t)) return true;
  if (tags?.amenity === "cafe" && /^(cafe|카페|coffee\s*shop|커피숍)$/i.test(t)) return true;
  if (tags?.amenity === "toilets" && /^(toilet|restroom|wc|화장실|공중\s*화장실)$/i.test(t)) return true;

  if (tags?.natural === "beach" && /^[\w\s]{0,12}beach$/i.test(t) && !/[A-Z가-힣]{2,}/.test(t.replace(/beach/gi, ""))) {
    return true;
  }

  return false;
}

function wikipediaTagToTitle(wikipedia: string): string | null {
  const article = wikipedia.split(":").pop()?.replace(/_/g, " ").trim();
  if (!article || article.length < 2) return null;
  return article;
}

function collectOsmNameCandidates(tags: Record<string, string>, countryCode?: string): string[] {
  const out: string[] = [];
  const langs = countryCode ? LANG_BY_COUNTRY[countryCode.toLowerCase()] ?? [] : [];

  for (const lang of langs) {
    const v = tags[`name:${lang}`]?.trim();
    if (v) out.push(v);
  }

  for (const key of [
    "name",
    "official_name",
    "alt_name",
    "loc_name",
    "short_name",
    "name:en",
    "name:ko",
    "name:ja",
    "name:th",
    "name:vi",
    "name:zh",
  ]) {
    const v = tags[key]?.trim();
    if (v) out.push(v);
  }

  if (tags.wikipedia) {
    const fromWiki = wikipediaTagToTitle(tags.wikipedia);
    if (fromWiki) out.push(fromWiki);
  }

  return out;
}

/** OSM tags에서 실제 고유명사만 추출 */
export function pickBestOsmName(tags: Record<string, string>, countryCode?: string): string | null {
  for (const candidate of collectOsmNameCandidates(tags, countryCode)) {
    if (!isGenericPlaceName(candidate, tags)) return candidate;
  }
  return null;
}

export async function fetchWikidataLabel(
  wikidataRef: string,
  langs: string[] = ["ko", "en", "ja", "th"]
): Promise<string | null> {
  const entityId = wikidataRef.replace(/^.*(Q\d+)$/i, "$1");
  if (!entityId.startsWith("Q")) return null;

  const cacheKey = `${entityId}:${langs.join(",")}`;
  if (wikidataLabelCache.has(cacheKey)) {
    return wikidataLabelCache.get(cacheKey) ?? null;
  }

  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`);
    if (!response.ok) return null;
    const data = await response.json();
    const entity = data.entities?.[entityId];
    const labels = entity?.labels ?? {};

    for (const lang of langs) {
      const label = labels[lang]?.value?.trim();
      if (label && !isGenericPlaceName(label)) {
        wikidataLabelCache.set(cacheKey, label);
        return label;
      }
    }

    const fallback = labels.en?.value?.trim();
    if (fallback && !isGenericPlaceName(fallback)) {
      wikidataLabelCache.set(cacheKey, fallback);
      return fallback;
    }
  } catch {
    /* ignore */
  }

  wikidataLabelCache.set(cacheKey, "");
  return null;
}

/** OSM 이름 + Wikidata 폴백 */
export async function resolveOsmPlaceName(
  tags: Record<string, string>,
  countryCode?: string
): Promise<string | null> {
  const direct = pickBestOsmName(tags, countryCode);
  if (direct) return direct;

  if (tags.wikidata) {
    const fromWd = await fetchWikidataLabel(tags.wikidata);
    if (fromWd && !isGenericPlaceName(fromWd, tags)) return fromWd;
  }

  return null;
}

export function beachWhy(name: string, city: string, locale: "ko" | "en" = "ko") {
  return locale === "en"
    ? `${name} — named beach in ${city} (OSM/Wikidata)`
    : `${city} ${name} — 실제 이름이 있는 해변`;
}
