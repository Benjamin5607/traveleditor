import { getEmilyTheme } from "./themes";
import type { ItineraryBlock, ItineraryDay, PlaceCandidate, TransportId, TripPreferences } from "./tripTypes";

const THEME_SLOTS: Record<string, string[]> = {
  "마음의 평화": ["09:30", "14:00", "16:30"],
  "인생이 무료": ["11:00", "14:30", "17:00"],
  "오늘은 욜로": ["18:00", "21:00", "23:00"],
  "신앙": ["08:30", "11:00", "15:00"],
};

const THEME_SLOT_REASON: Record<string, string> = {
  "마음의 평화": "차·커피·산책은 한적한 오전·오후가 적합해 이 시간대를 썼습니다.",
  "인생이 무료": "와이너리·브루어리 투어는 점심 이후 운영이 많아 오전·오후·저녁으로 배치했습니다.",
  "오늘은 욜로": "클럽·바는 밤 시간대가 핵심이라 저녁·심야 슬롯을 우선했습니다.",
  "신앙": "사원·성당은 이른 오전·오후에 방문하기 좋아 조용한 시간대를 택했습니다.",
};

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
  const withCoords = places.filter((p) => p.lat != null && p.lng != null) as Array<PlaceCandidate & { lat: number; lng: number }>;
  const without = places.filter((p) => p.lat == null || p.lng == null);
  if (withCoords.length <= 1) return [...withCoords, ...without];

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

  return [...ordered, ...without];
}

function blockRationale(
  place: PlaceCandidate,
  theme: string,
  time: string,
  transport: TransportId,
  distanceKm?: number
) {
  const themeReason = THEME_SLOT_REASON[theme] ?? "테마에 맞는 시간대로 배치했습니다.";
  const placeReason = place.why
    ? `추천 이유: ${place.why.slice(0, 160)}`
    : place.angle
      ? `테마 포인트: ${place.angle}`
      : "수집 데이터에 근거한 후보 장소입니다.";
  const moveReason =
    transport === "walk" && distanceKm != null
      ? `이전 장소에서 약 ${distanceKm.toFixed(1)}km라 도보 이동을 제안합니다.`
      : `이동 수단은 ${transport} 기준입니다.`;
  return `${time} 방문 — ${themeReason} ${placeReason} ${moveReason}`;
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
  const theme = getEmilyTheme(prefs.theme);
  const slots = THEME_SLOTS[prefs.theme] ?? ["10:00", "14:00", "17:00"];
  const ordered = orderPlacesByRoute(places, cityCenter);
  const perDay = Math.min(3, Math.max(1, Math.ceil(ordered.length / prefs.days)));
  const days: ItineraryDay[] = [];
  let placeIdx = 0;

  const itineraryRationale = [
    `「${theme.name}」 테마에 맞는 ${ordered.length}곳을 ${prefs.days}일로 나눴습니다.`,
    THEME_SLOT_REASON[prefs.theme] ?? "",
    ordered.some((p) => p.lat != null)
      ? "장소 순서는 도시 중심에서 가까운 순(최근접 경로)으로 짰습니다 — 불필요한 이동을 줄이기 위함입니다."
      : "좌표가 부족해 수집 순서를 유지했습니다.",
    `하루 ${perDay}곳씩 배치해 ${prefs.nights === 0 ? "무박" : `${prefs.nights}박`} 일정에 맞췄습니다.`,
  ]
    .filter(Boolean)
    .join(" ");

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

      const activity = place.angle || place.why?.slice(0, 80) || `${theme.shortLabel} 테마 체험`;

      blocks.push({
        time,
        place_id: place.id,
        place_title: place.title,
        activity,
        transport,
        rationale: blockRationale(place, prefs.theme, time, transport, distanceKm),
      });

      if (place.lat != null && place.lng != null) {
        prevCoords = { lat: place.lat, lng: place.lng };
      }
    }

    days.push({
      day,
      label: prefs.nights === 0 ? `${day}일차 (무박)` : `${day}일차`,
      blocks,
    });
  }

  return {
    title: `${prefs.city} ${prefs.days}일 ${theme.name} 가이드`,
    summary: `${prefs.city}에서 ${theme.shortLabel} 중심 ${ordered.length}곳을 거리·테마 시간대에 맞춰 배치한 ${prefs.days}일 일정입니다.`,
    itineraryRationale,
    days,
    tips: [
      "각 일정 블록에 ‘왜 이 시간·이 장소인지’ 근거를 붙였습니다.",
      "장소 Google Maps 링크로 위치를 확인한 뒤 방문하세요.",
      "항공·숙소는 구간·숙소명 기준 추정이며, 링크에서 실제 편·객실을 고르세요.",
    ],
  };
}
