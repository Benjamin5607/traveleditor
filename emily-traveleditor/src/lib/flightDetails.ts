import { estimateFlightFromSeoul, type FlightEstimate } from "./flightEstimates";
import type { MarketDb } from "./travelData";
import { parseFlightInfoFromWikivoyage, type ParsedFlightInfo } from "./wikivoyageParser";

const ORIGIN = { code: "ICN", name: "인천국제공항", city: "Seoul" };

const CITY_AIRPORTS: Record<string, { code: string; name: string }> = {
  tokyo: { code: "TYO", name: "나리타(NRT)·하네다(HND)" },
  osaka: { code: "OSA", name: "간사이(KIX)·이타미(ITM)" },
  london: { code: "LON", name: "히스로(LHR)·개트윅(LGW) 등" },
  paris: { code: "PAR", name: "샤를 드 골(CDG)·오르리(ORY)" },
  danang: { code: "DAD", name: "다낭국제공항" },
  bangkok: { code: "BKK", name: "수완나품국제공항" },
  singapore: { code: "SIN", name: "창이국제공항" },
  taipei: { code: "TPE", name: "타오위안국제공항" },
  seoul: { code: "ICN", name: "인천국제공항" },
  barcelona: { code: "BCN", name: "엘프라트공항" },
  rome: { code: "FCO", name: "피우미치노공항" },
  berlin: { code: "BER", name: "베를린브란덴부르크공항" },
  hongkong: { code: "HKG", name: "홍콩국제공항" },
  newyork: { code: "NYC", name: "JFK·뉴어크(EWR) 등" },
  losangeles: { code: "LAX", name: "LA국제공항" },
};

function normalizeKey(city: string) {
  return city.trim().toLowerCase().replace(/[\s-]/g, "");
}

function estimateDurationHours(distanceKm: number) {
  if (distanceKm < 50) return 0;
  const flight = distanceKm / 850;
  return Math.round((flight + 1.5) * 10) / 10;
}

export type FlightDetail = {
  routeLabel: string;
  origin: typeof ORIGIN;
  destination: { code: string; name: string; city: string };
  durationHours?: number;
  carriers: string[];
  whyThisEstimate: string;
  wikivoyageNotes: string[];
  estimate: FlightEstimate;
};

export function buildFlightDetail(
  city: string,
  coords: { lat: number; lng: number } | undefined,
  market: MarketDb | null,
  wikivoyageExtract?: string
): FlightDetail {
  const key = normalizeKey(city);
  const parsed: ParsedFlightInfo = wikivoyageExtract
    ? parseFlightInfoFromWikivoyage(wikivoyageExtract, city)
    : { airlines: [], notes: [] };

  const airport = CITY_AIRPORTS[key];
  const destCode = parsed.destinationAirport ?? airport?.code ?? key.toUpperCase().slice(0, 3);
  const destName = airport?.name ?? parsed.destinationAirportName ?? `${city} 공항`;

  const estimate = estimateFlightFromSeoul(city, coords, market);

  const icn = { lat: 37.4602, lng: 126.4407 };
  const km = coords
    ? Math.round(
        6371 *
          2 *
          Math.asin(
            Math.sqrt(
              Math.sin(((coords.lat - icn.lat) * Math.PI) / 360) ** 2 +
                Math.cos((icn.lat * Math.PI) / 180) *
                  Math.cos((coords.lat * Math.PI) / 180) *
                  Math.sin(((coords.lng - icn.lng) * Math.PI) / 360) ** 2
            )
          )
      )
    : undefined;

  const durationHours = km != null ? estimateDurationHours(km) : undefined;

  const carriers = parsed.airlines.length
    ? parsed.airlines
    : key === "seoul"
      ? []
      : ["검색 링크에서 항공사·편명 확인 필요"];

  const whyParts = [
    `서울 ${ORIGIN.name}(${ORIGIN.code}) 출발 → ${city} ${destName}(${destCode}) 도착 구간의 왕복 요금 추정입니다.`,
    durationHours ? `비행시간 약 ${durationHours}시간(공항 대기 포함 추정) 기준 중거리권입니다.` : "",
    parsed.airlines.length
      ? `Wikivoyage에 언급된 항공사: ${parsed.airlines.join(", ")}.`
      : "특정 편명이 아닌 구간 평균가이며, 링크에서 실제 항공사·시간대를 선택하세요.",
  ].filter(Boolean);

  return {
    routeLabel: `${ORIGIN.code} → ${destCode}`,
    origin: ORIGIN,
    destination: { code: destCode, name: destName, city },
    durationHours,
    carriers,
    whyThisEstimate: whyParts.join(" "),
    wikivoyageNotes: parsed.notes,
    estimate,
  };
}

export function formatFlightRange(detail: FlightDetail) {
  const e = detail.estimate;
  return `${e.low.toLocaleString("ko-KR")}원 ~ ${e.high.toLocaleString("ko-KR")}원`;
}
