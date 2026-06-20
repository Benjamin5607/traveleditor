import { estimateFlight, type FlightEstimate } from "./flightEstimates";
import {
  airportDistanceKm,
  airportLabel,
  resolveCityAirportAsync,
  resolveDestinationAirport,
  type VerifiedAirport,
} from "./airports";
import type { Locale } from "./i18n";
import type { MarketDb } from "./travelData";
import { parseFlightInfoFromWikivoyage, type ParsedFlightInfo } from "./wikivoyageParser";
import { geocodeCity } from "./liveTravel";

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

export async function buildFlightDetail(
  originCity: string,
  destCity: string,
  destCoords: { lat: number; lng: number } | undefined,
  market: MarketDb | null,
  wikivoyageExtract?: string,
  locale: Locale = "ko"
): Promise<FlightDetail> {
  const parsed: ParsedFlightInfo = wikivoyageExtract
    ? parseFlightInfoFromWikivoyage(wikivoyageExtract, destCity)
    : { airlines: [], notes: [] };

  const [originAirport, destGeo] = await Promise.all([
    resolveCityAirportAsync(originCity),
    destCoords ? Promise.resolve(null) : geocodeCity(destCity),
  ]);

  const destinationCoords = destCoords ?? (destGeo ? { lat: destGeo.lat, lng: destGeo.lng } : undefined);
  const destAirport = resolveDestinationAirport(
    destCity,
    parsed.destinationAirport,
    destinationCoords
  );

  const origin = originAirport
    ? {
        code: originAirport.iata,
        name: locale === "en" ? originAirport.nameEn : originAirport.nameKo,
        city: originAirport.city,
      }
    : {
        code: "—",
        name: locale === "en" ? "Airport not found" : "공항을 찾지 못함",
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
        name: locale === "en" ? "Airport not found" : "공항을 찾지 못함",
        city: destCity,
      };

  const estimate = estimateFlight(originCity, destCity, destinationCoords, market, locale, {
    originAirport,
    destAirport,
  });

  const originCoords = originAirport ? { lat: originAirport.lat, lng: originAirport.lng } : undefined;
  const destAirportCoords = destAirport ? { lat: destAirport.lat, lng: destAirport.lng } : destinationCoords;
  const km =
    originCoords && destAirportCoords
      ? Math.round(haversineKm(originCoords, destAirportCoords))
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
    : `${originCity} (${locale === "en" ? "airport not found" : "공항 미확인"})`;

  const destLabel = destAirport
    ? airportLabel(destAirport as VerifiedAirport, locale)
    : `${destCity} (${locale === "en" ? "airport not found" : "공항 미확인"})`;

  const destDistNote =
    destAirport && destinationCoords
      ? locale === "en"
        ? ` Nearest airport is ${airportDistanceKm(destAirport, destinationCoords)}km from city center.`
        : ` 도시 중심에서 가장 가까운 공항까지 약 ${airportDistanceKm(destAirport, destinationCoords)}km.`
      : "";

  const whyParts = [
    locale === "en"
      ? `Round-trip estimate for ${originLabel} → ${destLabel}. Nearest verified IATA airport from each city.${destDistNote}`
      : `${originLabel} 출발 → ${destLabel} 도착 구간 왕복 요금 추정입니다. 각 도시에서 가장 가까운 IATA 등록 공항을 사용합니다.${destDistNote}`,
    durationHours
      ? locale === "en"
        ? `About ${durationHours} hours including airport time (estimate).`
        : `비행시간 약 ${durationHours}시간(공항 대기 포함 추정) 기준입니다.`
      : "",
    !destAirport
      ? locale === "en"
        ? "Could not find a verified airport near this destination — check booking links."
        : "도착지 근처 IATA 공항을 찾지 못했습니다. 검색 링크에서 확인하세요."
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
