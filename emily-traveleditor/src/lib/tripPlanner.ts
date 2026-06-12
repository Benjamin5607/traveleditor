import { localizeBudgetTheme } from "./budgetThemes";
import { buildBookingLinks, buildRouteMapUrl } from "./bookingLinks";
import { estimateBudget } from "./budget";
import { buildFlightDetail } from "./flightDetails";
import { flightMidpoint } from "./flightEstimates";
import { buildGuideNarration } from "./guideNarration";
import { buildSmartItinerary } from "./itineraryEngine";
import { buildLodgingRecommendations } from "./lodgingRecommendations";
import { enrichPlacesWithMaps } from "./placeLinks";
import { attachRouteAmenities, dropUnnamedMealBlocks } from "./routeAmenities";
import { attachTransitLegs } from "./transitLegs";
import { applyCostMultipliers } from "./budgetThemes";
import { costsFromCountryCode } from "./liveCost";
import { filterPlacesInMetro } from "./geoFence";
import { filterValidPlaceCandidates, isJunkPlaceTitle } from "./placeTitleFilter";
import { fetchLiveCostHints, fetchLivePlaces, fetchWikivoyageExtract, geocodeCity, geocodePlaces } from "./liveTravel";
import { buildOsmDirectionsUrl, buildOsmEmbedUrl } from "./mapUtils";
import { t } from "./i18n";
import {
  buildQualityWhy,
  isGlobalChain,
  passesQualityGate,
  scorePlaceQuality,
} from "./placeQuality";
import { searchSupplementaryPlaces } from "./openSourceLocalSearch";
import {
  blendPlacePools,
  blendRationale,
  isStrictTheme,
  maxPlacePoolSize,
  minPlacesForTrip,
} from "./themeBlend";
import { filterPlacesForTheme } from "./themeFilters";
import { getEmilyTheme, themeDbKey } from "./themes";
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
  itinerary_rationale?: string;
  days?: Array<{
    day?: number;
    label?: string;
    blocks?: Array<{
      time?: string;
      kind?: string;
      place_id?: string;
      place_title?: string;
      activity?: string;
      transport?: string;
      rationale?: string;
    }>;
  }>;
  tips?: string[];
};

const VALID_TRANSPORTS = new Set<TransportId>(["walk", "bus", "rental_car"]);
const MEAL_PLACE_ID = /^(breakfast|lunch|dinner|cafe):day\d+$/i;

function mealKindFromPlaceId(placeId: string): import("./tripTypes").ItineraryBlockKind | undefined {
  const match = placeId.match(MEAL_PLACE_ID);
  if (!match) return undefined;
  return match[1].toLowerCase() as import("./tripTypes").ItineraryBlockKind;
}

type GuidebookCore = Omit<
  TravelGuidebook,
  | "budget"
  | "bookingLinks"
  | "mapUrl"
  | "mapEmbedUrl"
  | "osmDirectionsUrl"
  | "flightEstimate"
  | "flightDetail"
  | "lodgingRecommendations"
  | "narration"
  | "budgetThemeLabel"
  | "dataSource"
>;

