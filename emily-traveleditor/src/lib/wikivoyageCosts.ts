import type { CityCostIndex } from "./travelData";

type FxRates = { USD?: number; EUR?: number; JPY?: number; GBP?: number };

/** Wikivoyage 본문에서 무료로 물가 힌트 추출 (환율로 KRW 환산) */
export function parseWikivoyageCosts(extract: string, rates: FxRates = {}): Partial<CityCostIndex> {
  const text = extract.slice(0, 8000);
  const hints: Partial<CityCostIndex> = {};

  const usd = rates.USD ?? 1400;
  const eur = rates.EUR ?? 1550;
  const jpy = rates.JPY ?? 9.5;
  const gbp = rates.GBP ?? 1850;

  const toKrw = (amount: number, currency: string) => {
    if (currency === "$" || currency === "US$" || currency === "USD") return Math.round(amount * usd);
    if (currency === "€" || currency === "EUR") return Math.round(amount * eur);
    if (currency === "£" || currency === "GBP") return Math.round(amount * gbp);
    if (currency === "¥" || currency === "JPY") return Math.round(amount * jpy);
    return Math.round(amount * usd);
  };

  const moneyPattern = /(?:US\$|\$|€|£|¥)\s*(\d{1,4}(?:[.,]\d{1,2})?)/gi;
  const amounts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = moneyPattern.exec(text)) !== null) {
    const raw = match[0];
    const num = parseFloat(match[1].replace(",", ""));
    if (Number.isNaN(num) || num < 3 || num > 9999) continue;
    const sym = raw.match(/^(US\$|€|£|¥|\$)/)?.[0] ?? "$";
    amounts.push(toKrw(num, sym));
  }

  const section = (label: string) => {
    const re = new RegExp(`${label}[^\\n]*\\n([\\s\\S]{0,600})`, "i");
    return re.exec(text)?.[1] ?? "";
  };

  const budgetBlock = `${section("Budget")} ${section("Costs")} ${section("Sleep")} ${section("Eat")}`;
  const budgetAmounts: number[] = [];
  const budgetMatch = moneyPattern;
  budgetMatch.lastIndex = 0;
  while ((match = budgetMatch.exec(budgetBlock)) !== null) {
    const raw = match[0];
    const num = parseFloat(match[1].replace(",", ""));
    if (!Number.isNaN(num)) {
      const sym = raw.match(/^(US\$|€|£|¥|\$)/)?.[0] ?? "$";
      budgetAmounts.push(toKrw(num, sym));
    }
  }

  if (/hostel/i.test(budgetBlock) && budgetAmounts.length) {
    hints.hostel = Math.min(...budgetAmounts.filter((n) => n < 120000));
  }
  if (/hotel|mid-?range/i.test(budgetBlock) && budgetAmounts.length) {
    const sorted = [...budgetAmounts].sort((a, b) => a - b);
    hints.hotel = sorted[Math.floor(sorted.length / 2)] ?? sorted[sorted.length - 1];
    hints.inn = sorted[Math.floor(sorted.length / 3)] ?? hints.hotel;
  }
  if (/meal|lunch|dinner|restaurant/i.test(budgetBlock) && budgetAmounts.length) {
    const mealCandidates = budgetAmounts.filter((n) => n >= 8000 && n <= 80000);
    if (mealCandidates.length) hints.meal = Math.round(mealCandidates.reduce((a, b) => a + b, 0) / mealCandidates.length);
  }

  if (!hints.meal && amounts.length) {
    const meals = amounts.filter((n) => n >= 8000 && n <= 60000);
    if (meals.length) hints.meal = Math.round(meals.reduce((a, b) => a + b, 0) / meals.length);
  }
  if (!hints.hostel && amounts.length) {
    const low = amounts.filter((n) => n >= 15000 && n <= 80000);
    if (low.length) hints.hostel = Math.min(...low);
  }
  if (!hints.hotel && amounts.length) {
    const high = amounts.filter((n) => n >= 60000 && n <= 400000);
    if (high.length) hints.hotel = Math.round(high.reduce((a, b) => a + b, 0) / high.length);
  }

  if (hints.hotel && !hints.inn) hints.inn = Math.round(hints.hotel * 0.65);
  if (hints.hotel && !hints.hostel) hints.hostel = Math.round(hints.hotel * 0.35);
  if (!hints.bus_day) hints.bus_day = 12000;
  if (!hints.car_day) hints.car_day = Math.round((hints.hotel ?? 120000) * 0.55);
  if (!hints.activity) hints.activity = Math.round((hints.meal ?? 35000) * 0.7);

  return hints;
}
