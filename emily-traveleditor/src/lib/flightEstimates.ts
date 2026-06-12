import { resolveCityAirport } from "./airports";
import type { Locale } from "./i18n";
import { normalizeCityName, type FlightIndexEntry, type MarketDb } from "./travelData";

/** 무료 추정 테이블 (실시간 API 대신 거리권 휴리스틱) */
const FLIGHT_TABLE_KRW: Record<string, { low: number; high: number }> = {
  seoul: { low: 0, high: 0 },
  tokyo: { low: 180000, high: 420000 },
  osaka: { low: 170000, high: 380000 },
  london: { low: 650000, high: 1200000 },
  paris: { low: 620000, high: 1150000 },
  danang: { low: 220000, high: 480000 },
  bangkok: { low: 250000, high: 520000 },
  singapore: { low: 280000, high: 550000 },
  taipei: { low: 190000, high: 400000 },
  hongkong: { low: 210000, high: 450000 },
  newyork: { low: 900000, high: 1600000 },
  losangeles: { low: 850000, high: 1500000 },
  busan: { low: 0, high: 0 },
  jeju: { low: 80000, high: 200000 },
};

const REGION_DEFAULTS = [
  { match: /tokyo|osaka|kyoto|japan/i, estimate: FLIGHT_TABLE_KRW.tokyo },
  { match: /london|uk|england/i, estimate: FLIGHT_TABLE_KRW.london },
  { match: /paris|france/i, estimate: FLIGHT_TABLE_KRW.paris },
  { match: /danang|vietnam|hanoi|hochi/i, estimate: FLIGHT_TABLE_KRW.danang },
  { match: /bangkok|thailand/i, estimate: FLIGHT_TABLE_KRW.bangkok },
  { match: /singapore/i, estimate: FLIGHT_TABLE_KRW.singapore },
  { match: /taipei|taiwan/i, estimate: FLIGHT_TABLE_KRW.taipei },
];

