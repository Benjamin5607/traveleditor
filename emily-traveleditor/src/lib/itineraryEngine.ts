import { getEmilyTheme } from "./themes";
import type { ItineraryBlock, ItineraryDay, PlaceCandidate, TransportId, TripPreferences } from "./tripTypes";

const THEME_SLOTS: Record<string, string[]> = {
  "마음의 평화": ["09:30", "14:00", "16:30"],
  "인생이 무료": ["11:00", "14:30", "17:00"],
  "오늘은 욜로": ["18:00", "21:00", "23:00"],
  "신앙": ["08:30", "11:00", "15:00"],
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

/** 좌표 기반 최근접 이웃 정렬 — 무료 TSP 휴리스틱 */
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

function activityFor(place: PlaceCandidate, theme: string, slot: string) {
  const base = place.angle || place.why || `${theme} 테마 방문`;
  if (slot >= "20:00") return `${base} — 밤 분위기 체험`;
  if (slot <= "09:00") return `${base} — 이른 시간 방문 추천`;
  return base;
}

export type SmartItineraryResult = {
  title: string;
  summary: string;
  days: ItineraryDay[];
  tips: string[];
};

/** Groq 없이도 쓸 수 있는 거리·테마 최적화 일정 엔진 */
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

  for (let day = 1; day <= prefs.days; day += 1) {
    const blocks: ItineraryBlock[] = [];
    let prevCoords = cityCenter;

    for (let slotIdx = 0; slotIdx < perDay && placeIdx < ordered.length; slotIdx += 1) {
      const place = ordered[placeIdx];
      placeIdx += 1;
      const time = slots[slotIdx % slots.length];
      let transport: TransportId = prefs.transport;

      if (prevCoords && place.lat != null && place.lng != null) {
        const dist = haversineKm(prevCoords, { lat: place.lat, lng: place.lng });
        transport = pickTransport(dist, prefs.transport);
      }

      blocks.push({
        time,
        place_id: place.id,
        place_title: place.title,
        activity: activityFor(place, theme.shortLabel, time),
        transport,
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
    summary: `${prefs.city}에서 ${theme.shortLabel} 장소 ${ordered.length}곳을 거리 순으로 배치한 ${prefs.days}일 일정입니다. AI 없이 무료 경로 최적화 엔진으로 생성했습니다.`,
    days,
    tips: [
      "일정은 좌표 기반 최근접 경로 순서로 배치했습니다.",
      "공식 링크가 없는 장소는 출처에서 운영 정보를 확인하세요.",
      "예산·항공은 Wikivoyage 파싱·거리 추정·검색 링크를 함께 참고하세요.",
    ],
  };
}
