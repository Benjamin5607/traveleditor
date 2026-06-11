type MapStop = { title: string; lat?: number; lng?: number };

type CityCenter = { lat: number; lng: number };

export function buildOsmDirectionsUrl(stops: MapStop[]) {
  const withCoords = stops.filter((s) => s.lat != null && s.lng != null) as Array<{ lat: number; lng: number }>;
  if (withCoords.length < 2) return "";
  const [first, ...rest] = withCoords;
  const last = rest[rest.length - 1];
  const via = rest.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join(";");
  const base = `https://www.openstreetmap.org/directions?from=${first.lat}%2C${first.lng}&to=${last.lat}%2C${last.lng}`;
  return via ? `${base}&via=${via}` : base;
}

export function buildOsmEmbedUrl(stops: MapStop[], cityCenter?: CityCenter) {
  const withCoords = stops.filter((s) => s.lat != null && s.lng != null) as Array<{ lat: number; lng: number }>;

  if (withCoords.length === 0 && cityCenter) {
    const pad = 0.05;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${cityCenter.lng - pad}%2C${cityCenter.lat - pad}%2C${cityCenter.lng + pad}%2C${cityCenter.lat + pad}&layer=mapnik&marker=${cityCenter.lat}%2C${cityCenter.lng}`;
  }

  if (withCoords.length === 0) return "";

  const lats = withCoords.map((s) => s.lat);
  const lngs = withCoords.map((s) => s.lng);
  const pad = 0.02;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;

  const marker = withCoords[0];
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${marker.lat}%2C${marker.lng}`;
}

export function buildNamedGoogleDirectionsUrl(city: string, stops: MapStop[]) {
  const named = stops.map((s) => encodeURIComponent(`${s.title}, ${city}`));
  if (named.length >= 2) {
    return `https://www.google.com/maps/dir/${named.join("/")}`;
  }
  if (named.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${named[0]}`;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(city)}`;
}

export function buildStaticMapPreview(stops: MapStop[], city: string, cityCenter?: CityCenter) {
  const embed = buildOsmEmbedUrl(stops, cityCenter);
  if (embed) return embed;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(city)}`;
}
