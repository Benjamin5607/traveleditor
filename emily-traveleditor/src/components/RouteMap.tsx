"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { ItineraryDay, PlaceCandidate } from "../lib/tripTypes";
import { buildGoogleMapsPlaceUrl } from "../lib/placeLinks";

type RouteMapProps = {
  city: string;
  days: ItineraryDay[];
  places: PlaceCandidate[];
};

type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  order?: number;
  day?: number;
};

function collectItineraryPoints(days: ItineraryDay[], places: PlaceCandidate[]): MapPoint[] {
  const points: MapPoint[] = [];
  let order = 1;

  for (const day of days) {
    for (const block of day.blocks) {
      const place = places.find((p) => p.id === block.place_id);
      if (place?.lat == null || place?.lng == null) continue;
      const last = points[points.length - 1];
      if (last?.id === place.id) continue;
      points.push({
        id: place.id,
        title: block.place_title,
        lat: place.lat,
        lng: place.lng,
        order,
        day: day.day,
      });
      order += 1;
    }
  }
  return points;
}

function collectExtraPlaces(places: PlaceCandidate[], onRoute: Set<string>): MapPoint[] {
  return places
    .filter((p) => p.lat != null && p.lng != null && !onRoute.has(p.id))
    .map((p) => ({
      id: p.id,
      title: p.title,
      lat: p.lat!,
      lng: p.lng!,
    }));
}

export default function RouteMap({ city, days, places }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const itinerary = useMemo(() => collectItineraryPoints(days, places), [days, places]);
  const extras = useMemo(() => {
    const onRoute = new Set(itinerary.map((p) => p.id));
    return collectExtraPlaces(places, onRoute);
  }, [places, itinerary]);
  const hasPoints = itinerary.length > 0 || extras.length > 0;

  useEffect(() => {
    if (!containerRef.current || !hasPoints) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      if (cancelled || !containerRef.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const routePoints = collectItineraryPoints(days, places);
      const extraPoints = collectExtraPlaces(places, new Set(routePoints.map((p) => p.id)));

      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      if (routePoints.length >= 2) {
        const line = routePoints.map((p) => [p.lat, p.lng] as L.LatLngExpression);
        L.polyline(line, {
          color: "#facc15",
          weight: 4,
          opacity: 0.9,
          dashArray: routePoints.length > 4 ? "8 6" : undefined,
        }).addTo(map);
      }

      for (const point of routePoints) {
        bounds.push([point.lat, point.lng] as [number, number]);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:50%;background:#facc15;color:#18181b;font:bold 13px/28px sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${point.order}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const mapsUrl = buildGoogleMapsPlaceUrl(city, point);
        L.marker([point.lat, point.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${point.order}. ${point.title}</strong><br/><span style="color:#666">${point.day}일차</span><br/><a href="${mapsUrl}" target="_blank" rel="noreferrer">Google Maps</a>`
          );
      }

      for (const point of extraPoints) {
        bounds.push([point.lat, point.lng] as [number, number]);
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#60a5fa;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const mapsUrl = buildGoogleMapsPlaceUrl(city, point);
        L.marker([point.lat, point.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${point.title}</strong><br/><span style="color:#666">추천 장소</span><br/><a href="${mapsUrl}" target="_blank" rel="noreferrer">Google Maps</a>`
          );
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [city, days, places, hasPoints]);

  if (!hasPoints) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-zinc-900 text-sm text-zinc-400">
        좌표가 있는 장소가 없어 지도를 그릴 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="route-map-container z-0 h-80 w-full rounded-2xl bg-zinc-900" />
      <div className="flex flex-wrap gap-4 px-2 text-xs text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-300 text-[10px] font-black text-zinc-900">1</span>
          일정 경로 ({itinerary.length}곳)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-sky-400" />
          기타 추천 ({extras.length}곳)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-yellow-300" />
          방문 순서
        </span>
      </div>
    </div>
  );
}
