import { resolveCityAirport } from "./airports";
import { buildGoogleMapsSearchQuery, sanitizePlaceTitle } from "./placeLinks";
import type { BookingLinkSet, LodgingId } from "./tripTypes";

function encode(value: string) {
  return encodeURIComponent(value.trim());
}

function iataForLinks(city: string) {
  const airport = resolveCityAirport(city);
  return airport?.iata.toLowerCase() ?? encode(city.trim().toLowerCase());
}

export function buildBookingLinks(
  originCity: string,
  destCity: string,
  lodging: LodgingId
): BookingLinkSet {
  const originQuery = encode(originCity);
  const destQuery = encode(destCity);
  const originIata = iataForLinks(originCity);
  const destIata = iataForLinks(destCity);

  const lodgingUrl =
    lodging === "hostel"
      ? `https://www.hostelworld.com/st/hostels/${destQuery}/`
      : lodging === "none"
        ? `https://www.google.com/maps/search/${destQuery}`
        : `https://www.booking.com/searchresults.html?ss=${destQuery}`;

  return {
    flights: `https://www.google.com/travel/flights?q=Flights%20from%20${originQuery}%20to%20${destQuery}`,
    flightsSkyscanner: `https://www.skyscanner.co.kr/transport/flights/${originIata}/${destIata}/`,
    lodging: lodgingUrl,
    restaurants: `https://www.google.com/maps/search/restaurants+in+${destQuery}`,
    maps: `https://www.google.com/maps/search/${destQuery}`,
    osm: `https://www.openstreetmap.org/search?query=${destQuery}`,
    googleHotels: `https://www.google.com/travel/hotels/${destQuery}`,
    kayakFlights: `https://www.kayak.co.kr/flights/${originIata.toUpperCase()}-${destIata.toUpperCase()}/${new Date().toISOString().slice(0, 10)}/${new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}`,
  };
}

export function buildRouteMapUrl(
  city: string,
  stops: Array<{ title: string; lat?: number; lng?: number }>
) {
  if (stops.length >= 2) {
    const path = stops
      .map((stop) => buildGoogleMapsSearchQuery(city, stop.title))
      .join("/");
    return `https://www.google.com/maps/dir/${path}`;
  }
  if (stops.length === 1) {
    const name = sanitizePlaceTitle(stops[0].title);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${city}`)}`;
  }
  return `https://www.google.com/maps/search/${encode(city)}`;
}
