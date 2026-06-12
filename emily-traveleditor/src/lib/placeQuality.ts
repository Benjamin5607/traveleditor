import type { ThemeId } from "./themes";

export type PlaceSource =
  | "wikivoyage"
  | "osm"
  | "nominatim"
  | "photon"
  | "wikidata"
  | "wikipedia";

/** 글로벌 체인·패스트푸드 — 로컬 맛집/테마 추천에서 제외 */
const CHAIN_PATTERNS = [
  /dunkin/i, /starbucks/i, /mcdonald/i, /mcdonald's/i, /kfc/i, /subway/i,
  /burger king/i, /pizza hut/i, /domino'?s/i, /seven\s*eleven/i, /7-?eleven/i,
  /familymart/i, /lawson/i, /ministop/i, /tim hortons/i, /costa coffee/i,
  /pret a manger/i, /taco bell/i, /wendy'?s/i, /chipotle/i, /popeyes/i,
  /dairy queen/i, /baskin/i, /krispy kreme/i, /jollibee/i, /lotteria/i,
  /mos burger/i, /yoshinoya/i, /sukiya/i, /coco ichibanya/i, /saizeriya/i,
  /h&m/i, /uniqlo/i, /zara/i, /ikea food/i, /amazon go/i,
];

const REVIEW_SIGNALS =
  /must[- ]try|popular|famous|recommend|best|award|michelin|bib gourmand|crowd|queue|wait line|local favorite|well[- ]known|renowned|iconic|legendary|highly rated|top rated|critically acclaimed|travelers'? choice/i;

const NEGATIVE_SIGNALS =
  /closed|permanently closed|avoid|tourist trap|overrated|skip|mediocre|boring|nothing special/i;

export type QualityInput = {
  title: string;
  why: string;
  source: PlaceSource;
  themeId: ThemeId;
  tags?: Record<string, string>;
  wikivoyageSection?: string;
  nominatimImportance?: number;
};

export function isGlobalChain(title: string, tags?: Record<string, string>): boolean {
  const brand = `${tags?.brand ?? ""} ${tags?.operator ?? ""} ${tags?.["brand:wikidata"] ?? ""}`;
  const hay = `${title} ${brand}`;
  return CHAIN_PATTERNS.some((p) => p.test(hay));
}

export function isFastFood(tags?: Record<string, string>): boolean {
  const amenity = tags?.amenity ?? "";
  return amenity === "fast_food" || tags?.fast_food === "yes";
}

/** 테마별 최소 품질 점수 — 이보다 낮으면 추천 제외 */
const MIN_SCORE: Partial<Record<ThemeId, number>> = {
  food_market: 58,
  peace_calm: 50,
  drink_craft: 52,
  yolo_night: 48,
  faith_heritage: 55,
  photo_landmark: 50,
  shopping_style: 48,
};

export function scorePlaceQuality(input: QualityInput): number {
  const { title, why, source, themeId, tags, wikivoyageSection, nominatimImportance } = input;

  if (isGlobalChain(title, tags)) return -100;
  if (isFastFood(tags)) return -80;

  let score = 0;

  const sourceBase: Record<PlaceSource, number> = {
    wikivoyage: 72,
    wikidata: 62,
    osm: 48,
    nominatim: 38,
    photon: 32,
    wikipedia: 28,
  };
  score += sourceBase[source] ?? 20;

  if (source === "wikivoyage") {
    score += 18;
    if (wikivoyageSection === "Eat" && themeId === "food_market") score += 22;
    if (wikivoyageSection === "Drink" && (themeId === "food_market" || themeId === "drink_craft")) score += 15;
    if (wikivoyageSection === "See" && themeId === "photo_landmark") score += 12;
    if (wikivoyageSection === "Buy" && themeId === "food_market") score += 18;
    if (wikivoyageSection === "Buy" && themeId === "shopping_style") score += 15;
  }

  if (REVIEW_SIGNALS.test(why)) score += 20;
  if (NEGATIVE_SIGNALS.test(why)) score -= 35;

  if (tags) {
    if (tags.cuisine) score += 18;
    if (tags.wikipedia || tags.wikidata) score += 22;
    if (tags.tourism === "attraction") score += 14;
    if (tags.heritage || tags.historic) score += 12;
    if (tags.stars || tags["michelin:stars"]) score += 16;
    if (tags.rating) score += Math.min(15, Number(tags.rating) * 3);
    if (tags.website || tags["contact:website"]) score += 6;
    if (tags.brand && !tags.cuisine) score -= 25;
    if (tags.amenity === "marketplace") score += 20;
    if (tags.amenity === "food_court") score += 12;
    if (tags.amenity === "restaurant" && !tags.cuisine && themeId === "food_market") score -= 22;
  }

  if (typeof nominatimImportance === "number") {
    score += Math.min(18, nominatimImportance * 12);
  }

  if (themeId === "food_market") {
    if (source === "wikipedia") score -= 15;
    if (source === "photon" && tags?.amenity === "restaurant") score -= 10;
  }

  if (themeId === "faith_heritage" && source === "wikipedia") score -= 10;

  return Math.round(score);
}

export function passesQualityGate(input: QualityInput): boolean {
  const score = scorePlaceQuality(input);
  const min = MIN_SCORE[input.themeId] ?? 42;
  return score >= min;
}

export function qualityLabel(score: number, locale: "ko" | "en" = "ko"): string {
  if (score >= 85) return locale === "en" ? "Editor & travel-guide pick" : "여행 가이드·에디터 추천";
  if (score >= 70) return locale === "en" ? "Strong local signals" : "로컬 신호 강함";
  if (score >= 55) return locale === "en" ? "Curated match" : "테마 적합 큐레이션";
  return locale === "en" ? "Basic match" : "기본 매칭";
}

export function buildQualityWhy(
  baseWhy: string,
  score: number,
  locale: "ko" | "en" = "ko"
): string {
  const label = qualityLabel(score, locale);
  const reviewNote =
    REVIEW_SIGNALS.test(baseWhy)
      ? locale === "en"
        ? "Guide text mentions popularity or reputation."
        : "가이드 문서에 인기·평판 언급."
      : "";
  return [baseWhy, `${label} (품질 ${score})`, reviewNote].filter(Boolean).join(" · ");
}
