import { getEmilyTheme, localizeTheme, type ThemeId } from "./themes";
import { THEME_SLOT_REASON } from "./themeFilters";
import type {
  ItineraryBlock,
  ItineraryBlockKind,
  ItineraryDay,
  PlaceCandidate,
  TransportId,
  TripPreferences,
} from "./tripTypes";

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

  const withoutCoords = places.filter((p) => p.lat == null || p.lng == null);
  return [...ordered, ...withoutCoords];
}

type DaySlot = { time: string; kind: ItineraryBlockKind };

/** 하루 일과 — 식사·커피·관광을 번갈아 배치 */
function buildDayFlow(themeId: ThemeId, locale: "ko" | "en"): DaySlot[] {
  if (themeId === "yolo_night") {
    return locale === "en"
      ? [
          { time: "11:30", kind: "lunch" },
          { time: "13:00", kind: "attraction" },
          { time: "15:00", kind: "cafe" },
          { time: "16:30", kind: "attraction" },
          { time: "18:30", kind: "dinner" },
          { time: "20:30", kind: "attraction" },
          { time: "22:30", kind: "attraction" },
        ]
      : [
          { time: "11:30", kind: "lunch" },
          { time: "13:00", kind: "attraction" },
          { time: "15:00", kind: "cafe" },
          { time: "16:30", kind: "attraction" },
          { time: "18:30", kind: "dinner" },
          { time: "20:30", kind: "attraction" },
          { time: "22:30", kind: "attraction" },
        ];
  }

  if (themeId === "food_market") {
    return [
      { time: "08:30", kind: "breakfast" },
      { time: "10:00", kind: "attraction" },
      { time: "12:00", kind: "lunch" },
      { time: "13:30", kind: "attraction" },
      { time: "15:00", kind: "cafe" },
      { time: "16:30", kind: "attraction" },
      { time: "18:30", kind: "dinner" },
      { time: "20:00", kind: "attraction" },
    ];
  }

  return [
    { time: "08:30", kind: "breakfast" },
    { time: "10:00", kind: "attraction" },
    { time: "12:30", kind: "lunch" },
    { time: "14:00", kind: "attraction" },
    { time: "15:30", kind: "cafe" },
    { time: "16:30", kind: "attraction" },
    { time: "18:30", kind: "dinner" },
    { time: "20:00", kind: "attraction" },
  ];
}

function mealCopy(
  kind: Exclude<ItineraryBlockKind, "attraction">,
  locale: "ko" | "en",
  city: string
): { title: string; activity: string; rationale: string } {
  const copy = {
    breakfast: {
      ko: {
        title: "아침 식사",
        activity: "근처 로컬 식당·카페에서 아침",
        rationale: "하루를 시작하기 전 가볍게 식사합니다. 숙소·첫 장소 근처에서 해결하세요.",
      },
      en: {
        title: "Breakfast",
        activity: "Local breakfast near your stay or first stop",
        rationale: "Fuel up before the first attraction — pick somewhere near your hotel or route.",
      },
    },
    lunch: {
      ko: {
        title: "점심 식사",
        activity: "오전 일정 후 근처에서 점심",
        rationale: "오전 관광 후 이동 거리를 줄이기 위해 다음 장소 인근에서 식사합니다.",
      },
      en: {
        title: "Lunch",
        activity: "Lunch break after the morning stop",
        rationale: "Eat near your route to avoid backtracking after the morning visit.",
      },
    },
    dinner: {
      ko: {
        title: "저녁 식사",
        activity: "하루 일정 중 저녁 식사",
        rationale: "저녁은 당일 마지막 관광지·숙소 방향의 맛집을 고르세요.",
      },
      en: {
        title: "Dinner",
        activity: "Evening meal between afternoon and night plans",
        rationale: "Pick a spot toward your last stop or lodging for the night.",
      },
    },
    cafe: {
      ko: {
        title: "커피·디저트 휴식",
        activity: "카페에서 잠깐 쉬어가기",
        rationale: "오후 이동 전 컨디션 회복용 짧은 휴식입니다.",
      },
      en: {
        title: "Coffee break",
        activity: "Short cafe stop between sights",
        rationale: "A quick rest before the next stop — check hours on Maps.",
      },
    },
  } as const;

  const c = copy[kind][locale];
  return {
    title: c.title,
    activity: c.activity,
    rationale: `${c.rationale} (${city})`,
  };
}

