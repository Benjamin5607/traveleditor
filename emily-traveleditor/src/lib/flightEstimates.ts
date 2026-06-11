import { normalizeCityName } from "./travelData";

const ICN = { lat: 37.4602, lng: 126.4407 };

/** 서울(ICN) 출발 기준 무료 추정 테이블 (실시간 API 대신 거리권 휴리스틱) */
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

/** 거리(km)만으로 왕복 항공 추정 — 무료 API 좌표가 있을 때 */
export function estimateFlightByDistanceKm(distanceKm: number): { low: number; high: number } {
  if (distanceKm < 50) return { low: 0, high: 0 };
  const base = 80000 + distanceKm * 420;
  const spread = Math.max(60000, distanceKm * 180);
  return {
    low: Math.round(Math.max(120000, base - spread)),
    high: Math.round(base + spread),
  };
}

export function estimateFlightFromSeoul(city: string, coords?: { lat: number; lng: number }): FlightEstimate {
  const key = normalizeCityName(city);
  if (key === "seoul") {
    return {
      low: 0,
      high: 0,
      label: "0원 (출발지)",
      note: "출발 도시가 서울이라 항공비는 0원으로 계산했습니다.",
    };
  }

  const direct = FLIGHT_TABLE_KRW[key];
  if (direct) {
    return {
      ...direct,
      label: `${formatRange(direct.low, direct.high)} (서울 출발 추정)`,
      note: "무료 거리권 테이블 기준 왕복 항공 추정치입니다. 실제 가격은 검색 링크에서 확인하세요.",
    };
  }

  for (const region of REGION_DEFAULTS) {
    if (region.match.test(city)) {
      return {
        ...region.estimate,
        label: `${formatRange(region.estimate.low, region.estimate.high)} (권역 평균 추정)`,
        note: "도시별 실데이터가 없어 인근 권역 평균으로 추정했습니다.",
      };
    }
  }

  if (coords) {
    const km = haversineKm(ICN, coords);
    const dist = estimateFlightByDistanceKm(km);
    return {
      ...dist,
      label: `${formatRange(dist.low, dist.high)} (거리 ${Math.round(km)}km 추정)`,
      note: `서울↔${city} 직선거리 ${Math.round(km)}km로 무료 거리 공식을 적용했습니다.`,
    };
  }

  const fallback = { low: 350000, high: 750000 };
  return {
    ...fallback,
    label: `${formatRange(fallback.low, fallback.high)} (중거리 기본 추정)`,
    note: "해당 도시 항공 데이터가 없어 중거리 기본값을 사용했습니다.",
  };
}

function formatRange(low: number, high: number) {
  if (low === 0 && high === 0) return "0원";
  return `${low.toLocaleString("ko-KR")}원 ~ ${high.toLocaleString("ko-KR")}원`;
}

export function flightMidpoint(estimate: FlightEstimate) {
  return Math.round((estimate.low + estimate.high) / 2);
}
