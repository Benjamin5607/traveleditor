import { pickBestOsmName } from "./placeNaming";
import type { ItineraryBlock, ItineraryDay, PlaceCandidate, TransitLeg, TripPreferences } from "./tripTypes";

const OVERPASS = "https://overpass-api.de/api/interpreter";

type Coords = { lat: number; lng: number };

type OsmStop = {
  name: string;
  lat: number;
  lng: number;
  mode: TransitLeg["mode"];
  line?: string;
};

type OsmElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function haversineKm(a: Coords, b: Coords) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function elementCoords(el: OsmElement): Coords | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lng: lon };
}

function classifyStopMode(tags: Record<string, string>): TransitLeg["mode"] | null {
  if (tags.railway === "station" || tags.railway === "halt") {
    if (tags.station === "subway" || tags.subway === "yes") return "subway";
    if (tags.light_rail === "yes" || tags.tram === "yes") return "tram";
    return "train";
  }
  if (tags.station === "subway" || tags.subway === "yes" || tags.railway === "subway_entrance") {
    return "subway";
  }
  if (tags.railway === "tram_stop" || tags.tram === "yes") return "tram";
  if (tags.highway === "bus_stop" || tags.bus === "yes" || tags.public_transport === "stop_position") {
    return "bus";
  }
  return null;
}

function stopLine(tags: Record<string, string>): string | undefined {
  const ref = tags.ref || tags["route_ref"] || tags["network:en"] || tags.network;
  return ref?.trim() || undefined;
}

async function queryTransitStops(lat: number, lng: number, radius = 700): Promise<OsmStop[]> {
  const overpass = `[out:json][timeout:12];
(
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["public_transport"="stop_position"](around:${radius},${lat},${lng});
  node["railway"="station"](around:${radius},${lat},${lng});
  node["railway"="halt"](around:${radius},${lat},${lng});
  node["railway"="subway_entrance"](around:${radius},${lat},${lng});
  node["railway"="tram_stop"](around:${radius},${lat},${lng});
);
out body 20;`;

  try {
    const response = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpass)}`,
    });
    if (!response.ok) return [];
    const data = await response.json();
    const stops: OsmStop[] = [];
    const seen = new Set<string>();

    for (const el of (data.elements ?? []) as OsmElement[]) {
      const tags = el.tags ?? {};
      const mode = classifyStopMode(tags);
      if (!mode) continue;
      const name = pickBestOsmName(tags);
      if (!name) continue;
      const coords = elementCoords(el);
      if (!coords) continue;
      const key = `${name.toLowerCase()}@${coords.lat.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      stops.push({ name, ...coords, mode, line: stopLine(tags) });
    }
    return stops;
  } catch {
    return [];
  }
}

function nearestStop(stops: OsmStop[], point: Coords): OsmStop | null {
  let best: OsmStop | null = null;
  let bestDist = Infinity;
  for (const stop of stops) {
    const d = haversineKm(point, { lat: stop.lat, lng: stop.lng });
    if (d < bestDist) {
      bestDist = d;
      best = stop;
    }
  }
  return best;
}

function rideSpeedKmh(mode: TransitLeg["mode"]) {
  if (mode === "subway") return 32;
  if (mode === "train") return 45;
  if (mode === "tram") return 22;
  return 18;
}

function modeLabel(mode: TransitLeg["mode"], locale: "ko" | "en") {
  if (locale === "en") {
    if (mode === "subway") return "subway";
    if (mode === "train") return "train";
    if (mode === "tram") return "tram";
    return "bus";
  }
  if (mode === "subway") return "지하철";
  if (mode === "train") return "기차·전철";
  if (mode === "tram") return "트램";
  return "버스";
}

function estimateRideFare(busDayKrw: number, mode: TransitLeg["mode"], distanceKm: number): number {
  const perRide = Math.max(900, Math.round(busDayKrw / 4));
  if (mode === "subway" || mode === "train") {
    return Math.round(perRide * (1 + Math.min(distanceKm, 12) * 0.04));
  }
  return perRide;
}

