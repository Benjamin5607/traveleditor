export const TRANSPORT_OPTIONS = [
  { id: "walk", label: "도보", description: "도심 위주, 이동 최소화" },
  { id: "bus", label: "버스/대중교통", description: "시내버스·지하철 중심" },
  { id: "rental_car", label: "렌트카", description: "교외·와이너리 등 이동 많을 때" },
] as const;

export const LODGING_OPTIONS = [
  { id: "hotel", label: "호텔" },
  { id: "inn", label: "여관/게스트하우스" },
  { id: "hostel", label: "호스텔" },
  { id: "none", label: "숙박 없음 (무박)" },
] as const;

export type TransportId = (typeof TRANSPORT_OPTIONS)[number]["id"];
export type LodgingId = (typeof LODGING_OPTIONS)[number]["id"];

export type TripPreferences = {
  city: string;
  theme: string;
  days: number;
  nights: number;
  transport: TransportId;
  lodging: LodgingId;
  budgetKrw: number;
};

export type PlaceCandidate = {
  id: string;
  title: string;
  angle?: string;
  why?: string;
  official_url?: string;
  source_urls?: string[];
  lat?: number;
  lng?: number;
};

export type ItineraryBlock = {
  time: string;
  place_id: string;
  place_title: string;
  activity: string;
  transport: TransportId;
};

export type ItineraryDay = {
  day: number;
  label: string;
  blocks: ItineraryBlock[];
};

export type TravelGuidebook = {
  title: string;
  summary: string;
  days: ItineraryDay[];
  tips: string[];
  preferences: TripPreferences;
  places: PlaceCandidate[];
  budget: BudgetBreakdown;
  bookingLinks: BookingLinkSet;
  mapUrl: string;
};

export type BudgetBreakdown = {
  lodging: number;
  transport: number;
  meals: number;
  activities: number;
  total: number;
  perDay: number;
  withinBudget: boolean;
  budgetKrw: number;
  notes: string[];
};

export type BookingLinkSet = {
  flights: string;
  lodging: string;
  restaurants: string;
  maps: string;
};
