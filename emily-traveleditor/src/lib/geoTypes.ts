export type GeoResult = {
  lat: number;
  lng: number;
  displayName?: string;
  countryCode?: string;
  boundingBox?: [number, number, number, number];
};