function buildTransitLeg(
  from: Coords,
  to: Coords,
  fromStop: OsmStop,
  toStop: OsmStop,
  busDayKrw: number,
  locale: "ko" | "en"
): TransitLeg {
  const walkToKm = haversineKm(from, { lat: fromStop.lat, lng: fromStop.lng });
  const rideKm = haversineKm({ lat: fromStop.lat, lng: fromStop.lng }, { lat: toStop.lat, lng: toStop.lng });
  const walkFromKm = haversineKm({ lat: toStop.lat, lng: toStop.lng }, to);
  const distanceKm = walkToKm + rideKm + walkFromKm;

  const walkMinutes = Math.round((walkToKm + walkFromKm) / 0.08 + 4);
  const rideMinutes = Math.round((rideKm / rideSpeedKmh(fromStop.mode)) * 60 + 3);
  const durationMinutes = Math.max(8, walkMinutes + rideMinutes);

  const mode = fromStop.mode === toStop.mode ? fromStop.mode : fromStop.mode;
  const line = fromStop.line || toStop.line;
  const fareKrw = estimateRideFare(busDayKrw, mode, rideKm);

  const note =
    locale === "en"
      ? `Walk ~${walkToKm.toFixed(1)}km to ${fromStop.name}, ride ~${rideKm.toFixed(1)}km, walk ~${walkFromKm.toFixed(1)}km to destination. Fare is an OSM-based estimate — check local transit apps.`
      : `출발지에서 ${fromStop.name}까지 도보 약 ${walkToKm.toFixed(1)}km, 승차 후 약 ${rideKm.toFixed(1)}km 이동, ${toStop.name}에서 하차 후 목적지까지 도보 약 ${walkFromKm.toFixed(1)}km. 요금은 OSM·물가 기반 추정치이며 현지 교통앱에서 다시 확인하세요.`;

  return {
    mode,
    line,
    fromStop: fromStop.name,
    toStop: toStop.name,
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes,
    fareKrw,
    note,
  };
}

function blockCoords(block: ItineraryBlock, places: PlaceCandidate[]): Coords | null {
  if (block.lat != null && block.lng != null) return { lat: block.lat, lng: block.lng };
  const place = places.find((p) => p.id === block.place_id);
  if (place?.lat != null && place?.lng != null) return { lat: place.lat, lng: place.lng };
  return null;
}

export function formatTransitLeg(leg: TransitLeg, locale: "ko" | "en"): string {
  const mode = modeLabel(leg.mode, locale);
  const linePart = leg.line ? (locale === "en" ? ` line ${leg.line}` : ` ${leg.line}호선/노선`) : "";
  if (locale === "en") {
    return `${mode}${linePart}: board at ${leg.fromStop} → alight at ${leg.toStop} · ~${leg.distanceKm}km · ~${leg.durationMinutes}min · ~${leg.fareKrw.toLocaleString()} KRW`;
  }
  return `${mode}${linePart}: ${leg.fromStop} 승차 → ${leg.toStop} 하차 · 약 ${leg.distanceKm}km · 약 ${leg.durationMinutes}분 · 요금 약 ${leg.fareKrw.toLocaleString()}원`;
}

export async function attachTransitLegs(
  days: ItineraryDay[],
  places: PlaceCandidate[],
  prefs: TripPreferences,
  busDayKrw = 12000
): Promise<ItineraryDay[]> {
  if (prefs.transport !== "bus") return days;

  const enriched: ItineraryDay[] = [];
  let prevCoords: Coords | null = null;

  for (const day of days) {
    const blocks: ItineraryBlock[] = [];

    for (const block of day.blocks) {
      let nextBlock = { ...block };
      const dest = blockCoords(block, places);

      if (block.transport === "bus" && prevCoords && dest) {
        const directKm = haversineKm(prevCoords, dest);
        if (directKm >= 1.2) {
          const [fromStops, toStops] = await Promise.all([
            queryTransitStops(prevCoords.lat, prevCoords.lng),
            queryTransitStops(dest.lat, dest.lng),
          ]);
          const fromStop = nearestStop(fromStops, prevCoords);
          const toStop = nearestStop(toStops, dest);

          if (fromStop && toStop && fromStop.name !== toStop.name) {
            nextBlock = {
              ...nextBlock,
              travel: buildTransitLeg(prevCoords, dest, fromStop, toStop, busDayKrw, prefs.locale),
            };
          } else if (directKm >= 1.2) {
            const fareKrw = estimateRideFare(busDayKrw, "bus", directKm);
            const durationMinutes = Math.max(10, Math.round((directKm / 18) * 60 + 8));
            nextBlock = {
              ...nextBlock,
              travel: {
                mode: "bus",
                fromStop: prefs.locale === "en" ? "Nearest bus stop (OSM)" : "가장 가까운 버스 정류장 (OSM)",
                toStop: prefs.locale === "en" ? "Stop near destination (OSM)" : "목적지 인근 정류장 (OSM)",
                distanceKm: Math.round(directKm * 10) / 10,
                durationMinutes,
                fareKrw,
                note:
                  prefs.locale === "en"
                    ? "Named stops were not found in OSM — distance and fare are rough estimates."
                    : "OSM에서 정류장명을 찾지 못해 거리·요금만 추정했습니다. 현지 앱에서 노선을 확인하세요.",
              },
            };
          }
        }
      }

      blocks.push(nextBlock);
      if (dest) prevCoords = dest;
    }

    enriched.push({ ...day, blocks });
  }

  return enriched;
}
