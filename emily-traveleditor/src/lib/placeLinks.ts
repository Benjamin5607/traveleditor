import type { PlaceCandidate } from "./tripTypes";

/** Google Maps 검색용 — Wikivoyage 접두어 등 제거 */
export function sanitizePlaceTitle(title: string) {
  return title
    .replace(/^Wikivoyage:\s*/i, "")
    .replace(/\[.*?\]/g, "")
    .trim();
}

/**
 * Google Maps — 가게명+도시로 검색해 비즈니스 프로필에 연결
 * 좌표만 주면 핀만 찍히고 가게 페이지가 안 뜨는 경우가 많아 이름 우선
 */
export function buildGoogleMapsPlaceUrl(
  city: string,
  place: Pick<PlaceCandidate, "title" | "lat" | "lng">
) {
  const name = sanitizePlaceTitle(place.title);
  const query = encodeURIComponent(`${name}, ${city}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildGoogleMapsSearchQuery(city: string, title: string) {
  return encodeURIComponent(`${sanitizePlaceTitle(title)}, ${city}`);
}

export function enrichPlacesWithMaps(city: string, places: PlaceCandidate[]): PlaceCandidate[] {
  return places.map((place) => ({
    ...place,
    maps_url: buildGoogleMapsPlaceUrl(city, place),
  }));
}
