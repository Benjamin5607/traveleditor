import { getBudgetTheme } from "./budgetThemes";
import { getEmilyTheme, localizeTheme } from "./themes";
import type { ItineraryDay, PlaceCandidate, TripPreferences } from "./tripTypes";
import { resolveSearchLanguages } from "./multilingualSearch";

export type GuideNarration = {
  welcome: string;
  philosophy: string;
  dayIntros: Record<number, string>;
  closing: string;
  searchNote: string;
};

export function buildGuideNarration(
  prefs: TripPreferences,
  places: PlaceCandidate[],
  days: ItineraryDay[],
  countryCode?: string
): GuideNarration {
  const travelThemeMeta = getEmilyTheme(prefs.theme);
  const travelTheme = localizeTheme(travelThemeMeta, prefs.locale);
  const budgetTheme = getBudgetTheme(prefs.budgetTheme);
  const langs = resolveSearchLanguages(countryCode, prefs.locale);
  const langLabels = langs.map((l) => l.label).join(" · ");

  if (prefs.locale === "en") {
    const welcome = [
      `Welcome to ${prefs.city}.`,
      `This guidebook follows 「${travelTheme.name}」 with ${budgetTheme.emoji} ${budgetTheme.name} budget vibe.`,
      `${budgetTheme.tagline} — ${budgetTheme.description}`,
      `Flying from ${prefs.originCity}.`,
    ].join(" ");

    const philosophy = [
      travelTheme.description,
      `Required place types: ${travelTheme.requirements.join(", ")}.`,
      `Meals: ${budgetTheme.mealGuide}`,
      `Rest stops: ${budgetTheme.restroomGuide}`,
      `Places collected via EOSLS — OSM, Nominatim, Photon, Wikivoyage, Wikidata first. Search languages: ${langLabels}. Wikipedia is last resort.`,
    ].join(" ");

    const dayIntros: Record<number, string> = {};
    for (const day of days) {
      const titles = day.blocks.map((b) => b.place_title).join(" → ");
      dayIntros[day.day] = [
        `${day.label}: ${travelTheme.shortLabel} mood, ${day.blocks.length} stops.`,
        titles ? `Route: ${titles}.` : "",
        "Meal, cafe, and restroom options added per stop.",
      ].filter(Boolean).join(" ");
    }

    const closing = [
      `Enjoy ${prefs.city} with ${travelTheme.name}.`,
      "Verify flight airports and prices in search links — only verified IATA codes are shown.",
      `${places.length} places curated for your theme.`,
    ].join(" ");

    return {
      welcome,
      philosophy,
      dayIntros,
      closing,
      searchNote: `EOSLS search languages: ${langLabels}`,
    };
  }

  const welcome = [
    `${prefs.city}에 오신 걸 환영해요.`,
    `이 가이드북은 「${travelTheme.name}」 컨셉과 「${budgetTheme.name}」 ${budgetTheme.emoji} 예산 감성으로 짰습니다.`,
    `${budgetTheme.tagline} — ${budgetTheme.description}`,
    `출발지: ${prefs.originCity}.`,
  ].join(" ");

  const philosophy = [
    travelTheme.description,
    `포함 장소 유형: ${travelTheme.requirements.join(", ")}.`,
    `식사: ${budgetTheme.mealGuide}`,
    `휴게: ${budgetTheme.restroomGuide}`,
    `장소는 EOSLS(오픈소스 로컬 검색)로 수집 — OpenStreetMap·Nominatim·Photon·Wikivoyage·Wikidata 우선, ${langLabels} 검색어 적용. Wikipedia는 최후 폴백.`,
  ].join(" ");

  const dayIntros: Record<number, string> = {};
  for (const day of days) {
    const titles = day.blocks.map((b) => b.place_title).join(" → ");
    dayIntros[day.day] = [
      `${day.label}: ${travelTheme.shortLabel} 무드로 ${day.blocks.length}곳을 돕니다.`,
      titles ? `루트: ${titles}.` : "",
      `각 정거장마다 식사·카페·화장실 휴게 옵션을 붙였어요.`,
    ].filter(Boolean).join(" ");
  }

  const closing = [
    `${prefs.city}에서 ${travelTheme.name} 여행을 즐기세요.`,
    "항공은 IATA 등록 공항만 표시합니다. 실제 편·가격은 검색 링크에서 확인하세요.",
    `테마에 맞게 ${places.length}곳을 골랐습니다.`,
  ].join(" ");

  return {
    welcome,
    philosophy,
    dayIntros,
    closing,
    searchNote: `EOSLS 검색 언어: ${langLabels}`,
  };
}
