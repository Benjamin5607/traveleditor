import type { GeoResult } from "./geoTypes";
import type { PlaceCandidate } from "./tripTypes";

/** 도시 중심에서 허용할 최대 거리(km) — 일정에 넣을 수 있는 '도시 여행' 반경 */
const METRO_RADIUS_KM: Record<string, number> = {
  tokyo: 40,
  osaka: 35,
  kyoto: 30,
  seoul: 35,
  busan: 30,
  bangkok: 40,
  singapore: 25,
  london: 35,
  paris: 35,
  newyork: 40,
  losangeles: 45,
};

const DEFAULT_METRO_RADIUS_KM = 32;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function normalizeCityKey(city: string) {
  return city.trim().toLowerCase().replace(/[\s_-]/g, "");
}

/** bbox 대각선(km) — 너무 크면(도쿄도 전체·오가사와라 등) 중심 반경만 사용 */
function bboxDiagonalKm(bb: [number, number, number, number]): number {
  const [south, north, west, east] = bb;
  return haversineKm({ lat: south, lng: west }, { lat: north, lng: east });
}

export function metroRadiusKm(city: string, cityGeo: GeoResult): number {
  const key = normalizeCityKey(city);
  const preset = METRO_RADIUS_KM[key];
  if (preset) return preset;

  if (cityGeo.boundingBox) {
    const diag = bboxDiagonalKm(cityGeo.boundingBox);
    if (diag > 70) return DEFAULT_METRO_RADIUS_KM;
    return Math.min(45, Math.max(20, diag / 2.2));
  }
  return DEFAULT_METRO_RADIUS_KM;
}

export function isWithinMetro(
  lat: number,
  lng: number,
  city: string,
  cityGeo: GeoResult
): boolean {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  const radius = metroRadiusKm(city, cityGeo);
  const dist = haversineKm({ lat: cityGeo.lat, lng: cityGeo.lng }, { lat, lng });
  return dist <= radius;
}

/** Overpass/Nominatim용 — 도시 중심 기준 타이트 bbox (위키 bbox 오염 방지) */
export function metroBoundingBox(
  city: string,
  cityGeo: GeoResult
): [number, number, number, number] {
  const radiusKm = metroRadiusKm(city, cityGeo);
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((cityGeo.lat * Math.PI) / 180));
  return [
    cityGeo.lat - latDelta,
    cityGeo.lat + latDelta,
    cityGeo.lng - lngDelta,
    cityGeo.lng + lngDelta,
  ];
}

export function overpassBboxString(city: string, cityGeo: GeoResult): string {
  const [south, north, west, east] = metroBoundingBox(city, cityGeo);
  return `${south},${west},${north},${east}`;
}

export function filterPlacesInMetro(
  places: PlaceCandidate[],
  city: string,
  cityGeo: GeoResult
): PlaceCandidate[] {
  return places.filter((p) => {
    if (p.lat == null || p.lng == null) return true;
    return isWithinMetro(p.lat, p.lng, city, cityGeo);
  });
}

export function rejectDistantCoords(
  lat: number,
  lng: number,
  city: string,
  cityGeo: GeoResult
): boolean {
  return !isWithinMetro(lat, lng, city, cityGeo);
}
