import type { CityCostIndex } from "./travelData";

/** Nominatim country_code 기준 무료 물가 티어 (KRW/일 추정) */
const COUNTRY_COST_TIERS: Record<string, CityCostIndex> = {
  kr: { hotel: 120000, inn: 75000, hostel: 40000, meal: 35000, bus_day: 10000, car_day: 80000, activity: 20000 },
  jp: { hotel: 180000, inn: 110000, hostel: 55000, meal: 50000, bus_day: 15000, car_day: 110000, activity: 30000 },
  vn: { hotel: 70000, inn: 45000, hostel: 25000, meal: 25000, bus_day: 8000, car_day: 60000, activity: 15000 },
  th: { hotel: 80000, inn: 50000, hostel: 28000, meal: 28000, bus_day: 9000, car_day: 65000, activity: 18000 },
  sg: { hotel: 220000, inn: 140000, hostel: 70000, meal: 55000, bus_day: 12000, car_day: 130000, activity: 35000 },
  gb: { hotel: 250000, inn: 160000, hostel: 80000, meal: 60000, bus_day: 18000, car_day: 140000, activity: 40000 },
  fr: { hotel: 230000, inn: 150000, hostel: 75000, meal: 55000, bus_day: 16000, car_day: 130000, activity: 38000 },
  us: { hotel: 260000, inn: 170000, hostel: 85000, meal: 65000, bus_day: 20000, car_day: 150000, activity: 45000 },
  tw: { hotel: 140000, inn: 90000, hostel: 48000, meal: 40000, bus_day: 12000, car_day: 95000, activity: 25000 },
};

const DEFAULT_TIER: CityCostIndex = {
  hotel: 150000,
  inn: 90000,
  hostel: 45000,
  meal: 40000,
  bus_day: 12000,
  car_day: 90000,
  activity: 25000,
};

export function costsFromCountryCode(countryCode?: string): CityCostIndex {
  if (!countryCode) return DEFAULT_TIER;
  return { ...DEFAULT_TIER, ...COUNTRY_COST_TIERS[countryCode.toLowerCase()] };
}
