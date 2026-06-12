import { buildGoogleMapsPlaceUrl } from "./placeLinks";
import { getBudgetTheme } from "./budgetThemes";
import type { BudgetThemeId } from "./tripTypes";
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

async function queryNearbyAmenities(lat: number, lng: number, radius = 350) {
  const overpass = `[out:json][timeout:12];
(
  node["amenity"~"restaurant|fast_food|cafe|food_court"](around:${radius},${lat},${lng});
  node["amenity"="toilets"](around:${radius},${lat},${lng});
  node["amenity"="toilets"]["access"!="private"](around:${radius},${lat},${lng});
);
out center 8;`;

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

function classifyAmenity(el: OsmElement): AmenityStop["kind"] | null {
  const a = el.tags?.amenity ?? "";
  if (a === "toilets") return "restroom";
  if (a === "cafe") return "cafe";
  if (/restaurant|fast_food|food_court/.test(a)) return "meal";
  return null;
}

function amenityWhy(kind: AmenityStop["kind"], budgetTheme: BudgetThemeId, name: string) {
  const theme = getBudgetTheme(budgetTheme);
  if (kind === "meal") return `${theme.mealGuide} OSM에 등록된 '${name}'이 근처에 있습니다.`;
  if (kind === "cafe") return `이동 전후 휴식용. ${theme.narrationTone} 기준으로 루트 인근 카페입니다.`;
  return `${theme.restroomGuide} '${name || "공중화장실"}' — OSM 공개 데이터.`;
}

function amenityTip(kind: AmenityStop["kind"], budgetTheme: BudgetThemeId) {
  if (kind === "restroom") return "카페 미이용 시 역·백화점 화장실도 대안입니다.";
  if (kind === "meal" && budgetTheme === "miser_backpack") return "점심 특선·세트 메뉴 가격을 먼저 확인하세요.";
  if (kind === "meal" && budgetTheme === "yolo_luxury") return "인기 시간대면 예약 또는 웨이팅을 감안하세요.";
  return "Google Maps에서 영업시간·리뷰를 확인한 뒤 방문하세요.";
}

function pickAmenities(elements: OsmElement[], budgetTheme: BudgetThemeId, city: string): AmenityStop[] {
  const stops: AmenityStop[] = [];
  const seen = new Set<string>();

  const order: AmenityStop["kind"][] =
    budgetTheme === "yolo_luxury" ? ["meal", "cafe", "restroom"] : ["restroom", "meal", "cafe"];

  for (const kind of order) {
    for (const el of elements) {
      if (classifyAmenity(el) !== kind) continue;
      const name = el.tags?.name ?? (kind === "restroom" ? "공중화장실" : "이름 미등록");
      const key = `${kind}:${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      stops.push({
        kind,
        name,
        why: amenityWhy(kind, budgetTheme, name),
        tip: amenityTip(kind, budgetTheme),
        mapsUrl: buildGoogleMapsPlaceUrl(city, {
          title: name,
          lat: typeof lat === "number" ? lat : undefined,
          lng: typeof lon === "number" ? lon : undefined,
        }),
        source: "osm",
      });
      break;
    }
  }
  return stops;
}

/** 일정 블록마다 식사·카페·화장실 휴게를 OSM으로 보강 */
export async function attachRouteAmenities(
  days: ItineraryDay[],
  places: PlaceCandidate[],
  city: string,
  budgetTheme: BudgetThemeId
): Promise<ItineraryDay[]> {
  const enriched: ItineraryDay[] = [];

  for (const day of days) {
    const blocks = [];
    for (const block of day.blocks) {
      const place = places.find((p) => p.id === block.place_id);
      let amenities: AmenityStop[] = [];

      if (place?.lat != null && place?.lng != null) {
        const elements = await queryNearbyAmenities(place.lat, place.lng);
        amenities = pickAmenities(elements, budgetTheme, city);
      }

      blocks.push({ ...block, amenities });
    }
    enriched.push({ ...day, blocks });
  }

  return enriched;
}