export type FlightEstimate = {
  low: number;
  high: number;
  label: string;
  note: string;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function estimateFlightByDistanceKm(distanceKm: number): { low: number; high: number } {
  if (distanceKm < 50) return { low: 0, high: 0 };
  let low: number;
  let spreadRatio: number;
  if (distanceKm < 1200) {
    low = 90000 + distanceKm * 75;
    spreadRatio = 0.85;
  } else if (distanceKm < 3500) {
    low = 160000 + distanceKm * 45;
    spreadRatio = 0.55;
  } else if (distanceKm < 7000) {
    low = 220000 + distanceKm * 35;
    spreadRatio = 0.5;
  } else {
    low = 400000 + distanceKm * 55;
    spreadRatio = 0.4;
  }
  const spread = low * spreadRatio;
  return { low: Math.round(low), high: Math.round(low + spread) };
}

function flightFromIndex(entry: FlightIndexEntry, label: string, note: string): FlightEstimate {
  return { low: entry.low, high: entry.high, label, note };
}

function formatRange(low: number, high: number, locale: Locale) {
  const loc = locale === "ko" ? "ko-KR" : "en-US";
  if (low === 0 && high === 0) return locale === "ko" ? "0원" : "₩0";
  if (locale === "en") {
    return `₩${low.toLocaleString(loc)} ~ ₩${high.toLocaleString(loc)}`;
  }
  return `${low.toLocaleString(loc)}원 ~ ${high.toLocaleString(loc)}원`;
}

export function estimateFlight(
  originCity: string,
  destCity: string,
  destCoords?: { lat: number; lng: number },
  market?: MarketDb | null,
  locale: Locale = "ko"
): FlightEstimate {
  const originKey = normalizeCityName(originCity);
  const destKey = normalizeCityName(destCity);

  if (originKey === destKey) {
    return {
      low: 0,
      high: 0,
      label: locale === "en" ? "₩0 (same city)" : "0원 (출발=도착)",
      note:
        locale === "en"
          ? "Origin and destination are the same — flight cost is 0."
          : "출발지와 도착지가 같아 항공비는 0원으로 계산했습니다.",
    };
  }

  const originAirport = resolveCityAirport(originCity);

  const indexed = market?.flight_index?.[destKey]
    ?? Object.entries(market?.flight_index ?? {}).find(([name]) => normalizeCityName(name) === destKey)?.[1];

  if (indexed && originKey === "seoul") {
    const kmNote = indexed.km
      ? locale === "en"
        ? ` (straight ${Math.round(indexed.km)}km, CI)`
        : ` (직선 ${Math.round(indexed.km)}km, CI 수집)`
      : "";
    return flightFromIndex(
      indexed,
      `${formatRange(indexed.low, indexed.high, locale)}${locale === "en" ? ` from Seoul${kmNote}` : ` (서울 출발 추정${kmNote})`}`,
      locale === "en"
        ? "CI distance-based estimate. Confirm real price in search links."
        : "GitHub Actions가 무료 거리 공식으로 수집한 항공 추정치입니다. 검색 링크에서 실가 확인하세요."
    );
  }

  const direct = FLIGHT_TABLE_KRW[destKey];
  if (direct && originKey === "seoul") {
    return {
      ...direct,
      label: `${formatRange(direct.low, direct.high, locale)}${locale === "en" ? " from Seoul" : " (서울 출발 추정)"}`,
      note:
        locale === "en"
          ? "Free distance-tier table estimate. Confirm in search links."
          : "무료 거리권 테이블 기준 왕복 항공 추정치입니다. 실제 가격은 검색 링크에서 확인하세요.",
    };
  }

  for (const region of REGION_DEFAULTS) {
    if (region.match.test(destCity) && originKey === "seoul") {
      return {
        ...region.estimate,
        label: `${formatRange(region.estimate.low, region.estimate.high, locale)}${locale === "en" ? " (regional avg)" : " (권역 평균 추정)"}`,
        note:
          locale === "en"
            ? "No city-specific data — regional average used."
            : "도시별 실데이터가 없어 인근 권역 평균으로 추정했습니다.",
      };
    }
  }

  if (originAirport?.lat && destCoords) {
    const km = haversineKm({ lat: originAirport.lat, lng: originAirport.lng }, destCoords);
    const dist = estimateFlightByDistanceKm(km);
    return {
      ...dist,
      label: `${formatRange(dist.low, dist.high, locale)}${locale === "en" ? ` (${Math.round(km)}km)` : ` (거리 ${Math.round(km)}km 추정)`}`,
      note:
        locale === "en"
          ? `Straight-line ${Math.round(km)}km from ${originCity} using free distance formula.`
          : `${originCity}↔${destCity} 직선거리 ${Math.round(km)}km로 무료 거리 공식을 적용했습니다.`,
    };
  }

  if (destCoords && originKey === "seoul") {
    const icn = { lat: 37.4602, lng: 126.4407 };
    const km = haversineKm(icn, destCoords);
    const dist = estimateFlightByDistanceKm(km);
    return {
      ...dist,
      label: `${formatRange(dist.low, dist.high, locale)}${locale === "en" ? ` (${Math.round(km)}km)` : ` (거리 ${Math.round(km)}km 추정)`}`,
      note:
        locale === "en"
          ? `Seoul↔${destCity} straight-line ${Math.round(km)}km estimate.`
          : `서울↔${destCity} 직선거리 ${Math.round(km)}km로 무료 거리 공식을 적용했습니다.`,
    };
  }

  const fallback = { low: 350000, high: 750000 };
  return {
    ...fallback,
    label: `${formatRange(fallback.low, fallback.high, locale)}${locale === "en" ? " (default)" : " (중거리 기본 추정)"}`,
    note:
      locale === "en"
        ? "Insufficient airport data — mid-range default used."
        : "공항·거리 데이터가 부족해 중거리 기본값을 사용했습니다.",
  };
}

/** @deprecated use estimateFlight */
export function estimateFlightFromSeoul(
  city: string,
  coords?: { lat: number; lng: number },
  market?: MarketDb | null
): FlightEstimate {
  return estimateFlight("Seoul", city, coords, market, "ko");
}

export function flightMidpoint(estimate: FlightEstimate) {
  return Math.round((estimate.low + estimate.high) / 2);
}
