import { estimateFlight, type FlightEstimate } from "./flightEstimates";
import {
  airportLabel,
  resolveCityAirport,
  resolveDestinationAirport,
  type VerifiedAirport,
} from "./airports";
import type { Locale } from "./i18n";
import type { MarketDb } from "./travelData";
import { parseFlightInfoFromWikivoyage, type ParsedFlightInfo } from "./wikivoyageParser";

function estimateDurationHours(distanceKm: number) {
  if (distanceKm < 50) return 0;
  const flight = distanceKm / 850;
  return Math.round((flight + 1.5) * 10) / 10;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return (
    6371 *
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(((b.lat - a.lat) * Math.PI) / 360) ** 2 +
          Math.cos((a.lat * Math.PI) / 180) *
            Math.cos((b.lat * Math.PI) / 180) *
            Math.sin(((b.lng - a.lng) * Math.PI) / 360) ** 2
      )
    )
  );
}

export type FlightDetail = {
  routeLabel: string;
  origin: { code: string; name: string; city: string };
  destination: { code: string; name: string; city: string };
  durationHours?: number;
  carriers: string[];
  whyThisEstimate: string;
  wikivoyageNotes: string[];
  estimate: FlightEstimate;
  airportVerified: boolean;
};

export function buildFlightDetail(
  originCity: string,
  destCity: string,
  destCoords: { lat: number; lng: number } | undefined,
  market: MarketDb | null,
  wikivoyageExtract?: string,
  locale: Locale = "ko"
): FlightDetail {
  const parsed: ParsedFlightInfo = wikivoyageExtract
    ? parseFlightInfoFromWikivoyage(wikivoyageExtract, destCity)
    : { airlines: [], notes: [] };

  const originAirport = resolveCityAirport(originCity);
  const destAirport = resolveDestinationAirport(destCity, parsed.destinationAirport);

  const origin = originAirport
    ? {
        code: originAirport.iata,
        name: locale === "en" ? originAirport.nameEn : originAirport.nameKo,
        city: originAirport.city,
      }
    : {
        code: "—",
        name: locale === "en" ? "Airport not verified" : "등록 공항 미확인",
        city: originCity,
      };

  const destination = destAirport
    ? {
        code: destAirport.iata,
        name: locale === "en" ? destAirport.nameEn : destAirport.nameKo,
        city: destCity,
      }
    : {
        code: "—",
        name: locale === "en" ? "Airport not verified" : "등록 공항 미확인",
        city: destCity,
      };

  const estimate = estimateFlight(originCity, destCity, destCoords, market, locale);

  const originCoords = originAirport ? { lat: originAirport.lat, lng: originAirport.lng } : undefined;
  const km =
    originCoords && destCoords
      ? Math.round(haversineKm(originCoords, destCoords))
      : undefined;

  const durationHours = km != null ? estimateDurationHours(km) : undefined;

  const carriers = parsed.airlines.length
    ? parsed.airlines
    : destAirport
      ? locale === "en"
        ? ["Confirm airline & flight via search links"]
        : ["검색 링크에서 항공사·편명 확인 필요"]
      : [];

  const originLabel = originAirport
    ? airportLabel(originAirport, locale)
    : `${originCity} (${locale === "en" ? "unverified airport" : "공항 미확인"})`;

  const destLabel = destAirport
    ? airportLabel(destAirport as VerifiedAirport, locale)
    : `${destCity} (${locale === "en" ? "unverified airport" : "공항 미확인"})`;

  const whyParts = [
    locale === "en"
      ? `Round-trip estimate for ${originLabel} → ${destLabel}. Only verified IATA airports are shown — no fabricated codes.`
      : `${originLabel} 출발 → ${destLabel} 도착 구간 왕복 요금 추정입니다. IATA 등록 공항만 표시하며 허구 코드는 사용하지 않습니다.`,
    durationHours
      ? locale === "en"
        ? `About ${durationHours} hours including airport time (estimate).`
        : `비행시간 약 ${durationHours}시간(공항 대기 포함 추정) 기준입니다.`
      : "",
    !destAirport
      ? locale === "en"
        ? "Destination airport not in verified list — check Wikivoyage or booking links."
        : "도착지 공항이 등록 목록에 없습니다. Wikivoyage·검색 링크에서 확인하세요."
      : parsed.airlines.length
        ? locale === "en"
          ? `Airlines mentioned on Wikivoyage: ${parsed.airlines.join(", ")}.`
          : `Wikivoyage에 언급된 항공사: ${parsed.airlines.join(", ")}.`
        : locale === "en"
          ? "Segment average, not a specific flight — pick airline and time in search links."
          : "특정 편명이 아닌 구간 평균가이며, 링크에서 실제 항공사·시간대를 선택하세요.",
  ].filter(Boolean);

  return {
    routeLabel: destAirport && originAirport ? `${origin.code} → ${destination.code}` : `${originCity} → ${destCity}`,
    origin,
    destination,
    durationHours,
    carriers,
    whyThisEstimate: whyParts.join(" "),
    wikivoyageNotes: parsed.notes,
    estimate,
    airportVerified: Boolean(originAirport && destAirport),
  };
}

export function formatFlightRange(detail: FlightDetail, locale: Locale = "ko") {
  const e = detail.estimate;
  const loc = locale === "ko" ? "ko-KR" : "en-US";
  const suffix = locale === "ko" ? "원" : "";
  const prefix = locale === "en" ? "₩" : "";
  if (e.low === 0 && e.high === 0) return locale === "ko" ? "0원" : "₩0";
  return `${prefix}${e.low.toLocaleString(loc)}${suffix} ~ ${prefix}${e.high.toLocaleString(loc)}${suffix}`;
}
