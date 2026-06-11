import type { BudgetBreakdown, LodgingId, TransportId, TripPreferences } from "./tripTypes";
import type { CityCostIndex, MarketDb } from "./travelData";
import { normalizeCityName } from "./travelData";

const DEFAULT_COST: CityCostIndex = {
  hotel: 150000,
  inn: 90000,
  hostel: 45000,
  meal: 40000,
  bus_day: 12000,
  car_day: 90000,
  activity: 25000,
};

function getCityCosts(market: MarketDb | null, city: string): CityCostIndex {
  const key = Object.keys(market?.cost_index ?? {}).find(
    (name) => normalizeCityName(name) === normalizeCityName(city)
  );
  return { ...DEFAULT_COST, ...(key ? market?.cost_index?.[key] : {}) };
}

function lodgingRate(costs: CityCostIndex, lodging: LodgingId) {
  if (lodging === "none") return 0;
  if (lodging === "hotel") return costs.hotel ?? DEFAULT_COST.hotel!;
  if (lodging === "inn") return costs.inn ?? DEFAULT_COST.inn!;
  return costs.hostel ?? DEFAULT_COST.hostel!;
}

function transportRate(costs: CityCostIndex, transport: TransportId) {
  if (transport === "rental_car") return costs.car_day ?? DEFAULT_COST.car_day!;
  if (transport === "bus") return costs.bus_day ?? DEFAULT_COST.bus_day!;
  return 0;
}

export function estimateBudget(
  prefs: TripPreferences,
  market: MarketDb | null,
  stopCount: number
): BudgetBreakdown {
  const costs = getCityCosts(market, prefs.city);
  const nights = prefs.lodging === "none" ? 0 : prefs.nights;
  const days = Math.max(prefs.days, 1);

  const lodging = lodgingRate(costs, prefs.lodging) * nights;
  const transport = transportRate(costs, prefs.transport) * days;
  const meals = (costs.meal ?? DEFAULT_COST.meal!) * days;
  const activities = (costs.activity ?? DEFAULT_COST.activity!) * Math.min(stopCount, days * 2);
  const total = lodging + transport + meals + activities;

  const notes = [
    "숙박·교통·식비·체험비는 수집된 도시 물가 테이블 기준 추정치입니다.",
    "항공권과 개별 예약 수수료는 포함되지 않았습니다.",
  ];

  if (prefs.lodging === "none") {
    notes.push("무박 일정이라 숙박비는 0원으로 계산했습니다.");
  }

  return {
    lodging,
    transport,
    meals,
    activities,
    total,
    perDay: Math.round(total / days),
    withinBudget: total <= prefs.budgetKrw,
    budgetKrw: prefs.budgetKrw,
    notes,
  };
}

export function formatKrw(amount: number) {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}
