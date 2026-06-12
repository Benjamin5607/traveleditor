import { getBudgetTheme } from "./budgetThemes";
import { getEmilyTheme } from "./themes";
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
  const travelTheme = getEmilyTheme(prefs.theme);
  const budgetTheme = getBudgetTheme(prefs.budgetTheme);
  const langs = resolveSearchLanguages(countryCode);
  const langLabels = langs.map((l) => l.label).join(" · ");

  const welcome = [
    `${prefs.city}에 오신 걸 환영해요.`,
    `이 가이드북은 「${travelTheme.name}」 컨셉과 「${budgetTheme.name}」 ${budgetTheme.emoji} 예산 감성으로 짰습니다.`,
    `${budgetTheme.tagline} — ${budgetTheme.description}`,
  ].join(" ");

  const philosophy = [
    `${travelTheme.description}`,
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
    ]
      .filter(Boolean)
      .join(" ");
  }

  const closing = [
    `${prefs.city}에서 ${prefs.days}일, ${places.length}곳의 추천을 담았습니다.`,
    budgetTheme.id === "yolo_luxury"
      ? "쓸 땐 확실히 쓰는 게 이 여행의 포인트예요. 링크에서 실제 가격을 꼭 확인하세요."
      : budgetTheme.id === "miser_backpack"
        ? "남는 돈은 다음 여행 통장에 넣어두세요. 공짜 뷰와 로컬 맛이 최고의 럭셔리입니다."
        : "실속 있게 즐기고, 링크로 예약·지도를 한 번 더 확인하면 완벽해요.",
  ].join(" ");

  return {
    welcome,
    philosophy,
    dayIntros,
    closing,
    searchNote: `다국어 검색: ${langLabels} (국가 ${countryCode?.toUpperCase() ?? "미확인"})`,
  };
}
