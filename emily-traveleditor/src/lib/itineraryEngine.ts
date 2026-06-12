import { getEmilyTheme, localizeTheme } from "./themes";
import { THEME_SLOTS, THEME_SLOT_REASON } from "./themeFilters";
import type { ItineraryBlock, ItineraryDay, PlaceCandidate, TransportId, TripPreferences } from "./tripTypes";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pickTransport(distanceKm: number, pref: TransportId): TransportId {
  if (distanceKm < 1.2) return "walk";
  if (distanceKm < 4 && pref !== "rental_car") return "walk";
  return pref;
}

function orderPlacesByRoute(places: PlaceCandidate[], origin?: { lat: number; lng: number }) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null) as Array<
    PlaceCandidate & { lat: number; lng: number }
  >;
  if (withCoords.length <= 1) return withCoords;

  const ordered: typeof withCoords = [];
  const remaining = [...withCoords];
  let current = origin ?? { lat: remaining[0].lat, lng: remaining[0].lng };

  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const d = haversineKm(current, { lat: remaining[i].lat, lng: remaining[i].lng });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  return ordered;
}

function blockRationale(
  place: PlaceCandidate,
  themeId: string,
  time: string,
  transport: TransportId,
  distanceKm?: number,
  locale: "ko" | "en" = "ko"
) {
  const themeReason = THEME_SLOT_REASON[themeId as keyof typeof THEME_SLOT_REASON]
    ?? (locale === "en" ? "Scheduled for theme-appropriate time." : "테마에 맞는 시간대로 배치했습니다.");
  const placeReason = place.why
    ? locale === "en"
      ? `Why: ${place.why.slice(0, 160)}`
      : `추천 이유: ${place.why.slice(0, 160)}`
    : place.angle
      ? locale === "en"
        ? `Theme: ${place.angle}`
        : `테마 포인트: ${place.angle}`
      : locale === "en"
        ? "Curated from collected data."
        : "수집 데이터에 근거한 후보 장소입니다.";
  const moveReason =
    transport === "walk" && distanceKm != null
      ? locale === "en"
        ? `About ${distanceKm.toFixed(1)}km from previous stop — walk suggested.`
        : `이전 장소에서 약 ${distanceKm.toFixed(1)}km라 도보 이동을 제안합니다.`
      : locale === "en"
        ? `Transport: ${transport}.`
        : `이동 수단은 ${transport} 기준입니다.`;
  return `${time} — ${themeReason} ${placeReason} ${moveReason}`;
}

export type SmartItineraryResult = {
  title: string;
  summary: string;
  itineraryRationale: string;
  days: ItineraryDay[];
  tips: string[];
};

export function buildSmartItinerary(
  prefs: TripPreferences,
  places: PlaceCandidate[],
  cityCenter?: { lat: number; lng: number }
): SmartItineraryResult {
  const themeMeta = getEmilyTheme(prefs.theme);
  const theme = localizeTheme(themeMeta, prefs.locale);
  const slots = THEME_SLOTS[themeMeta.id] ?? ["10:00", "14:00", "17:00"];
  const ordered = orderPlacesByRoute(places, cityCenter);
  const perDay = Math.min(3, Math.max(1, Math.ceil(ordered.length / prefs.days)));
  const days: ItineraryDay[] = [];
  let placeIdx = 0;

  const itineraryRationale = prefs.locale === "en"
    ? [
        `${ordered.length} places for 「${theme.name}」 across ${prefs.days} days.`,
        THEME_SLOT_REASON[themeMeta.id] ?? "",
        ordered.some((p) => p.lat != null)
          ? "Route ordered by nearest-neighbor from city center to reduce travel."
          : "Kept collection order due to missing coordinates.",
        `${perDay} stops per day for ${prefs.nights === 0 ? "day trip" : `${prefs.nights}-night`} plan.`,
      ].filter(Boolean).join(" ")
    : [
        `「${theme.name}」 테마에 맞는 ${ordered.length}곳을 ${prefs.days}일로 나눴습니다.`,
        THEME_SLOT_REASON[themeMeta.id] ?? "",
        ordered.some((p) => p.lat != null)
          ? "장소 순서는 도시 중심에서 가까운 순(최근접 경로)으로 짰습니다."
          : "좌표가 부족해 수집 순서를 유지했습니다.",
        `하루 ${perDay}곳씩 배치해 ${prefs.nights === 0 ? "무박" : `${prefs.nights}박`} 일정에 맞췄습니다.`,
      ].filter(Boolean).join(" ");

  for (let day = 1; day <= prefs.days; day += 1) {
    const blocks: ItineraryBlock[] = [];
    let prevCoords = cityCenter;

    for (let slotIdx = 0; slotIdx < perDay && placeIdx < ordered.length; slotIdx += 1) {
      const place = ordered[placeIdx];
      placeIdx += 1;
      const time = slots[slotIdx % slots.length];
      let transport: TransportId = prefs.transport;
      let distanceKm: number | undefined;

      if (prevCoords && place.lat != null && place.lng != null) {
        distanceKm = haversineKm(prevCoords, { lat: place.lat, lng: place.lng });
        transport = pickTransport(distanceKm, prefs.transport);
      }

      const activity = place.angle || place.why?.slice(0, 80) || `${theme.shortLabel}`;

      blocks.push({
        time,
        place_id: place.id,
        place_title: place.title,
        activity,
        transport,
        rationale: blockRationale(place, themeMeta.id, time, transport, distanceKm, prefs.locale),
      });

      if (place.lat != null && place.lng != null) {
        prevCoords = { lat: place.lat, lng: place.lng };
      }
    }

    const dayLabel = prefs.locale === "en"
      ? prefs.nights === 0 ? `Day ${day}` : `Day ${day}`
      : prefs.nights === 0 ? `${day}일차 (무박)` : `${day}일차`;

    days.push({ day, label: dayLabel, blocks });
  }

  return {
    title: prefs.locale === "en"
      ? `${prefs.city} ${prefs.days}-day ${theme.name} guide`
      : `${prefs.city} ${prefs.days}일 ${theme.name} 가이드`,
    summary: prefs.locale === "en"
      ? `${ordered.length} ${theme.shortLabel} spots across ${prefs.days} days in ${prefs.city}.`
      : `${prefs.city}에서 ${theme.shortLabel} 중심 ${ordered.length}곳을 거리·테마 시간대에 맞춰 배치한 ${prefs.days}일 일정입니다.`,
    itineraryRationale,
    days,
    tips: prefs.locale === "en"
      ? [
          "Each block includes why this time and place were chosen.",
          "Confirm locations via Google Maps links before visiting.",
          "Flights and hotels are estimates — pick actual options in search links.",
        ]
      : [
          "각 일정 블록에 ‘왜 이 시간·이 장소인지’ 근거를 붙였습니다.",
          "장소 Google Maps 링크로 위치를 확인한 뒤 방문하세요.",
          "항공·숙소는 구간·숙소명 기준 추정이며, 링크에서 실제 편·객실을 고르세요.",
        ],
  };
}
