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

export type BudgetThemeId =
  | "miser_backpack"
  | "smart_value"
  | "yolo_luxury"
  | "custom";

export type TripPreferences = {
  city: string;
  theme: string;
  days: number;
  nights: number;
  transport: TransportId;
  lodging: LodgingId;
  budgetTheme: BudgetThemeId;
  budgetKrw: number;
};

export type AmenityStop = {
  kind: "meal" | "cafe" | "restroom";
  name: string;
  why: string;
  tip: string;
  mapsUrl: string;
  source: "osm" | "wikivoyage";
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
  maps_url?: string;
};

export type ItineraryBlock = {
  time: string;
  place_id: string;
  place_title: string;
  activity: string;
  transport: TransportId;
  rationale?: string;
  amenities?: AmenityStop[];
};

export type LodgingRecommendation = {
  name: string;
  why: string;
  category: string;
  mapsUrl: string;
  bookingUrl: string;
  source: "wikivoyage" | "search";
};

export type FlightDetailInfo = {
  routeLabel: string;
  origin: { code: string; name: string; city: string };
  destination: { code: string; name: string; city: string };
  durationHours?: number;
  carriers: string[];
  whyThisEstimate: string;
  wikivoyageNotes: string[];
};

export type ItineraryDay = {
  day: number;
  label: string;
  blocks: ItineraryBlock[];
};

export type GuideNarrationInfo = {
  welcome: string;
  philosophy: string;
  dayIntros: Record<number, string>;
  closing: string;
  searchNote: string;
};

export type TravelGuidebook = {
  title: string;
  summary: string;
  itineraryRationale: string;
  narration: GuideNarrationInfo;
  days: ItineraryDay[];
  tips: string[];
  preferences: TripPreferences;
  places: PlaceCandidate[];
  lodgingRecommendations: LodgingRecommendation[];
  budget: BudgetBreakdown;
  budgetThemeLabel: string;
  bookingLinks: BookingLinkSet;
  mapUrl: string;
  mapEmbedUrl: string;
  osmDirectionsUrl: string;
  flightEstimate: FlightEstimateInfo;
  flightDetail: FlightDetailInfo;
  dataSource: "static" | "live";
};

export type FlightEstimateInfo = {
  low: number;
  high: number;
  midpoint: number;
  label: string;
  note: string;
};

export type BudgetBreakdown = {
  flights: number;
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
  flightsSkyscanner: string;
  kayakFlights: string;
  lodging: string;
  googleHotels: string;
  restaurants: string;
  maps: string;
  osm: string;
};
