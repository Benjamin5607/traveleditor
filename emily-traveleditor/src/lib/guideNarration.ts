import { localizeBudgetTheme } from "./budgetThemes";
import { getPlaneModeForTheme } from "./planeData";
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

function planeDataLine(planeMode: ReturnType<typeof getPlaneModeForTheme>, langLabels: string, locale: "ko" | "en") {
  if (planeMode === "halal") {
    return locale === "en"
      ? "Places prioritize the Halal Plane curated DB, supplemented by EOSLS (OSM, Nominatim, Photon, Wikivoyage, Wikidata)."
      : "장소는 Halal Plane 큐레이션 DB를 우선하고, EOSLS(OpenStreetMap·Nominatim·Photon·Wikivoyage·Wikidata)로 보강했습니다.";
  }
  if (planeMode === "drunken") {
    return locale === "en"
      ? "Places prioritize the Drunken Plane curated DB, supplemented by EOSLS."
      : "장소는 Drunken Plane 큐레이션 DB를 우선하고, EOSLS로 보강했습니다.";
  }
  return locale === "en"
    ? `Places collected via EOSLS — OSM, Nominatim, Photon, Wikivoyage, Wikidata first. Search languages: ${langLabels}. Wikipedia is last resort.`
    : `장소는 EOSLS(오픈소스 로컬 검색)로 수집 — OpenStreetMap·Nominatim·Photon·Wikivoyage·Wikidata 우선, ${langLabels} 검색어 적용. Wikipedia는 최후 폴백.`;
}

export function buildGuideNarration(
  prefs: TripPreferences,
  places: PlaceCandidate[],
  days: ItineraryDay[],
  countryCode?: string
): GuideNarration {
  const travelThemeMeta = getEmilyTheme(prefs.theme);
  const travelTheme = localizeTheme(travelThemeMeta, prefs.locale);
  const budgetTheme = localizeBudgetTheme(prefs.budgetTheme, prefs.locale);
  const planeMode = getPlaneModeForTheme(prefs.theme);
  const langs = resolveSearchLanguages(countryCode, prefs.locale);
  const langLabels = langs.map((l) => l.label).join(" · ");
  const dataLine = planeDataLine(planeMode, langLabels, prefs.locale);

  if (prefs.locale === "en") {
    const planeWelcome =
      planeMode === "halal"
        ? "Amina prioritized Halal restaurants, mosques, and Muslim-friendly areas from Halal Plane."
        : planeMode === "drunken"
          ? "Emily picked bars, whisky spots, and nightlife from Drunken Plane first."
          : "";

    const welcome = [
      `Welcome to ${prefs.city}.`,
      planeWelcome,
      `This guidebook follows 「${travelTheme.name}」 with ${budgetTheme.emoji} ${budgetTheme.name} budget vibe.`,
      `${budgetTheme.tagline} — ${budgetTheme.description}`,
      `Flying from ${prefs.originCity}.`,
    ]
      .filter(Boolean)
      .join(" ");

    const philosophy = [
      travelTheme.description,
      `Required place types: ${travelTheme.requirements.join(", ")}.`,
      `Meals: ${budgetTheme.mealGuide}`,
      `Rest stops: ${budgetTheme.restroomGuide}`,
      dataLine,
    ].join(" ");

    const dayIntros: Record<number, string> = {};
    for (const day of days) {
      const titles = day.blocks.map((b) => b.place_title).join(" → ");
      const planeHint =
        planeMode === "halal"
          ? "Route keeps Halal meals and prayer points in mind."
          : planeMode === "drunken"
            ? "Day and night drink spots are woven together."
            : "";
      dayIntros[day.day] = [
        `${day.label}: ${travelTheme.shortLabel} mood, ${day.blocks.length} stops.`,
        planeHint,
        titles ? `Route: ${titles}.` : "",
        "Meal, cafe, and restroom options added per stop.",
      ]
        .filter(Boolean)
        .join(" ");
    }

    const closing = [
      `Enjoy ${prefs.city} with ${travelTheme.name}.`,
      planeMode === "halal"
        ? "Ask Amina about prayer times and Halal menus in Plane Explorer."
        : planeMode === "drunken"
          ? "Ask Emily about signature drinks and hidden bars in Plane Explorer."
          : "",
      "Verify flight airports and prices in search links — only verified IATA codes are shown.",
      `${places.length} places curated for your theme.`,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      welcome,
      philosophy,
      dayIntros,
      closing,
      searchNote: planeMode
        ? `Plane DB + EOSLS search languages: ${langLabels}`
        : `EOSLS search languages: ${langLabels}`,
    };
  }

  const planeWelcome =
    planeMode === "halal"
      ? "아미나가 Halal Plane 큐레이션 DB로 할랄 식당·모스크·무슬림 친화 구역을 먼저 골라뒀어요."
      : planeMode === "drunken"
        ? "Emily가 Drunken Plane DB에서 바·위스키·와이너리·클럽 씬을 먼저 집어 넣었어요. 💋"
        : "";

  const welcome = [
    `${prefs.city}에 오신 걸 환영해요.`,
    planeWelcome,
    `이 가이드북은 「${travelTheme.name}」 컨셉과 「${budgetTheme.name}」 ${budgetTheme.emoji} 예산 감성으로 짰습니다.`,
    `${budgetTheme.tagline} — ${budgetTheme.description}`,
    `출발지: ${prefs.originCity}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const philosophy = [
    travelTheme.description,
    `포함 장소 유형: ${travelTheme.requirements.join(", ")}.`,
    `식사: ${budgetTheme.mealGuide}`,
    `휴게: ${budgetTheme.restroomGuide}`,
    dataLine,
  ].join(" ");

  const dayIntros: Record<number, string> = {};
  for (const day of days) {
    const titles = day.blocks.map((b) => b.place_title).join(" → ");
    const planeHint =
      planeMode === "halal"
        ? "할랄·기도 포인트를 염두에 둔 루트예요."
        : planeMode === "drunken"
          ? "한 잔의 무드가 이어지도록 밤·낮 스팟을 섞었어요."
          : "";
    dayIntros[day.day] = [
      `${day.label}: ${travelTheme.shortLabel} 무드로 ${day.blocks.length}곳을 돕니다.`,
      planeHint,
      titles ? `루트: ${titles}.` : "",
      `각 정거장마다 식사·카페·화장실 휴게 옵션을 붙였어요.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const closing = [
    `${prefs.city}에서 ${travelTheme.name} 여행을 즐기세요.`,
    planeMode === "halal"
      ? "Plane Explorer에서 아미나에게 기도 시간·할랄 메뉴를 더 물어보세요."
      : planeMode === "drunken"
        ? "Plane Explorer에서 Emily에게 시그니처 드링크와 숨은 바를 더 물어보세요. 😉"
        : "",
    "항공은 IATA 등록 공항만 표시합니다. 실제 편·가격은 검색 링크에서 확인하세요.",
    `테마에 맞게 ${places.length}곳을 골랐습니다.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    welcome,
    philosophy,
    dayIntros,
    closing,
    searchNote: planeMode
      ? `Plane DB + EOSLS 검색 언어: ${langLabels}`
      : `EOSLS 검색 언어: ${langLabels}`,
  };
}
