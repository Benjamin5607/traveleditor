/** IATA 등록 공항만 — 허구 코드·도시 앞 3글자 폴백 금지 */

export type VerifiedAirport = {
  iata: string;
  nameKo: string;
  nameEn: string;
  city: string;
  cityKey: string;
  lat: number;
  lng: number;
  country: string;
};

/** 공식 IATA 코드 화이트리스트 (3글자 대문자) */
export const VERIFIED_IATA = new Set([
  "ICN", "GMP", "PUS", "CJU", "CJJ", "TAE", "KWJ",
  "NRT", "HND", "KIX", "ITM", "CTS", "FUK", "NGO",
  "BKK", "DMK", "CNX", "HKT",
  "SIN", "KUL", "CGK", "MNL", "SGN", "HAN", "DAD", "CXR",
  "TPE", "TSA", "HKG", "MFM",
  "PEK", "PKX", "PVG", "SHA", "CAN", "SZX",
  "LHR", "LGW", "STN", "LTN", "MAN", "EDI",
  "CDG", "ORY", "NCE", "LYS",
  "FRA", "MUC", "BER", "HAM", "DUS",
  "FCO", "MXP", "VCE", "NAP",
  "BCN", "MAD", "LIS", "OPO",
  "AMS", "BRU", "ZRH", "GVA", "VIE", "PRG", "BUD", "WAW",
  "IST", "SAW", "AYT",
  "DXB", "AUH", "DOH", "RUH", "JED",
  "DEL", "BOM", "BLR", "MAA", "CCU",
  "SYD", "MEL", "BNE", "AKL", "CHC",
  "JFK", "EWR", "LGA", "LAX", "SFO", "ORD", "SEA", "MIA", "LAS", "BOS", "IAD", "DFW", "ATL",
  "YYZ", "YVR", "YUL",
  "GRU", "GIG", "EZE", "SCL", "BOG", "LIM", "MEX", "CUN",
  "CAI", "JNB", "CPT", "NBO", "ADD", "CMN",
  "DPS", "CGK", "PNH", "REP", "VTE", "RGN", "LPQ",
]);

function norm(city: string) {
  return city.trim().toLowerCase().replace(/[\s_-]/g, "");
}