function blockRationale(
  place: PlaceCandidate,
  themeId: string,
  time: string,
  transport: TransportId,
  distanceKm: number | undefined,
  locale: "ko" | "en"
) {
  const themeReason =
    THEME_SLOT_REASON[themeId as ThemeId] ??
    (locale === "en" ? "Scheduled for theme-appropriate time." : "테마에 맞는 시간대로 배치했습니다.");
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
  cityCenter?: { lat: number; lng: number },
  poolBlendNote?: string
): SmartItineraryResult {
  const themeMeta = getEmilyTheme(prefs.theme);
  const theme = localizeTheme(themeMeta, prefs.locale);
  const dayFlow = buildDayFlow(themeMeta.id, prefs.locale);
  const attractionSlotsPerDay = dayFlow.filter((s) => s.kind === "attraction").length;
  const ordered = orderPlacesByRoute(places, cityCenter);
  const days: ItineraryDay[] = [];
  let placeIdx = 0;
  const usedPlaceIds = new Set<string>();

  const attractionsPerDay = Math.min(
    attractionSlotsPerDay,
    Math.max(2, Math.ceil(ordered.length / prefs.days))
  );

  const itineraryRationale =
    prefs.locale === "en"
      ? [
          `${ordered.length} sights for 「${theme.name}」 across ${prefs.days} days.`,
          THEME_SLOT_REASON[themeMeta.id] ?? "",
          "Each day includes breakfast, lunch, dinner, a cafe break, and multiple sights — like a real trip.",
          ordered.some((p) => p.lat != null)
            ? "Sight order follows nearest-neighbor routing from the city center."
            : "Sight order follows collection order where coordinates were missing.",
          poolBlendNote,
          "Each sight is used at most once — no repeating the same place across days.",
        ]
          .filter(Boolean)
          .join(" ")
      : [
          `「${theme.name}」 테마를 중심으로 ${ordered.length}곳을 ${prefs.days}일에 배치했습니다.`,
          THEME_SLOT_REASON[themeMeta.id] ?? "",
          "테마는 우선순위이지 유일한 선택이 아닙니다 — 긴 일정에는 도시 대표 명소도 섞었습니다.",
          "하루에 아침·점심·저녁·커피 휴식과 관광 2~4곳을 번갈아 넣었습니다.",
          ordered.some((p) => p.lat != null)
            ? "관광지 순서는 도시 중심에서 가까운 순(최근접 경로)입니다."
            : "좌표가 부족한 장소는 수집 순서를 유지했습니다.",
          poolBlendNote,
          "같은 장소는 하루·여러 날에 반복하지 않습니다.",
        ]
          .filter(Boolean)
          .join(" ");

  for (let day = 1; day <= prefs.days; day += 1) {
    const blocks: ItineraryBlock[] = [];
    let prevCoords = cityCenter;
    let attractionsToday = 0;

    for (const slot of dayFlow) {
      if (slot.kind === "attraction") {
        if (attractionsToday >= attractionsPerDay) {
          continue;
        }

        while (placeIdx < ordered.length && usedPlaceIds.has(ordered[placeIdx].id)) {
          placeIdx += 1;
        }
        if (placeIdx >= ordered.length) {
          continue;
        }

        const place = ordered[placeIdx];
        usedPlaceIds.add(place.id);
        placeIdx += 1;
        attractionsToday += 1;

        let transport: TransportId = prefs.transport;
        let distanceKm: number | undefined;

        if (prevCoords && place.lat != null && place.lng != null) {
          distanceKm = haversineKm(prevCoords, { lat: place.lat, lng: place.lng });
          transport = pickTransport(distanceKm, prefs.transport);
        }

        const activity = place.angle || place.why?.slice(0, 80) || theme.shortLabel;

        blocks.push({
          time: slot.time,
          kind: "attraction",
          place_id: place.id,
          place_title: place.title,
          activity,
          transport,
          rationale: blockRationale(
            place,
            themeMeta.id,
            slot.time,
            transport,
            distanceKm,
            prefs.locale
          ),
        });

        if (place.lat != null && place.lng != null) {
          prevCoords = { lat: place.lat, lng: place.lng };
        }
        continue;
      }

      const meal = mealCopy(slot.kind, prefs.locale, prefs.city);
      blocks.push({
        time: slot.time,
        kind: slot.kind,
        place_id: `${slot.kind}:day${day}`,
        place_title: meal.title,
        activity: meal.activity,
        transport: prevCoords ? prefs.transport : "walk",
        rationale: meal.rationale,
      });
    }

    const dayLabel =
      prefs.locale === "en"
        ? `Day ${day}`
        : prefs.nights === 0
          ? `${day}일차 (무박)`
          : `${day}일차`;

    days.push({ day, label: dayLabel, blocks });
  }

  return {
    title:
      prefs.locale === "en"
        ? `${prefs.city} ${prefs.days}-day ${theme.name} guide`
        : `${prefs.city} ${prefs.days}일 ${theme.name} 가이드`,
    summary:
      prefs.locale === "en"
        ? `${ordered.length} ${theme.shortLabel} spots with meals and cafe breaks across ${prefs.days} days in ${prefs.city}.`
        : `${prefs.city}에서 식사·커피 휴식과 함께 ${theme.shortLabel} ${ordered.length}곳을 돌아보는 ${prefs.days}일 일정입니다.`,
    itineraryRationale,
    days,
    tips:
      prefs.locale === "en"
        ? [
            "Each day mixes meals, cafe breaks, and multiple sights — not one stop per day.",
            "Meal stops will be filled with nearby local spots from OSM when possible.",
            "Confirm all locations via Google Maps before visiting.",
          ]
        : [
            "하루에 한 곳만 가는 게 아니라 아침·점심·저녁·커피와 관광을 섞었습니다.",
            "식사·카페는 가능하면 OSM 근처 로컬 맛집으로 채웁니다.",
            "방문 전 Google Maps에서 영업시간·위치를 꼭 확인하세요.",
          ],
  };
}
