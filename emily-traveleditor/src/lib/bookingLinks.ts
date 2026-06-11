import type { BookingLinkSet, LodgingId } from "./tripTypes";

function encode(value: string) {
  return encodeURIComponent(value.trim());
}

export function buildBookingLinks(city: string, lodging: LodgingId): BookingLinkSet {
  const cityQuery = encode(city);

  const lodgingUrl =
    lodging === "hostel"
      ? `https://www.hostelworld.com/st/hostels/${cityQuery}/`
      : lodging === "none"
        ? `https://www.google.com/maps/search/${cityQuery}`
        : `https://www.booking.com/searchresults.html?ss=${cityQuery}`;

  return {
    flights: `https://www.google.com/travel/flights?q=Flights%20to%20${cityQuery}`,
    lodging: lodgingUrl,
    restaurants: `https://www.google.com/maps/search/restaurants+in+${cityQuery}`,
    maps: `https://www.google.com/maps/search/${cityQuery}`,
  };
}

export function buildRouteMapUrl(city: string, stops: Array<{ title: string; lat?: number; lng?: number }>) {
  const withCoords = stops.filter((stop) => typeof stop.lat === "number" && typeof stop.lng === "number");
  if (withCoords.length >= 2) {
    const path = withCoords.map((stop) => `${stop.lat},${stop.lng}`).join("/");
    return `https://www.google.com/maps/dir/${path}`;
  }
  if (withCoords.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${withCoords[0].lat},${withCoords[0].lng}`;
  }
  return `https://www.google.com/maps/search/${encode(city)}`;
}