/** 도시별 대표 국제공항 (실제 IATA만) */
export const CITY_AIRPORT: Record<string, VerifiedAirport> = {
  seoul: { iata: "ICN", nameKo: "인천국제공항", nameEn: "Incheon International Airport", city: "Seoul", cityKey: "seoul", lat: 37.4602, lng: 126.4407, country: "KR" },
  busan: { iata: "PUS", nameKo: "김해국제공항", nameEn: "Gimhae International Airport", city: "Busan", cityKey: "busan", lat: 35.1796, lng: 128.9382, country: "KR" },
  jeju: { iata: "CJU", nameKo: "제주국제공항", nameEn: "Jeju International Airport", city: "Jeju", cityKey: "jeju", lat: 33.5113, lng: 126.493, country: "KR" },
  tokyo: { iata: "NRT", nameKo: "나리타국제공항", nameEn: "Narita International Airport", city: "Tokyo", cityKey: "tokyo", lat: 35.772, lng: 140.3929, country: "JP" },
  osaka: { iata: "KIX", nameKo: "간사이국제공항", nameEn: "Kansai International Airport", city: "Osaka", cityKey: "osaka", lat: 34.4347, lng: 135.244, country: "JP" },
  bangkok: { iata: "BKK", nameKo: "수완나품국제공항", nameEn: "Suvarnabhumi Airport", city: "Bangkok", cityKey: "bangkok", lat: 13.69, lng: 100.7501, country: "TH" },
  singapore: { iata: "SIN", nameKo: "창이국제공항", nameEn: "Changi Airport", city: "Singapore", cityKey: "singapore", lat: 1.3644, lng: 103.9915, country: "SG" },
  taipei: { iata: "TPE", nameKo: "타오위안국제공항", nameEn: "Taoyuan International Airport", city: "Taipei", cityKey: "taipei", lat: 25.0797, lng: 121.2342, country: "TW" },
  hongkong: { iata: "HKG", nameKo: "홍콩국제공항", nameEn: "Hong Kong International Airport", city: "Hong Kong", cityKey: "hongkong", lat: 22.308, lng: 113.9185, country: "HK" },
  london: { iata: "LHR", nameKo: "히스로공항", nameEn: "Heathrow Airport", city: "London", cityKey: "london", lat: 51.47, lng: -0.4543, country: "GB" },
  paris: { iata: "CDG", nameKo: "샤를 드 골 공항", nameEn: "Charles de Gaulle Airport", city: "Paris", cityKey: "paris", lat: 49.0097, lng: 2.5479, country: "FR" },
  danang: { iata: "DAD", nameKo: "다낭국제공항", nameEn: "Da Nang International Airport", city: "Da Nang", cityKey: "danang", lat: 16.0439, lng: 108.199, country: "VN" },
  barcelona: { iata: "BCN", nameKo: "엘프라트공항", nameEn: "Barcelona-El Prat Airport", city: "Barcelona", cityKey: "barcelona", lat: 41.2971, lng: 2.0785, country: "ES" },
  rome: { iata: "FCO", nameKo: "피우미치노공항", nameEn: "Leonardo da Vinci-Fiumicino Airport", city: "Rome", cityKey: "rome", lat: 41.8003, lng: 12.2389, country: "IT" },
  berlin: { iata: "BER", nameKo: "베를린 브란덴부르크 공항", nameEn: "Berlin Brandenburg Airport", city: "Berlin", cityKey: "berlin", lat: 52.3667, lng: 13.5033, country: "DE" },
  newyork: { iata: "JFK", nameKo: "존 F. 케네디 국제공항", nameEn: "John F. Kennedy International Airport", city: "New York", cityKey: "newyork", lat: 40.6413, lng: -73.7781, country: "US" },
  losangeles: { iata: "LAX", nameKo: "LA 국제공항", nameEn: "Los Angeles International Airport", city: "Los Angeles", cityKey: "losangeles", lat: 33.9416, lng: -118.4085, country: "US" },
  sydney: { iata: "SYD", nameKo: "킹스포드 스미스 공항", nameEn: "Sydney Kingsford Smith Airport", city: "Sydney", cityKey: "sydney", lat: -33.9399, lng: 151.1753, country: "AU" },
  dubai: { iata: "DXB", nameKo: "두바이 국제공항", nameEn: "Dubai International Airport", city: "Dubai", cityKey: "dubai", lat: 25.2532, lng: 55.3657, country: "AE" },
  istanbul: { iata: "IST", nameKo: "이스탄불 공항", nameEn: "Istanbul Airport", city: "Istanbul", cityKey: "istanbul", lat: 41.2753, lng: 28.7519, country: "TR" },
};

/** 출발지 선택용 인기 도시 */
export const POPULAR_ORIGIN_CITIES = [
  "Seoul", "Busan", "Jeju", "Tokyo", "Osaka", "Singapore", "Bangkok",
  "Taipei", "Hong Kong", "London", "Paris", "New York", "Los Angeles",
  "Sydney", "Dubai", "Istanbul", "Da Nang", "Barcelona", "Rome", "Berlin",
] as const;

export function resolveCityAirport(city: string): VerifiedAirport | null {
  const key = norm(city);
  if (CITY_AIRPORT[key]) return CITY_AIRPORT[key];
  const byCity = Object.values(CITY_AIRPORT).find(
    (a) => norm(a.city) === key || a.city.toLowerCase() === city.trim().toLowerCase()
  );
  return byCity ?? null;
}

export function resolveAirportByIata(iata: string): VerifiedAirport | null {
  const code = iata.trim().toUpperCase();
  if (!VERIFIED_IATA.has(code)) return null;
  return Object.values(CITY_AIRPORT).find((a) => a.iata === code) ?? null;
}

/** Wikivoyage에서 파싱한 코드 — 화이트리스트 통과 시만 사용 */
export function resolveDestinationAirport(
  city: string,
  wikivoyageIata?: string
): VerifiedAirport | null {
  if (wikivoyageIata) {
    const code = wikivoyageIata.trim().toUpperCase();
    if (VERIFIED_IATA.has(code)) {
      const fromCity = resolveCityAirport(city);
      if (fromCity && fromCity.iata === code) return fromCity;
      const fromIata = resolveAirportByIata(code);
      if (fromIata) return fromIata;
      return {
        iata: code,
        nameKo: `${code} 공항`,
        nameEn: `${code} Airport`,
        city,
        cityKey: norm(city),
        lat: 0,
        lng: 0,
        country: "",
      };
    }
  }
  return resolveCityAirport(city);
}

export function airportLabel(airport: VerifiedAirport, locale: "ko" | "en") {
  const name = locale === "en" ? airport.nameEn : airport.nameKo;
  return `${airport.city} · ${name} (${airport.iata})`;
}
