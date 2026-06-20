import { getEmilyTheme } from "./themes";
import { slugifyPlaceId } from "./travelData";
import type { PlaceCandidate, PlanePlaceRecord } from "./tripTypes";

const DATA_BASE = "/traveleditor/data";

export type PlaneMode = "halal" | "drunken";

export type { PlanePlaceRecord } from "./tripTypes";

type PlaneDb = {
  places: PlanePlaceRecord[];
  count: number;
};

const CITY_TO_COUNTRY: Record<string, string> = {
  seoul: "Korea",
  busan: "Korea",
  incheon: "Korea",
  daegu: "Korea",
  jeju: "Korea",
  gwangju: "Korea",
  daejeon: "Korea",
  bangkok: "Thailand",
  chiangmai: "Thailand",
  phuket: "Thailand",
  tokyo: "Japan",
  osaka: "Japan",
  kyoto: "Japan",
  fukuoka: "Japan",
  sapporo: "Japan",
  singapore: "Singapore",
  kualalumpur: "Malaysia",
  penang: "Malaysia",
  jakarta: "Indonesia",
  bali: "Indonesia",
  hochiminh: "Vietnam",
  hanoi: "Vietnam",
  taipei: "Taiwan",
  dubai: "UAE",
  istanbul: "Turkey",
  london: "UK",
  paris: "France",
  berlin: "Germany",
  newyork: "USA",
  losangeles: "USA",
};

const CC_TO_COUNTRY: Record<string, string> = {
  kr: "Korea",
  jp: "Japan",
  th: "Thailand",
  sg: "Singapore",
  my: "Malaysia",
  id: "Indonesia",
  vn: "Vietnam",
  tw: "Taiwan",
  ae: "UAE",
  tr: "Turkey",
  gb: "UK",
  fr: "France",
  de: "Germany",
  us: "USA",
};

const CRAFT_RE =
  /whisky|whiskey|beer|wine|cocktail|traditional|brewery|winery|distillery|mead|craft|pub|bar(?!\s*street)/i;
const NIGHT_RE = /bar|club|speakeasy|lounge|night|rooftop|izakaya|pub|cocktail/i;

function normKey(s: string) {
  return s.trim().toLowerCase().replace(/[\s-]/g, "");
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function resolvePlaneCountry(city: string, countryCode?: string): string | null {
  if (countryCode && CC_TO_COUNTRY[countryCode.toLowerCase()]) {
    return CC_TO_COUNTRY[countryCode.toLowerCase()];
  }
  const fromCity = CITY_TO_COUNTRY[normKey(city)];
  if (fromCity) return fromCity;
  return null;
}

export function getPlaneModeForTheme(themeName: string): PlaneMode | null {
  const theme = getEmilyTheme(themeName);
  return theme.planeMode ?? null;
}

export function getPlanePersona(themeName: string): "amina" | "emily_bartender" | null {
  const mode = getPlaneModeForTheme(themeName);
  if (mode === "halal") return "amina";
  if (mode === "drunken") return "emily_bartender";
  return null;
}

function matchesDrunkenFilter(place: PlanePlaceRecord, themeKey: string): boolean {
  const theme = getEmilyTheme(themeKey);
  const hay = `${place.category} ${place.vibe ?? ""} ${place.label ?? ""} ${place.descEn ?? ""}`;
  if (theme.id === "drink_craft") {
    return CRAFT_RE.test(hay) || /winery|brewery|distillery|whisky|beer|wine/i.test(place.name);
  }
  if (theme.id === "yolo_night") {
    return NIGHT_RE.test(hay) || /bar|club|lounge|speakeasy/i.test(place.name);
  }
  return true;
}

async function loadPlaneDb(mode: PlaneMode): Promise<PlaneDb | null> {
  const file = mode === "halal" ? "halal_plane_db.json" : "drunken_plane_db.json";
  try {
    const res = await fetch(`${DATA_BASE}/${file}`);
    if (!res.ok) return null;
    return (await res.json()) as PlaneDb;
  } catch {
    return null;
  }
}

export async function fetchPlanePlacesForTrip(
  mode: PlaneMode,
  themeName: string,
  city: string,
  cityGeo?: { lat: number; lng: number; countryCode?: string },
  options?: { maxResults?: number; maxRadiusKm?: number }
): Promise<PlanePlaceRecord[]> {
  const db = await loadPlaneDb(mode);
  if (!db?.places?.length) return [];

  const country = resolvePlaneCountry(city, cityGeo?.countryCode);
  const maxResults = options?.maxResults ?? 36;
  const maxRadiusKm = options?.maxRadiusKm ?? 120;

  let pool = db.places;
  if (country) {
    pool = pool.filter((p) => p.country === country);
  } else if (cityGeo) {
    pool = pool.filter((p) => haversineKm(cityGeo, p) <= maxRadiusKm);
  }

  if (mode === "drunken") {
    pool = pool.filter((p) => matchesDrunkenFilter(p, themeName));
  }

  if (cityGeo) {
    pool = pool
      .map((p) => ({ ...p, distanceKm: haversineKm(cityGeo, p) }))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return pool.slice(0, maxResults);
}

export function planeToPlaceCandidates(
  city: string,
  records: PlanePlaceRecord[],
  mode: PlaneMode
): PlaceCandidate[] {
  const tag = mode === "halal" ? "Halal Plane" : "Drunken Plane";
  return records.map((p) => {
    const whyParts = [p.descKo || p.descEn, p.label, p.category].filter(Boolean);
    if (p.distanceKm != null) whyParts.push(`도심에서 약 ${p.distanceKm.toFixed(1)}km`);
    if (p.signature) whyParts.push(`시그니처: ${p.signature}`);
    return {
      id: slugifyPlaceId(city, p.name),
      title: p.name,
      angle: `[${tag} · ${p.category}]`,
      why: whyParts.join(" · "),
      lat: p.lat,
      lng: p.lng,
      maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address ?? city}`)}`,
    };
  });
}

export function mergePlaneIntoPlaces(
  planePlaces: PlaceCandidate[],
  existing: PlaceCandidate[]
): PlaceCandidate[] {
  const seen = new Set<string>();
  const out: PlaceCandidate[] = [];

  for (const p of planePlaces) {
    const key = p.title.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }

  for (const p of existing) {
    const key = p.title.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }

  return out;
}

export function planeSourceLabel(mode: PlaneMode, count: number): string {
  if (mode === "halal") return `Halal Plane 큐레이션 ${count}곳`;
  return `Drunken Plane 큐레이션 ${count}곳`;
}
