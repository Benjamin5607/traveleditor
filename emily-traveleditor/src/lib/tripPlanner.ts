import { buildBookingLinks, buildRouteMapUrl } from "./bookingLinks";
import { estimateBudget } from "./budget";
import { estimateFlightFromSeoul, flightMidpoint } from "./flightEstimates";
import { fetchLivePlaces, geocodeCity, geocodePlaces } from "./liveTravel";
import { buildOsmDirectionsUrl, buildOsmEmbedUrl } from "./mapUtils";
import { getEmilyTheme } from "./themes";
import type {
  ItineraryBlock,
  ItineraryDay,
  PlaceCandidate,
  TransportId,
  TravelGuidebook,
  TripPreferences,
} from "./tripTypes";
import {
  loadMarketDb,
  loadThemeTravelDb,
  resolvePlaceTitle,
  toPlaceCandidates,
  findCityRecommendations,
} from "./travelData";

type RawItineraryResponse = {
  title?: string;
  summary?: string;
  days?: Array<{
    day?: number;
    label?: string;
    blocks?: Array<{
      time?: string;
      place_id?: string;
      activity?: string;
      transport?: string;
    }>;
  }>;
  tips?: string[];
};

const VALID_TRANSPORTS = new Set<TransportId>(["walk", "bus", "rental_car"]);

type GuidebookCore = Omit<
  TravelGuidebook,
  "budget" | "bookingLinks" | "mapUrl" | "mapEmbedUrl" | "osmDirectionsUrl" | "flightEstimate" | "dataSource"
>;

function fallbackItinerary(prefs: TripPreferences, places: PlaceCandidate[]): GuidebookCore {
  const theme = getEmilyTheme(prefs.theme);
  const days: ItineraryDay[] = [];

  for (let day = 1; day <= prefs.days; day += 1) {
    const place = places[(day - 1) % places.length];
    const blocks: ItineraryBlock[] = place
      ? [
          {
            time: "10:00",
            place_id: place.id,
            place_title: place.title,
            activity: place.angle || place.why || `${theme.name} 테마 체험`,
            transport: prefs.transport,
          },
          {
            time: "15:00",
            place_id: place.id,
            place_title: place.title,
            activity: "주변 산책 및 휴식",
            transport: "walk",
          },
        ]
      : [];

    days.push({
      day,
      label: prefs.nights === 0 ? `${day}일차 (무박)` : `${day}일차`,
      blocks,
    });
  }

  return {
    title: `${prefs.city} ${prefs.days}일 ${theme.name} 가이드`,
    summary: `${prefs.city}에서 ${theme.shortLabel} 중심으로 짜는 ${prefs.days}일 일정입니다. 추천 장소는 수집·무료 API 데이터만 사용했습니다.`,
    days,
    tips: [
      "공식 링크가 없는 장소는 출처 링크에서 운영 정보를 먼저 확인하세요.",
      "예산은 물가 테이블·거리 추정 기준이며 항공권은 검색 링크로 확인하세요.",
    ],
    preferences: prefs,
    places,
  };
}

function sanitizeItinerary(
  raw: RawItineraryResponse,
  prefs: TripPreferences,
  places: PlaceCandidate[]
): GuidebookCore {
  const allowedIds = new Set(places.map((place) => place.id));
  const days: ItineraryDay[] = [];

  for (const rawDay of raw.days ?? []) {
    const dayNumber = Number(rawDay.day) || days.length + 1;
    const blocks: ItineraryBlock[] = [];

    for (const rawBlock of rawDay.blocks ?? []) {
      const placeId = rawBlock.place_id ?? "";
      if (!allowedIds.has(placeId)) continue;

      const transport = VALID_TRANSPORTS.has(rawBlock.transport as TransportId)
        ? (rawBlock.transport as TransportId)
        : prefs.transport;

      blocks.push({
        time: rawBlock.time || "10:00",
        place_id: placeId,
        place_title: resolvePlaceTitle(placeId, places),
        activity: rawBlock.activity || "테마 맞춤 방문",
        transport,
      });
    }

    if (blocks.length > 0) {
      days.push({
        day: dayNumber,
        label: rawDay.label || `${dayNumber}일차`,
        blocks,
      });
    }
  }

  if (days.length === 0) {
    return fallbackItinerary(prefs, places);
  }

  return {
    title: raw.title || `${prefs.city} 여행 가이드북`,
    summary: raw.summary || "수집된 장소만 사용해 짠 일정입니다.",
    days: days.slice(0, prefs.days),
    tips: Array.isArray(raw.tips) && raw.tips.length > 0
      ? raw.tips.map((tip) => String(tip))
      : ["일정은 수집 데이터 기준으로만 구성했습니다."],
    preferences: prefs,
    places,
  };
}

