import type { PlaceCandidate } from "./tripTypes";

export function buildGoogleMapsPlaceUrl(city: string, place: Pick<PlaceCandidate, "title" | "lat" | "lng">) {
  if (place.lat != null && place.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.title}, ${city}`)}`;
}

export function enrichPlacesWithMaps(city: string, places: PlaceCandidate[]): PlaceCandidate[] {
  return places.map((place) => ({
    ...place,
    maps_url: buildGoogleMapsPlaceUrl(city, place),
  }));
}
