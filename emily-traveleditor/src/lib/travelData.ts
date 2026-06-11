import type { PlaceCandidate } from "./tripTypes";

export type ThemeTravelRecommendation = {
  title?: string;
  angle?: string;
  why?: string;
  source_titles?: string[];
  source_urls?: string[];
  official_url?: string;
  reservation_hint?: string;
  lat?: number;
  lng?: number;
};

export type ThemeTravelDb = {
  themes?: Record<string, {
    cities?: Record<string, ThemeTravelRecommendation[]>;
  }>;
};

export type FlightIndexEntry = { low: number; high: number; km?: number };

export type MarketDb = {
  rates?: Record<string, number>;
  beer_index?: Record<string, number>;
  cost_index?: Record<string, CityCostIndex>;
  flight_index?: Record<string, FlightIndexEntry>;
  news?: string[];
};

export type GeoCacheDb = {
  last_updated?: string;
  cities?: Record<string, {
    lat: number;
    lng: number;
    countryCode?: string;
    boundingBox?: [number, number, number, number];
  }>;
};

export type CityCostIndex = {
  hotel?: number;
  inn?: number;
  hostel?: number;
  meal?: number;
  bus_day?: number;
  car_day?: number;
  activity?: number;
};

const DATA_BASE = "/traveleditor/data";

export function normalizeCityName(city: string) {
  return city.trim().toLowerCase().replace(/[\s-]/g, "");
}

export function slugifyPlaceId(city: string, title: string) {
  return `${normalizeCityName(city)}-${title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function findCityRecommendations(
  cities: Record<string, ThemeTravelRecommendation[]> | undefined,
  city: string
) {
  const target = normalizeCityName(city);
  return Object.entries(cities ?? {}).find(([name]) => normalizeCityName(name) === target)?.[1] ?? [];
}

export async function loadThemeTravelDb() {
  const response = await fetch(`${DATA_BASE}/theme_travel_db.json`);
  if (!response.ok) return null;
  return (await response.json()) as ThemeTravelDb;
}

export async function loadMarketDb() {
  const response = await fetch(`${DATA_BASE}/market_db.json`);
  if (!response.ok) return null;
  return (await response.json()) as MarketDb;
}

export async function loadGeoCacheDb() {
  const response = await fetch(`${DATA_BASE}/geo_cache.json`);
  if (!response.ok) return null;
  return (await response.json()) as GeoCacheDb;
}

export function toPlaceCandidates(city: string, items: ThemeTravelRecommendation[]): PlaceCandidate[] {
  return items.map((item) => ({
    id: slugifyPlaceId(city, item.title ?? city),
    title: item.title ?? city,
    angle: item.angle,
    why: item.why,
    official_url: item.official_url,
    source_urls: item.source_urls,
    lat: item.lat,
    lng: item.lng,
  }));
}

export async function getThemePlaces(city: string, theme: string): Promise<PlaceCandidate[]> {
  const db = await loadThemeTravelDb();
  const items = findCityRecommendations(db?.themes?.[theme]?.cities, city);
  return toPlaceCandidates(city, items);
}

export function resolvePlaceTitle(placeId: string, places: PlaceCandidate[]) {
  return places.find((place) => place.id === placeId)?.title ?? placeId;
}
