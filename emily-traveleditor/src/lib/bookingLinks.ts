import type { BookingLinkSet, LodgingId } from "./tripTypes";

function encode(value: string) {
  return encodeURIComponent(value.trim());
}

function cityToIata(city: string) {
  const map: Record<string, string> = {
    seoul: "icn",
    tokyo: "tyo",
    london: "lon",
    paris: "par",
    danang: "dad",
    bangkok: "bkk",
    singapore: "sin",
    taipei: "tpe",
    osaka: "osa",
    barcelona: "bcn",
    rome: "rom",
    berlin: "ber",
  };
  return map[city.trim().toLowerCase().replace(/[\s-]/g, "")] ?? encodeURIComponent(city.trim().toLowerCase());
}

export function buildBookingLinks(city: string, lodging: LodgingId): BookingLinkSet {
  const cityQuery = encode(city);
  const dest = cityToIata(city);

  const lodgingUrl =
    lodging === "hostel"
      ? `https://www.hostelworld.com/st/hostels/${cityQuery}/`
      : lodging === "none"
        ? `https://www.google.com/maps/search/${cityQuery}`
        : `https://www.booking.com/searchresults.html?ss=${cityQuery}`;

  return {
    flights: `https://www.google.com/travel/flights?q=Flights%20from%20Seoul%20to%20${cityQuery}`,
    flightsSkyscanner: `https://www.skyscanner.co.kr/transport/flights/icn/${dest}/`,
    lodging: lodgingUrl,
    restaurants: `https://www.google.com/maps/search/restaurants+in+${cityQuery}`,
    maps: `https://www.google.com/maps/search/${cityQuery}`,
    osm: `https://www.openstreetmap.org/search?query=${cityQuery}`,
    googleHotels: `https://www.google.com/travel/hotels/${cityQuery}`,
    kayakFlights: `https://www.kayak.co.kr/flights/SEL-${dest}/${new Date().toISOString().slice(0, 10)}/${new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}`,
  };
}

export function buildRouteMapUrl(
  city: string,
  stops: Array<{ title: string; lat?: number; lng?: number }>
) {
  const withCoords = stops.filter((stop) => typeof stop.lat === "number" && typeof stop.lng === "number");
  if (withCoords.length >= 2) {
    const path = withCoords.map((stop) => `${stop.lat},${stop.lng}`).join("/");
    return `https://www.google.com/maps/dir/${path}`;
  }
  if (withCoords.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${withCoords[0].lat},${withCoords[0].lng}`;
  }
  if (stops.length >= 2) {
    const path = stops.map((stop) => encodeURIComponent(`${stop.title}, ${city}`)).join("/");
    return `https://www.google.com/maps/dir/${path}`;
  }
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stops[0].title}, ${city}`)}`;
  }
  return `https://www.google.com/maps/search/${encode(city)}`;
}
