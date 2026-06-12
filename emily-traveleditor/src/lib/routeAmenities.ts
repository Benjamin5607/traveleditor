import { buildGoogleMapsPlaceUrl } from "./placeLinks";
import { isFastFood, isGlobalChain } from "./placeQuality";
import { isGenericPlaceName, pickBestOsmName } from "./placeNaming";
import { getBudgetTheme } from "./budgetThemes";
import type { BudgetThemeId, ItineraryBlockKind } from "./tripTypes";
import type { AmenityStop, ItineraryDay, PlaceCandidate } from "./tripTypes";

const OVERPASS = "https://overpass-api.de/api/interpreter";

type OsmElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function queryNearbyAmenities(lat: number, lng: number, radius = 400) {
  const overpass = `[out:json][timeout:12];
(
  node["amenity"~"restaurant|food_court|cafe"](around:${radius},${lat},${lng});
  way["amenity"~"restaurant|food_court|cafe"](around:${radius},${lat},${lng});
  node["amenity"="toilets"]["access"!="private"](around:${radius},${lat},${lng});
);
out center 16;`;

  try {
    const response = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpass)}`,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.elements ?? []) as OsmElement[];
  } catch {
    return [];
  }
}

function classifyAmenity(el: OsmElement): "meal" | "cafe" | "restroom" | null {
  const a = el.tags?.amenity ?? "";
  if (a === "toilets") return "restroom";
  if (a === "cafe") return "cafe";
  if (/restaurant|food_court/.test(a)) return "meal";
  return null;
}

function isQualityMealOrCafe(el: OsmElement): boolean {
  const name = pickBestOsmName(el.tags ?? {});
  if (!name || name.length < 2 || isGenericPlaceName(name, el.tags)) return false;
  if (isGlobalChain(name, el.tags)) return false;
  if (isFastFood(el.tags)) return false;
  const kind = classifyAmenity(el);
  if (kind === "meal" && !el.tags?.cuisine && el.tags?.amenity === "restaurant") {
    return false;
  }
  return true;
}

function elementCoords(el: OsmElement) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lng: lon };
}

function amenityWhy(kind: AmenityStop["kind"], budgetTheme: BudgetThemeId, name: string) {
  const theme = getBudgetTheme(budgetTheme);
  if (kind === "meal") return `${theme.mealGuide} 근처 로컬 식당 '${name}' (체인·패스트푸드 제외).`;
  if (kind === "cafe") return `이동 전후 휴식용. 루트 인근 로컬 카페 '${name}'.`;
  return `${theme.restroomGuide} '${name || "공중화장실"}' — OSM 공개 데이터.`;
}

function amenityTip(kind: AmenityStop["kind"], budgetTheme: BudgetThemeId) {
  if (kind === "restroom") return "카페 미이용 시 역·백화점 화장실도 대안입니다.";
  if (kind === "meal" && budgetTheme === "miser_backpack") return "점심 특선·세트 메뉴 가격을 먼저 확인하세요.";
  if (kind === "meal" && budgetTheme === "yolo_luxury") return "인기 시간대면 예약 또는 웨이팅을 감안하세요.";
  return "Google Maps에서 영업시간·리뷰를 확인한 뒤 방문하세요.";
}

const VENUE_SEARCH_RADII = [500, 800, 1200];

async function queryVenueWithRadii(
  lat: number,
  lng: number,
  want: "meal" | "cafe",
  seen: Set<string>
): Promise<{ name: string; lat: number; lng: number } | null> {
  for (const radius of VENUE_SEARCH_RADII) {
    const elements = await queryNearbyAmenities(lat, lng, radius);
    for (const el of elements) {
      const kind = classifyAmenity(el);
      if (kind !== want) continue;
      if (!isQualityMealOrCafe(el)) continue;
      const name = pickBestOsmName(el.tags ?? {});
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      const coords = elementCoords(el);
      if (!coords) continue;
      seen.add(key);
      return { name, ...coords };
    }
  }
  return null;
}

function mealActivity(kind: ItineraryBlockKind, venueName: string, locale: "ko" | "en") {
  if (locale === "en") {
    if (kind === "breakfast") return `Breakfast at ${venueName}`;
    if (kind === "lunch") return `Lunch at ${venueName}`;
    if (kind === "dinner") return `Dinner at ${venueName}`;
    return `Coffee break at ${venueName}`;
  }
  if (kind === "breakfast") return `${venueName}에서 아침 식사`;
  if (kind === "lunch") return `${venueName}에서 점심 식사`;
  if (kind === "dinner") return `${venueName}에서 저녁 식사`;
  return `${venueName}에서 커피·디저트`;
}

export function isMealBlockKind(kind?: ItineraryBlockKind): boolean {
  return kind === "breakfast" || kind === "lunch" || kind === "dinner" || kind === "cafe";
}

/** 상호명 없는 식사·카페 블록 제거 */
export function dropUnnamedMealBlocks(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((day) => ({
    ...day,
    blocks: day.blocks.filter((block) => {
      if (!isMealBlockKind(block.kind)) return true;
      const title = block.place_title?.trim() ?? "";
      return title.length >= 2 && !isGenericPlaceName(title);
    }),
  }));
}

function mealKindToOsm(want: ItineraryBlockKind): "meal" | "cafe" | null {
  if (want === "breakfast" || want === "lunch" || want === "dinner") return "meal";
  if (want === "cafe") return "cafe";
  return null;
}

export async function attachRouteAmenities(
  days: ItineraryDay[],
  places: PlaceCandidate[],
  city: string,
  budgetTheme: BudgetThemeId,
  locale: "ko" | "en" = "ko"
): Promise<ItineraryDay[]> {
  const enriched: ItineraryDay[] = [];
  const seenVenues = new Set<string>();
  let lastCoords: { lat: number; lng: number } | undefined;

  for (const place of places) {
    if (place.lat != null && place.lng != null) {
      lastCoords = { lat: place.lat, lng: place.lng };
      break;
    }
  }

  for (const day of days) {
    const blocks = [];

    for (const block of day.blocks) {
      const kind = block.kind ?? "attraction";
      let nextBlock = { ...block };

      if (kind === "attraction") {
        const place = places.find((p) => p.id === block.place_id);
        if (place?.lat != null && place?.lng != null) {
          lastCoords = { lat: place.lat, lng: place.lng };
          const elements = await queryNearbyAmenities(place.lat, place.lng);
          const restrooms = elements.filter((el) => classifyAmenity(el) === "restroom");
          const amenities: AmenityStop[] = [];

          for (const el of restrooms) {
            const name = pickBestOsmName(el.tags ?? {});
            if (!name || isGenericPlaceName(name, el.tags)) continue;
            const coords = elementCoords(el);
            amenities.push({
              kind: "restroom",
              name,
              why: amenityWhy("restroom", budgetTheme, name),
              tip: amenityTip("restroom", budgetTheme),
              mapsUrl: buildGoogleMapsPlaceUrl(city, {
                title: name,
                lat: coords?.lat,
                lng: coords?.lng,
              }),
              source: "osm",
            });
            break;
          }

          if (amenities.length) nextBlock = { ...nextBlock, amenities };
        }
      } else if (lastCoords && isMealBlockKind(kind)) {
        const osmWant = mealKindToOsm(kind);
        if (osmWant) {
          const venue = await queryVenueWithRadii(lastCoords.lat, lastCoords.lng, osmWant, seenVenues);
          if (venue) {
            nextBlock = {
              ...nextBlock,
              place_title: venue.name,
              activity: mealActivity(kind, venue.name, locale),
              lat: venue.lat,
              lng: venue.lng,
              maps_url: buildGoogleMapsPlaceUrl(city, {
                title: venue.name,
                lat: venue.lat,
                lng: venue.lng,
              }),
              rationale:
                locale === "en"
                  ? `Registered business name '${venue.name}' from OSM — chains, fast food, and unnamed venues excluded.`
                  : `OSM 공개 데이터에 등록된 실제 상호명 '${venue.name}' — 체인·패스트푸드·무기명 식당 제외.`,
            };
            lastCoords = { lat: venue.lat, lng: venue.lng };
          }
        }
      }

      blocks.push(nextBlock);
    }

    enriched.push({ ...day, blocks });
  }

  return enriched;
}
