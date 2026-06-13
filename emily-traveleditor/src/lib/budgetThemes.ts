import type { BudgetThemeId, LodgingId } from "./tripTypes";

export const BUDGET_THEMES = [
  {
    id: "miser_backpack",
    name: "구두쇠 백패킹",
    emoji: "🎒",
    tagline: "돈은 아끼고 경험은 극대화",
    description: "호스텔·길거리 음식·무료 명소. 화장실은 역·백화점·편의점을 적극 활용.",
    defaultBudgetKrw: 650000,
    suggestedLodging: "hostel" as LodgingId,
    multipliers: { hotel: 0.45, inn: 0.55, hostel: 0.9, meal: 0.55, activity: 0.5, bus_day: 0.85, car_day: 0.7 },
    mealGuide: "현지 분식·시장·편의점 도시락. 관광지 안 식당은 피하고 로컬 골목을 노리세요.",
    restroomGuide: "지하철역·공원·쇼핑몰 공중화장실 OSM 마커를 일정에 넣었습니다. 무료 이용 위주.",
    narrationTone: "가성비 끝판왕 가이드",
  },
  {
    id: "smart_value",
    name: "실속 여행",
    emoji: "⚖️",
    tagline: "쓸 땐 쓰고 아낄 땐 아낀다",
    description: "게스트하우스·로컬 맛집·핵심 체험에만 예산 집중. 이동은 대중교통.",
    defaultBudgetKrw: 1200000,
    suggestedLodging: "inn" as LodgingId,
    multipliers: { hotel: 0.75, inn: 0.9, hostel: 1, meal: 0.85, activity: 0.9, bus_day: 1, car_day: 0.9 },
    mealGuide: "점심은 로컬 식당, 저녁은 테마에 맞는 한 끼만 파격. 카페는 오후 휴식용 1곳.",
    restroomGuide: "카페 이용 시 화장실 확보 + 역 근처 공중화장실을 루트에 배치했습니다.",
    narrationTone: "똑똑한 실속 가이드",
  },
  {
    id: "yolo_luxury",
    name: "욜로 럭셔리 스웡",
    emoji: "✨",
    tagline: "인생 한 번이지 뭐",
    description: "호텔·파인다이닝·프리미엄 체험. 택시·렌트카 여유.",
    defaultBudgetKrw: 3500000,
    suggestedLodging: "hotel" as LodgingId,
    multipliers: { hotel: 1.45, inn: 1.2, hostel: 1.1, meal: 1.5, activity: 1.4, bus_day: 1.1, car_day: 1.35 },
    mealGuide: "Wikivoyage·OSM 기준 인기 식당·카페 위주. 예약 링크로 미리 자리 잡으세요.",
    restroomGuide: "호텔·백화점·고급 카페 라운지 화장실이 깔끔합니다. 루트에 프리미엄 휴게 카페 포함.",
    narrationTone: "럭셔리 무드 큐레이터",
  },
  {
    id: "custom",
    name: "직접 입력",
    emoji: "✏️",
    tagline: "내 지갑 내가 정한다",
    description: "예산 금액을 직접 입력합니다.",
    defaultBudgetKrw: 1500000,
    suggestedLodging: "hotel" as LodgingId,
    multipliers: { hotel: 1, inn: 1, hostel: 1, meal: 1, activity: 1, bus_day: 1, car_day: 1 },
    mealGuide: "일정 주변 OSM 식당·카페를 참고하세요.",
    restroomGuide: "공중화장실·카페 휴게를 루트에 표시했습니다.",
    narrationTone: "맞춤 가이드",
  },
] as const;

const BUDGET_THEME_EN: Record<
  BudgetThemeId,
  { name: string; tagline: string; description: string; mealGuide: string; restroomGuide: string; narrationTone: string }
> = {
  miser_backpack: {
    name: "Broke Backpacker",
    tagline: "Save money, max experiences",
    description: "Hostels, street food, free sights. Use station and mall restrooms.",
    mealGuide: "Street stalls, markets, convenience-store meals. Avoid tourist-trap restaurants.",
    restroomGuide: "OSM marks station, park, and mall restrooms on your route — mostly free.",
    narrationTone: "Budget hero guide",
  },
  smart_value: {
    name: "Smart Value",
    tagline: "Spend where it counts",
    description: "Guesthouses, local restaurants, key experiences. Public transit.",
    mealGuide: "Local lunch, one splurge dinner for the theme. One cafe break in the afternoon.",
    restroomGuide: "Café stops plus station restrooms along the route.",
    narrationTone: "Practical value guide",
  },
  yolo_luxury: {
    name: "YOLO Luxury",
    tagline: "You only live once",
    description: "Hotels, fine dining, premium experiences. Taxi or rental car.",
    mealGuide: "Popular spots from Wikivoyage/OSM. Book ahead at peak hours.",
    restroomGuide: "Hotel, department store, and premium café restrooms. Upscale café breaks included.",
    narrationTone: "Luxury curator",
  },
  custom: {
    name: "Custom budget",
    tagline: "Your wallet, your rules",
    description: "Enter your own budget amount.",
    mealGuide: "Check OSM restaurants and cafés near each stop.",
    restroomGuide: "Public restrooms and café breaks are marked on the route.",
    narrationTone: "Custom guide",
  },
};

export function getBudgetTheme(id: BudgetThemeId) {
  return BUDGET_THEMES.find((t) => t.id === id) ?? BUDGET_THEMES[2];
}

export function localizeBudgetTheme(id: BudgetThemeId, locale: "ko" | "en") {
  const base = getBudgetTheme(id);
  if (locale === "ko") return base;
  const en = BUDGET_THEME_EN[id];
  return { ...base, ...en };
}

export function applyCostMultipliers(
  costs: Record<string, number | undefined>,
  themeId: BudgetThemeId
) {
  const theme = getBudgetTheme(themeId);
  const m = theme.multipliers;
  return {
    hotel: Math.round((costs.hotel ?? 150000) * m.hotel),
    inn: Math.round((costs.inn ?? 90000) * m.inn),
    hostel: Math.round((costs.hostel ?? 45000) * m.hostel),
    meal: Math.round((costs.meal ?? 40000) * m.meal),
    bus_day: Math.round((costs.bus_day ?? 12000) * m.bus_day),
    car_day: Math.round((costs.car_day ?? 90000) * m.car_day),
    activity: Math.round((costs.activity ?? 25000) * m.activity),
  };
}