function parsePlaceSource(place: PlaceCandidate): import("./placeQuality").PlaceSource {
  const fromAngle = place.angle?.match(/\[(OSM|NOMINATIM|PHOTON|WIKIDATA|WIKIVOYAGE|WIKIPEDIA)/i)?.[1];
  if (fromAngle) return fromAngle.toLowerCase() as import("./placeQuality").PlaceSource;
  if (place.angle?.match(/Wikivoyage/i) || place.why?.includes("Wikivoyage")) return "wikivoyage";
  if (place.why?.includes("Wikidata")) return "wikidata";
  if (place.why?.includes("Nominatim")) return "nominatim";
  if (place.why?.includes("Photon")) return "photon";
  if (place.why?.includes("OSM")) return "osm";
  return "wikivoyage";
}

function rankPlacesByQuality(
  places: PlaceCandidate[],
  themeId: string,
  locale: "ko" | "en" = "ko"
): PlaceCandidate[] {
  const tid = themeId as import("./themes").ThemeId;
  return places
    .filter((p) => !isGlobalChain(p.title) && !isJunkPlaceTitle(p.title, p.why))
    .map((p) => {
      const source = parsePlaceSource(p);
      const wikivoyageSection = p.angle?.match(/Wikivoyage (See|Do|Eat|Drink|Buy|Sleep)/i)?.[1];
      const score = scorePlaceQuality({
        title: p.title,
        why: p.why ?? p.angle ?? "",
        source,
        themeId: tid,
        wikivoyageSection,
      });
      return {
        ...p,
        qualityScore: score,
        why: p.why ? buildQualityWhy(p.why, score, locale) : p.why,
      };
    })
    .filter((p) =>
      passesQualityGate({
        title: p.title,
        why: p.why ?? "",
        source: parsePlaceSource(p),
        themeId: tid,
        wikivoyageSection: p.angle?.match(/Wikivoyage (See|Do|Eat|Drink|Buy|Sleep)/i)?.[1],
      })
    )
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

function attachBlockRationales(blocks: ItineraryBlock[], places: PlaceCandidate[], theme: string): ItineraryBlock[] {
  return blocks.map((block) => {
    if (block.rationale) return block;
    const place = places.find((p) => p.id === block.place_id);
    const why = place?.why ? `추천 이유: ${place.why.slice(0, 160)}` : place?.angle ?? "수집 데이터 기반 추천 장소";
    return {
      ...block,
      rationale: `${block.time} — ${theme} 테마에 맞춰 선정. ${why}`,
    };
  });
}

function smartItinerary(
  prefs: TripPreferences,
  places: PlaceCandidate[],
  cityCenter?: { lat: number; lng: number },
  poolBlendNote?: string
): GuidebookCore {
  const smart = buildSmartItinerary(prefs, places, cityCenter, poolBlendNote);
  return { ...smart, preferences: prefs, places };
}

function sanitizeItinerary(
  raw: RawItineraryResponse,
  prefs: TripPreferences,
  places: PlaceCandidate[]
): GuidebookCore {
  const allowedIds = new Set(places.map((place) => place.id));
  const days: ItineraryDay[] = [];
  const usedInTrip = new Set<string>();

  for (const rawDay of raw.days ?? []) {
    const dayNumber = Number(rawDay.day) || days.length + 1;
    const blocks: ItineraryBlock[] = [];

    for (const rawBlock of rawDay.blocks ?? []) {
      const placeId = rawBlock.place_id ?? "";
      const mealKind = mealKindFromPlaceId(placeId);
      const isMeal = Boolean(mealKind);
      if (!isMeal && !allowedIds.has(placeId)) continue;
      if (!isMeal && usedInTrip.has(placeId)) continue;

      const transport = VALID_TRANSPORTS.has(rawBlock.transport as TransportId)
        ? (rawBlock.transport as TransportId)
        : prefs.transport;

      if (!isMeal) usedInTrip.add(placeId);

      blocks.push({
        time: rawBlock.time || "10:00",
        kind: mealKind ?? (rawBlock.kind as import("./tripTypes").ItineraryBlockKind | undefined) ?? "attraction",
        place_id: placeId,
        place_title: isMeal
          ? rawBlock.place_title || rawBlock.activity || placeId
          : resolvePlaceTitle(placeId, places),
        activity: rawBlock.activity || (isMeal ? "식사·휴식" : "테마 맞춤 방문"),
        transport,
        rationale: rawBlock.rationale,
      });
    }

    if (blocks.length > 0) {
      days.push({
        day: dayNumber,
        label: rawDay.label || `${dayNumber}일차`,
        blocks: attachBlockRationales(blocks, places, prefs.theme),
      });
    }
  }

  if (days.length === 0) {
    return smartItinerary(prefs, places);
  }

  const theme = getEmilyTheme(prefs.theme);
  return {
    title: raw.title || `${prefs.city} 여행 가이드북`,
    summary: raw.summary || `${prefs.city} ${theme.shortLabel} 테마 일정입니다.`,
    itineraryRationale:
      raw.itinerary_rationale ||
      `AI가 수집된 ${places.length}곳만 사용해 ${prefs.days}일 일정을 구성했습니다. 각 장소는 테마·이동 효율을 기준으로 배치했습니다.`,
    days: days.slice(0, prefs.days),
    tips: Array.isArray(raw.tips) && raw.tips.length > 0
      ? raw.tips.map((tip) => String(tip))
      : ["일정은 수집 데이터에 있는 장소만 사용했습니다."],
    preferences: prefs,
    places,
  };
}

async function buildItineraryWithGroq(
  prefs: TripPreferences,
  places: PlaceCandidate[],
  modelId: string,
  apiKey: string,
  cityCenter?: { lat: number; lng: number }
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

허용 장소 목록:
${JSON.stringify(placePayload, null, 2)}

스키마:
{
  "title": "가이드북 제목",
  "summary": "2문장 요약",
  "itinerary_rationale": "왜 이 순서·시간으로 일정을 짰는지 3~4문장 (테마·이동·테마 시간대 근거)",
  "days": [
    {
      "day": 1,
      "label": "1일차",
      "blocks": [
        {
          "time": "10:00",
          "place_id": "허용 목록의 id만",
          "activity": "짧은 활동 설명",
          "transport": "walk|bus|rental_car",
          "rationale": "왜 이 시간에 이 장소인지 (장소 why 인용)"
        }
      ]
    }
  ],
  "tips": ["짧은 팁"]
}

규칙:
- day는 ${prefs.days}일까지만
- place_id는 허용 목록에 있는 값만 (식사·카페 슬롯은 place_id를 breakfast:day1, lunch:day1, cafe:day1, dinner:day1 형식으로)
- 하루에 최소 6~8블록: 아침 식사 → 관광 → 점심 → 관광 → 카페 → 관광 → 저녁 → (야간 관광 1곳 더)
- 한 날에 관광지 1곳만 넣지 마라. 실제 여행처럼 식사·커피·이동·관광을 번갈아 배치
- 같은 place_id를 여러 날·여러 블록에 반복하지 마라. ${prefs.days}일이면 서로 다른 장소를 골고루 배치
- 테마에 맞는 장소를 우선 쓰되, 목록에 [도시 일반] 태그가 있으면 긴 일정의 나머지 슬롯에 활용해라
- rationale에는 장소 why를 인용해 추천 이유를 써라
- ${prefs.locale === "en" ? "Write in English" : "한국어로 작성"}
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
    if (!response.ok) return smartItinerary(prefs, places, cityCenter);
    const parsed = JSON.parse(data.choices[0].message.content) as RawItineraryResponse;
    return sanitizeItinerary(parsed, prefs, places);
  } catch {
    return smartItinerary(prefs, places, cityCenter);
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
  const voyageExtract = await fetchWikivoyageExtract(prefs.city, cityGeo?.countryCode);
  const themeMeta = getEmilyTheme(prefs.theme);
  const dbKey = themeDbKey(themeMeta);
  const rawItems = findCityRecommendations(themeDb?.themes?.[dbKey]?.cities, prefs.city);
  let dataSource: "static" | "live" = "static";
  let searchSourcesLabel: string | undefined;
  const minPlaces = minPlacesForTrip(prefs.days);
  let places = filterPlacesForTheme(
    rankPlacesByQuality(toPlaceCandidates(prefs.city, rawItems), themeMeta.id, prefs.locale),
    themeMeta.id
  );

  const staticWeak =
    places.length < Math.min(4, minPlaces) || (places[0]?.qualityScore ?? 0) < 55;

  if (places.length === 0 || staticWeak) {
    const live = await fetchLivePlaces(prefs.city, themeMeta.id, cityGeo?.countryCode, prefs.locale);
    const liveRanked = filterPlacesForTheme(
      rankPlacesByQuality(live.places, themeMeta.id, prefs.locale),
      themeMeta.id
    );
    if (liveRanked.length > places.length) {
      const seen = new Set(places.map((p) => p.title.toLowerCase()));
      for (const p of liveRanked) {
        if (!seen.has(p.title.toLowerCase())) {
          places.push(p);
          seen.add(p.title.toLowerCase());
        }
      }
      places.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
      dataSource = "live";
      searchSourcesLabel = live.sourcesLabel;
    } else if (places.length === 0) {
      places = liveRanked;
      dataSource = "live";
      searchSourcesLabel = live.sourcesLabel;
    }
  }

  let themeOnlyCount = places.length;
  if (!isStrictTheme(themeMeta.id) && cityGeo && places.length < minPlaces) {
    const extra = filterPlacesForTheme(
      await searchSupplementaryPlaces({
        city: prefs.city,
        cityGeo,
        countryCode: cityGeo.countryCode,
        voyageExtract: voyageExtract?.extract,
        themeId: themeMeta.id,
        locale: prefs.locale,
      }),
      themeMeta.id
    );
    if (extra.length > 0) {
      places = filterPlacesForTheme(
        blendPlacePools(places, extra, themeMeta.id, minPlaces, prefs.locale),
        themeMeta.id
      );
      if (dataSource === "static") dataSource = "live";
      searchSourcesLabel = searchSourcesLabel
        ? `${searchSourcesLabel} · ${prefs.locale === "en" ? "city highlights" : "도시 명소 보충"}`
        : prefs.locale === "en"
          ? "theme + city highlights"
          : "테마 + 도시 명소 보충";
    }
  }

  places = places.slice(0, maxPlacePoolSize(prefs.days));
  const poolBlendNote = blendRationale(themeMeta.id, prefs.locale, themeOnlyCount, places.length);

  if (!cityGeo) {
    return {
      error: t(prefs.locale, "error.noPlaces", { city: prefs.city }),
    };
  }

  if (places.length === 0) {
    return {
      error: t(prefs.locale, "error.noPlaces", { city: prefs.city }),
    };
  }

  places = enrichPlacesWithMaps(
    prefs.city,
    await geocodePlaces(prefs.city, places, cityGeo)
  );
  places = filterPlacesInMetro(places, prefs.city, cityGeo);
  places = filterValidPlaceCandidates(places, { requireCoords: true });

  if (places.length === 0) {
    return {
      error: t(prefs.locale, "error.noPlaces", { city: prefs.city }),
    };
  }

  const cityCenter = { lat: cityGeo.lat, lng: cityGeo.lng };
  const liveCostHints = await fetchLiveCostHints(prefs.city, marketDb?.rates);
  const hasLiveCosts = Object.keys(liveCostHints).length > 0;

  let itineraryCore = useGroq
    ? await buildItineraryWithGroq(prefs, places, modelId!, key!, cityCenter)
    : smartItinerary(prefs, places, cityCenter, poolBlendNote);

  const daysWithAmenities = dropUnnamedMealBlocks(
    await attachRouteAmenities(
      itineraryCore.days,
      places,
      prefs.city,
      prefs.budgetTheme,
      prefs.locale
    )
  );

  const baseCosts = applyCostMultipliers(
    { ...costsFromCountryCode(cityGeo.countryCode), ...liveCostHints },
    prefs.budgetTheme
  );
  const daysWithTransit = await attachTransitLegs(
    daysWithAmenities,
    places,
    prefs,
    baseCosts.bus_day ?? 12000
  );
  itineraryCore = { ...itineraryCore, days: daysWithTransit };

  const narration = buildGuideNarration(
    prefs,
    places,
    itineraryCore.days,
    cityGeo?.countryCode
  );

  const budgetThemeMeta = localizeBudgetTheme(prefs.budgetTheme, prefs.locale);

  const lodgingRecommendations = buildLodgingRecommendations(
    prefs.city,
    prefs.lodging,
    voyageExtract?.extract,
    prefs.locale
  );

  const flightDetailFull = await buildFlightDetail(
    prefs.originCity,
    prefs.city,
    cityCenter,
    marketDb,
    voyageExtract?.extract,
    prefs.locale
  );

  const stopCount = itineraryCore.days.reduce((sum, day) => sum + day.blocks.length, 0);
  const budget = estimateBudget(prefs, marketDb, stopCount, {
    countryCode: cityGeo?.countryCode,
    cityCoords: cityCenter,
    liveCostHints: hasLiveCosts ? liveCostHints : undefined,
    priceSource: hasLiveCosts
      ? prefs.locale === "en"
        ? "Lodging and meal costs parsed from Wikivoyage text (free estimate)."
        : "숙박·식비는 Wikivoyage 본문에서 무료 파싱한 추정치입니다."
      : undefined,
  });
  const bookingLinks = buildBookingLinks(prefs.originCity, prefs.city, prefs.lodging, {
    originIata: flightDetailFull.origin.code !== "—" ? flightDetailFull.origin.code : undefined,
    destIata: flightDetailFull.destination.code !== "—" ? flightDetailFull.destination.code : undefined,
  });
  const mapStops = itineraryCore.days.flatMap((day) =>
    day.blocks
      .filter((block) => (block.kind ?? "attraction") === "attraction")
      .map((block) => {
        const place = places.find((item) => item.id === block.place_id);
        return { title: block.place_title, lat: place?.lat, lng: place?.lng };
      })
  );
  const mapUrl = buildRouteMapUrl(prefs.city, mapStops);
  const mapEmbedUrl = buildOsmEmbedUrl(mapStops, cityCenter);
  const osmDirectionsUrl = buildOsmDirectionsUrl(mapStops);

  const tips = [...itineraryCore.tips];
  if (dataSource === "live") {
    tips.push(
      searchSourcesLabel
        ? prefs.locale === "en"
          ? `Places via EOSLS: ${searchSourcesLabel}`
          : `로컬 장소 수집 (EOSLS): ${searchSourcesLabel}`
        : prefs.locale === "en"
          ? "Places collected via open-source local search (EOSLS)."
          : "EOSLS 오픈소스 로컬 검색으로 장소를 수집했습니다."
    );
  }
  if (!useGroq) {
    tips.push(
      prefs.locale === "en"
        ? "Free route-optimized itinerary. Add a Groq key for richer AI narration."
        : "무료 경로 최적화 일정 엔진 사용. Groq 키 있으면 AI 일정·근거 문구가 더 풍부해집니다."
    );
  }

  const { estimate: flightRaw, ...flightDetail } = flightDetailFull;

  return {
    ...itineraryCore,
    tips,
    narration,
    budgetThemeLabel: `${budgetThemeMeta.emoji} ${budgetThemeMeta.name}`,
    lodgingRecommendations,
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
    flightDetail,
    dataSource,
    searchSourcesLabel,
  };
}