async function buildItineraryWithGroq(
  prefs: TripPreferences,
  places: PlaceCandidate[],
  modelId: string,
  apiKey: string
): Promise<GuidebookCore> {
  const theme = getEmilyTheme(prefs.theme);
  const placePayload = places.map((place) => ({
    id: place.id,
    title: place.title,
    angle: place.angle,
    why: place.why,
    official_url: place.official_url || "",
  }));

  const prompt = `
너는 여행 일정 편집자다. 아래 수집된 장소만 사용해서 JSON 일정을 만들어라.
새 장소명, 새 URL, 새 가격을 만들지 마라.

여행 조건:
- 도시: ${prefs.city}
- 테마: ${prefs.theme} (${theme.shortLabel})
- ${prefs.days}일 ${prefs.nights}박
- 이동: ${prefs.transport}
- 숙박: ${prefs.lodging}
- 예산: ${prefs.budgetKrw.toLocaleString("ko-KR")}원 (참고용, 직접 계산하지 마)

허용 장소 목록:
${JSON.stringify(placePayload, null, 2)}

스키마:
{
  "title": "가이드북 제목",
  "summary": "2문장 요약",
  "days": [
    {
      "day": 1,
      "label": "1일차",
      "blocks": [
        {
          "time": "10:00",
          "place_id": "허용 목록의 id만",
          "activity": "짧은 활동 설명",
          "transport": "walk|bus|rental_car"
        }
      ]
    }
  ],
  "tips": ["짧은 팁"]
}

규칙:
- day는 ${prefs.days}일까지만
- place_id는 허용 목록에 있는 값만
- 무박이면 밤 활동은 과도하게 넣지 마
- 한국어로 작성
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0.15,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return valid JSON only. Never invent places or URLs." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) return fallbackItinerary(prefs, places);
    const parsed = JSON.parse(data.choices[0].message.content) as RawItineraryResponse;
    return sanitizeItinerary(parsed, prefs, places);
  } catch {
    return fallbackItinerary(prefs, places);
  }
}

export async function buildTravelGuidebook(
  prefs: TripPreferences,
  modelId?: string,
  apiKey?: string
): Promise<TravelGuidebook | { error: string }> {
  const key = apiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const useGroq = Boolean(key && modelId);

  const themeDb = await loadThemeTravelDb();
  const marketDb = await loadMarketDb();
  const cityGeo = await geocodeCity(prefs.city);
  const rawItems = findCityRecommendations(themeDb?.themes?.[prefs.theme]?.cities, prefs.city);
  let dataSource: "static" | "live" = "static";
  let places = toPlaceCandidates(prefs.city, rawItems);

  if (places.length === 0) {
    places = await fetchLivePlaces(prefs.city, prefs.theme);
    dataSource = "live";
  }

  if (places.length === 0) {
    return {
      error: `${prefs.city} 여행 정보를 무료 공개 API에서도 찾지 못했어. 도시명을 영문으로 바꿔 다시 시도해줘.`,
    };
  }

  places = await geocodePlaces(prefs.city, places);

  const itineraryCore = useGroq
    ? await buildItineraryWithGroq(prefs, places, modelId!, key!)
    : fallbackItinerary(prefs, places);

  const stopCount = itineraryCore.days.reduce((sum, day) => sum + day.blocks.length, 0);
  const budget = estimateBudget(prefs, marketDb, stopCount, {
    countryCode: cityGeo?.countryCode,
    cityCoords: cityGeo ? { lat: cityGeo.lat, lng: cityGeo.lng } : undefined,
  });
  const bookingLinks = buildBookingLinks(prefs.city, prefs.lodging);
  const mapStops = itineraryCore.days.flatMap((day) =>
    day.blocks.map((block) => {
      const place = places.find((item) => item.id === block.place_id);
      return { title: block.place_title, lat: place?.lat, lng: place?.lng };
    })
  );
  const mapUrl = buildRouteMapUrl(prefs.city, mapStops);
  const cityCenter = cityGeo ? { lat: cityGeo.lat, lng: cityGeo.lng } : undefined;
  const mapEmbedUrl = buildOsmEmbedUrl(mapStops, cityCenter);
  const osmDirectionsUrl = buildOsmDirectionsUrl(mapStops);
  const flightRaw = estimateFlightFromSeoul(
    prefs.city,
    cityGeo ? { lat: cityGeo.lat, lng: cityGeo.lng } : undefined
  );

  const tips = [...itineraryCore.tips];
  if (dataSource === "live") {
    tips.push("수집 JSON이 없어 Wikivoyage·Wikipedia·OSM Overpass·Nominatim 무료 API로 장소를 보강했습니다.");
  }
  if (!useGroq) {
    tips.push("Groq 키 없이 무료 규칙 기반 일정으로 생성했습니다. AI 일정은 Groq 키 설정 시 사용됩니다.");
  }

  return {
    ...itineraryCore,
    tips,
    budget,
    bookingLinks,
    mapUrl,
    mapEmbedUrl,
    osmDirectionsUrl: osmDirectionsUrl || bookingLinks.osm,
    flightEstimate: {
      low: flightRaw.low,
      high: flightRaw.high,
      midpoint: flightMidpoint(flightRaw),
      label: flightRaw.label,
      note: flightRaw.note,
    },
    dataSource,
  };
}
