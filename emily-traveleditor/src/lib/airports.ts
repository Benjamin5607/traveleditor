/** IATA 등록 공항만 — 허구 코드·도시 앞 3글자 폴백 금지 */

import { geocodeCity } from "./liveTravel";

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
  "DPS", "PNH", "REP", "VTE", "RGN", "LPQ",
  "NQZ", "ALA",
]);

const CITY_ALIASES: Record<string, string> = {
  seoul: "Seoul", 서울: "Seoul",
  busan: "Busan", 부산: "Busan",
  jeju: "Jeju", 제주: "Jeju",
  tokyo: "Tokyo", 도쿄: "Tokyo", "東京": "Tokyo",
  osaka: "Osaka", 오사카: "Osaka", "大阪": "Osaka",
  kyoto: "Kyoto", 교토: "Kyoto", "京都": "Kyoto",
  bangkok: "Bangkok", 방콕: "Bangkok", "曼谷": "Bangkok",
  singapore: "Singapore", 싱가포르: "Singapore",
  taipei: "Taipei", 타이페이: "Taipei", "台北": "Taipei",
  hongkong: "Hong Kong", "hong kong": "Hong Kong", 홍콩: "Hong Kong",
  london: "London", 런던: "London",
  paris: "Paris", 파리: "Paris",
  danang: "Da Nang", "da nang": "Da Nang", 다낭: "Da Nang",
  barcelona: "Barcelona", 바르셀로나: "Barcelona",
  rome: "Rome", 로마: "Rome",
  berlin: "Berlin", 베를린: "Berlin",
  newyork: "New York", "new york": "New York", 뉴욕: "New York",
  losangeles: "Los Angeles", "los angeles": "Los Angeles",
  sydney: "Sydney", 두바이: "Dubai", dubai: "Dubai",
  istanbul: "Istanbul", 이스탄불: "Istanbul",
  munich: "Munich", 뮌헨: "Munich",
  prague: "Prague", 프라하: "Prague",
  hanoi: "Hanoi", 하노이: "Hanoi",
  "ho chi minh": "Ho Chi Minh City", "ho chi minh city": "Ho Chi Minh City",
  hochiminh: "Ho Chi Minh City", 호치민: "Ho Chi Minh City",
  bali: "Denpasar", denpasar: "Denpasar", 덴파사르: "Denpasar",
  phuket: "Phuket", 푸켓: "Phuket",
  chiangmai: "Chiang Mai", "chiang mai": "Chiang Mai", 치앙마이: "Chiang Mai",
  malaysia: "Kuala Lumpur", "kuala lumpur": "Kuala Lumpur",
  manila: "Manila", 마닐라: "Manila",
  beijing: "Beijing", 베이징: "Beijing", peking: "Beijing",
  shanghai: "Shanghai", 상하이: "Shanghai",
  guangzhou: "Guangzhou", 광저우: "Guangzhou",
  shenzhen: "Shenzhen", 심천: "Shenzhen",
  amsterdam: "Amsterdam", 암스테르담: "Amsterdam",
  zurich: "Zurich", 취리히: "Zurich",
  vienna: "Vienna", 빈: "Vienna",
  budapest: "Budapest", 부다페스트: "Budapest",
  warsaw: "Warsaw", 바르샤바: "Warsaw",
  mumbai: "Mumbai", 뭄바이: "Mumbai",
  delhi: "Delhi", 델리: "Delhi",
  melbourne: "Melbourne", 멜버른: "Melbourne",
  auckland: "Auckland", 오클랜드: "Auckland",
  sanfrancisco: "San Francisco", "san francisco": "San Francisco",
  chicago: "Chicago", 시카고: "Chicago",
  miami: "Miami", 마이애미: "Miami",
  toronto: "Toronto", 토론토: "Toronto",
  vancouver: "Vancouver", 밴쿠버: "Vancouver",
  mexicocity: "Mexico City", "mexico city": "Mexico City",
  cancun: "Cancun", 칸쿤: "Cancun",
  cairo: "Cairo", 카이로: "Cairo",
  johannesburg: "Johannesburg",
  capetown: "Cape Town", "cape town": "Cape Town",
  nairobi: "Nairobi",
  casablanca: "Casablanca",
  siemreap: "Siem Reap", "siem reap": "Siem Reap", "씨엠립": "Siem Reap",
  phnompenh: "Phnom Penh", "phnom penh": "Phnom Penh",
  luangprabang: "Luang Prabang", "luang prabang": "Luang Prabang",
  yangon: "Yangon", 양곤: "Yangon",
  vientiane: "Vientiane",
  astana: "Astana", 아스타나: "Astana", nursultan: "Astana", "nur-sultan": "Astana", 누르술탄: "Astana",
  almaty: "Almaty", 알마티: "Almaty",
};

/** IATA → 공항 메타 (좌표 포함) */
export const VERIFIED_AIRPORTS: Record<string, VerifiedAirport> = {
  ICN: { iata: "ICN", nameKo: "인천국제공항", nameEn: "Incheon International Airport", city: "Seoul", cityKey: "seoul", lat: 37.4602, lng: 126.4407, country: "KR" },
  GMP: { iata: "GMP", nameKo: "김포국제공항", nameEn: "Gimpo International Airport", city: "Seoul", cityKey: "seoul", lat: 37.5583, lng: 126.7906, country: "KR" },
  PUS: { iata: "PUS", nameKo: "김해국제공항", nameEn: "Gimhae International Airport", city: "Busan", cityKey: "busan", lat: 35.1796, lng: 128.9382, country: "KR" },
  CJU: { iata: "CJU", nameKo: "제주국제공항", nameEn: "Jeju International Airport", city: "Jeju", cityKey: "jeju", lat: 33.5113, lng: 126.493, country: "KR" },
  CJJ: { iata: "CJJ", nameKo: "청주국제공항", nameEn: "Cheongju International Airport", city: "Cheongju", cityKey: "cheongju", lat: 36.7166, lng: 127.4991, country: "KR" },
  TAE: { iata: "TAE", nameKo: "대구국제공항", nameEn: "Daegu International Airport", city: "Daegu", cityKey: "daegu", lat: 35.8961, lng: 128.6694, country: "KR" },
  KWJ: { iata: "KWJ", nameKo: "광주공항", nameEn: "Gwangju Airport", city: "Gwangju", cityKey: "gwangju", lat: 35.1264, lng: 126.8089, country: "KR" },
  NRT: { iata: "NRT", nameKo: "나리타국제공항", nameEn: "Narita International Airport", city: "Tokyo", cityKey: "tokyo", lat: 35.772, lng: 140.3929, country: "JP" },
  HND: { iata: "HND", nameKo: "하네다공항", nameEn: "Haneda Airport", city: "Tokyo", cityKey: "tokyo", lat: 35.5494, lng: 139.7798, country: "JP" },
  KIX: { iata: "KIX", nameKo: "간사이국제공항", nameEn: "Kansai International Airport", city: "Osaka", cityKey: "osaka", lat: 34.4347, lng: 135.244, country: "JP" },
  ITM: { iata: "ITM", nameKo: "이타미공항", nameEn: "Osaka Itami Airport", city: "Osaka", cityKey: "osaka", lat: 34.7855, lng: 135.4382, country: "JP" },
  CTS: { iata: "CTS", nameKo: "신치토세공항", nameEn: "New Chitose Airport", city: "Sapporo", cityKey: "sapporo", lat: 42.7752, lng: 141.6928, country: "JP" },
  FUK: { iata: "FUK", nameKo: "후쿠오카공항", nameEn: "Fukuoka Airport", city: "Fukuoka", cityKey: "fukuoka", lat: 33.5859, lng: 130.4511, country: "JP" },
  NGO: { iata: "NGO", nameKo: "주부국제공항", nameEn: "Chubu Centrair International Airport", city: "Nagoya", cityKey: "nagoya", lat: 34.8584, lng: 136.8054, country: "JP" },
  BKK: { iata: "BKK", nameKo: "수완나품국제공항", nameEn: "Suvarnabhumi Airport", city: "Bangkok", cityKey: "bangkok", lat: 13.69, lng: 100.7501, country: "TH" },
  DMK: { iata: "DMK", nameKo: "돈므앙국제공항", nameEn: "Don Mueang International Airport", city: "Bangkok", cityKey: "bangkok", lat: 13.9126, lng: 100.6068, country: "TH" },
  CNX: { iata: "CNX", nameKo: "치앙마이국제공항", nameEn: "Chiang Mai International Airport", city: "Chiang Mai", cityKey: "chiangmai", lat: 18.7669, lng: 98.9626, country: "TH" },
  HKT: { iata: "HKT", nameKo: "푸켓국제공항", nameEn: "Phuket International Airport", city: "Phuket", cityKey: "phuket", lat: 8.1132, lng: 98.3169, country: "TH" },
  SIN: { iata: "SIN", nameKo: "창이국제공항", nameEn: "Changi Airport", city: "Singapore", cityKey: "singapore", lat: 1.3644, lng: 103.9915, country: "SG" },
  KUL: { iata: "KUL", nameKo: "쿠알라룸푸르국제공항", nameEn: "Kuala Lumpur International Airport", city: "Kuala Lumpur", cityKey: "kualalumpur", lat: 2.7456, lng: 101.7099, country: "MY" },
  CGK: { iata: "CGK", nameKo: "수카르노 하타국제공항", nameEn: "Soekarno-Hatta International Airport", city: "Jakarta", cityKey: "jakarta", lat: -6.1256, lng: 106.6559, country: "ID" },
  DPS: { iata: "DPS", nameKo: "응우라라이국제공항", nameEn: "Ngurah Rai International Airport", city: "Denpasar", cityKey: "denpasar", lat: -8.7482, lng: 115.1672, country: "ID" },
  MNL: { iata: "MNL", nameKo: "니노이 아키노국제공항", nameEn: "Ninoy Aquino International Airport", city: "Manila", cityKey: "manila", lat: 14.5086, lng: 121.0198, country: "PH" },
  SGN: { iata: "SGN", nameKo: "떤선녓국제공항", nameEn: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", cityKey: "hochiminh", lat: 10.8188, lng: 106.6519, country: "VN" },
  HAN: { iata: "HAN", nameKo: "노이바이국제공항", nameEn: "Noi Bai International Airport", city: "Hanoi", cityKey: "hanoi", lat: 21.2212, lng: 105.8072, country: "VN" },
  DAD: { iata: "DAD", nameKo: "다낭국제공항", nameEn: "Da Nang International Airport", city: "Da Nang", cityKey: "danang", lat: 16.0439, lng: 108.199, country: "VN" },
  CXR: { iata: "CXR", nameKo: "깜란국제공항", nameEn: "Cam Ranh International Airport", city: "Nha Trang", cityKey: "nhatrang", lat: 11.9982, lng: 109.2191, country: "VN" },
  TPE: { iata: "TPE", nameKo: "타오위안국제공항", nameEn: "Taoyuan International Airport", city: "Taipei", cityKey: "taipei", lat: 25.0797, lng: 121.2342, country: "TW" },
  TSA: { iata: "TSA", nameKo: "송산공항", nameEn: "Taipei Songshan Airport", city: "Taipei", cityKey: "taipei", lat: 25.0697, lng: 121.5525, country: "TW" },
  HKG: { iata: "HKG", nameKo: "홍콩국제공항", nameEn: "Hong Kong International Airport", city: "Hong Kong", cityKey: "hongkong", lat: 22.308, lng: 113.9185, country: "HK" },
  MFM: { iata: "MFM", nameKo: "마카오국제공항", nameEn: "Macau International Airport", city: "Macau", cityKey: "macau", lat: 22.1496, lng: 113.5916, country: "MO" },
  PEK: { iata: "PEK", nameKo: "베이징 수도국제공항", nameEn: "Beijing Capital International Airport", city: "Beijing", cityKey: "beijing", lat: 40.0799, lng: 116.6031, country: "CN" },
  PKX: { iata: "PKX", nameKo: "베이징 대흥국제공항", nameEn: "Beijing Daxing International Airport", city: "Beijing", cityKey: "beijing", lat: 39.5098, lng: 116.4105, country: "CN" },
  PVG: { iata: "PVG", nameKo: "푸둥국제공항", nameEn: "Shanghai Pudong International Airport", city: "Shanghai", cityKey: "shanghai", lat: 31.1443, lng: 121.8083, country: "CN" },
  SHA: { iata: "SHA", nameKo: "훙차오국제공항", nameEn: "Shanghai Hongqiao International Airport", city: "Shanghai", cityKey: "shanghai", lat: 31.1979, lng: 121.3364, country: "CN" },
  CAN: { iata: "CAN", nameKo: "바이윈국제공항", nameEn: "Guangzhou Baiyun International Airport", city: "Guangzhou", cityKey: "guangzhou", lat: 23.3924, lng: 113.2988, country: "CN" },
  SZX: { iata: "SZX", nameKo: "선전 바오안국제공항", nameEn: "Shenzhen Bao'an International Airport", city: "Shenzhen", cityKey: "shenzhen", lat: 22.6393, lng: 113.8107, country: "CN" },
  LHR: { iata: "LHR", nameKo: "히스로공항", nameEn: "Heathrow Airport", city: "London", cityKey: "london", lat: 51.47, lng: -0.4543, country: "GB" },
  LGW: { iata: "LGW", nameKo: "개트윅공항", nameEn: "Gatwick Airport", city: "London", cityKey: "london", lat: 51.1537, lng: -0.1821, country: "GB" },
  STN: { iata: "STN", nameKo: "스탠스테드공항", nameEn: "Stansted Airport", city: "London", cityKey: "london", lat: 51.886, lng: 0.2389, country: "GB" },
  LTN: { iata: "LTN", nameKo: "루턴공항", nameEn: "Luton Airport", city: "London", cityKey: "london", lat: 51.8747, lng: -0.3683, country: "GB" },
  MAN: { iata: "MAN", nameKo: "맨체스터공항", nameEn: "Manchester Airport", city: "Manchester", cityKey: "manchester", lat: 53.3537, lng: -2.275, country: "GB" },
  EDI: { iata: "EDI", nameKo: "에든버러공항", nameEn: "Edinburgh Airport", city: "Edinburgh", cityKey: "edinburgh", lat: 55.9508, lng: -3.3615, country: "GB" },
  CDG: { iata: "CDG", nameKo: "샤를 드 골 공항", nameEn: "Charles de Gaulle Airport", city: "Paris", cityKey: "paris", lat: 49.0097, lng: 2.5479, country: "FR" },
  ORY: { iata: "ORY", nameKo: "오를리공항", nameEn: "Paris Orly Airport", city: "Paris", cityKey: "paris", lat: 48.7233, lng: 2.3794, country: "FR" },
  NCE: { iata: "NCE", nameKo: "니스 코트다쥐르공항", nameEn: "Nice Côte d'Azur Airport", city: "Nice", cityKey: "nice", lat: 43.6584, lng: 7.2159, country: "FR" },
  LYS: { iata: "LYS", nameKo: "리용 생텍쥐페리공항", nameEn: "Lyon-Saint Exupéry Airport", city: "Lyon", cityKey: "lyon", lat: 45.7256, lng: 5.0811, country: "FR" },
  FRA: { iata: "FRA", nameKo: "프랑크푸르트공항", nameEn: "Frankfurt Airport", city: "Frankfurt", cityKey: "frankfurt", lat: 50.0379, lng: 8.5622, country: "DE" },
  MUC: { iata: "MUC", nameKo: "뮌헨공항", nameEn: "Munich Airport", city: "Munich", cityKey: "munich", lat: 48.3538, lng: 11.7861, country: "DE" },
  BER: { iata: "BER", nameKo: "베를린 브란덴부르크 공항", nameEn: "Berlin Brandenburg Airport", city: "Berlin", cityKey: "berlin", lat: 52.3667, lng: 13.5033, country: "DE" },
  HAM: { iata: "HAM", nameKo: "함부르크공항", nameEn: "Hamburg Airport", city: "Hamburg", cityKey: "hamburg", lat: 53.6304, lng: 9.9882, country: "DE" },
  DUS: { iata: "DUS", nameKo: "뒤셀도르프공항", nameEn: "Düsseldorf Airport", city: "Düsseldorf", cityKey: "dusseldorf", lat: 51.2895, lng: 6.7668, country: "DE" },
  FCO: { iata: "FCO", nameKo: "피우미치노공항", nameEn: "Leonardo da Vinci-Fiumicino Airport", city: "Rome", cityKey: "rome", lat: 41.8003, lng: 12.2389, country: "IT" },
  MXP: { iata: "MXP", nameKo: "밀라노 말펜사공항", nameEn: "Milan Malpensa Airport", city: "Milan", cityKey: "milan", lat: 45.6306, lng: 8.7281, country: "IT" },
  VCE: { iata: "VCE", nameKo: "베네치아 마르코 폴로공항", nameEn: "Venice Marco Polo Airport", city: "Venice", cityKey: "venice", lat: 45.5053, lng: 12.3519, country: "IT" },
  NAP: { iata: "NAP", nameKo: "나폴리국제공항", nameEn: "Naples International Airport", city: "Naples", cityKey: "naples", lat: 40.886, lng: 14.2908, country: "IT" },
  BCN: { iata: "BCN", nameKo: "엘프라트공항", nameEn: "Barcelona-El Prat Airport", city: "Barcelona", cityKey: "barcelona", lat: 41.2971, lng: 2.0785, country: "ES" },
  MAD: { iata: "MAD", nameKo: "마드리드 바라하스공항", nameEn: "Adolfo Suárez Madrid-Barajas Airport", city: "Madrid", cityKey: "madrid", lat: 40.4983, lng: -3.5676, country: "ES" },
  LIS: { iata: "LIS", nameKo: "리스본공항", nameEn: "Lisbon Airport", city: "Lisbon", cityKey: "lisbon", lat: 38.7813, lng: -9.1359, country: "PT" },
  OPO: { iata: "OPO", nameKo: "포르토공항", nameEn: "Francisco Sá Carneiro Airport", city: "Porto", cityKey: "porto", lat: 41.2481, lng: -8.6814, country: "PT" },
  AMS: { iata: "AMS", nameKo: "암스테르담 스키폴공항", nameEn: "Amsterdam Schiphol Airport", city: "Amsterdam", cityKey: "amsterdam", lat: 52.3105, lng: 4.7683, country: "NL" },
  BRU: { iata: "BRU", nameKo: "브뤼셀공항", nameEn: "Brussels Airport", city: "Brussels", cityKey: "brussels", lat: 50.9014, lng: 4.4844, country: "BE" },
  ZRH: { iata: "ZRH", nameKo: "취리히공항", nameEn: "Zurich Airport", city: "Zurich", cityKey: "zurich", lat: 47.4647, lng: 8.5492, country: "CH" },
  GVA: { iata: "GVA", nameKo: "제네바공항", nameEn: "Geneva Airport", city: "Geneva", cityKey: "geneva", lat: 46.2381, lng: 6.109, country: "CH" },
  VIE: { iata: "VIE", nameKo: "빈국제공항", nameEn: "Vienna International Airport", city: "Vienna", cityKey: "vienna", lat: 48.1103, lng: 16.5697, country: "AT" },
  PRG: { iata: "PRG", nameKo: "프라하 공항", nameEn: "Václav Havel Airport Prague", city: "Prague", cityKey: "prague", lat: 50.1008, lng: 14.26, country: "CZ" },
  BUD: { iata: "BUD", nameKo: "부다페스트 공항", nameEn: "Budapest Ferenc Liszt International Airport", city: "Budapest", cityKey: "budapest", lat: 47.4298, lng: 19.2611, country: "HU" },
  WAW: { iata: "WAW", nameKo: "바르샤바 쇼팽공항", nameEn: "Warsaw Chopin Airport", city: "Warsaw", cityKey: "warsaw", lat: 52.1657, lng: 20.9671, country: "PL" },
  IST: { iata: "IST", nameKo: "이스탄불 공항", nameEn: "Istanbul Airport", city: "Istanbul", cityKey: "istanbul", lat: 41.2753, lng: 28.7519, country: "TR" },
  SAW: { iata: "SAW", nameKo: "사비하 곡천공항", nameEn: "Sabiha Gökçen International Airport", city: "Istanbul", cityKey: "istanbul", lat: 40.8986, lng: 29.3092, country: "TR" },
  AYT: { iata: "AYT", nameKo: "안탈리아공항", nameEn: "Antalya Airport", city: "Antalya", cityKey: "antalya", lat: 36.8987, lng: 30.8005, country: "TR" },
  DXB: { iata: "DXB", nameKo: "두바이 국제공항", nameEn: "Dubai International Airport", city: "Dubai", cityKey: "dubai", lat: 25.2532, lng: 55.3657, country: "AE" },
  AUH: { iata: "AUH", nameKo: "아부다비국제공항", nameEn: "Abu Dhabi International Airport", city: "Abu Dhabi", cityKey: "abudhabi", lat: 24.433, lng: 54.6511, country: "AE" },
  DOH: { iata: "DOH", nameKo: "하마드국제공항", nameEn: "Hamad International Airport", city: "Doha", cityKey: "doha", lat: 25.2731, lng: 51.6081, country: "QA" },
  RUH: { iata: "RUH", nameKo: "킹 칼리드국제공항", nameEn: "King Khalid International Airport", city: "Riyadh", cityKey: "riyadh", lat: 24.9576, lng: 46.6988, country: "SA" },
  JED: { iata: "JED", nameKo: "킹 압둘아지즈국제공항", nameEn: "King Abdulaziz International Airport", city: "Jeddah", cityKey: "jeddah", lat: 21.6796, lng: 39.1565, country: "SA" },
  DEL: { iata: "DEL", nameKo: "인디라 간디국제공항", nameEn: "Indira Gandhi International Airport", city: "Delhi", cityKey: "delhi", lat: 28.5562, lng: 77.1, country: "IN" },
  BOM: { iata: "BOM", nameKo: "차트라파티 시바지국제공항", nameEn: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", cityKey: "mumbai", lat: 19.0887, lng: 72.8681, country: "IN" },
  BLR: { iata: "BLR", nameKo: "켐페고우다국제공항", nameEn: "Kempegowda International Airport", city: "Bangalore", cityKey: "bangalore", lat: 13.1986, lng: 77.7066, country: "IN" },
  MAA: { iata: "MAA", nameKo: "첸나이국제공항", nameEn: "Chennai International Airport", city: "Chennai", cityKey: "chennai", lat: 12.9941, lng: 80.1709, country: "IN" },
  CCU: { iata: "CCU", nameKo: "네타지 수바스 찬드라 보스국제공항", nameEn: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", cityKey: "kolkata", lat: 22.6546, lng: 88.4467, country: "IN" },
  SYD: { iata: "SYD", nameKo: "킹스포드 스미스 공항", nameEn: "Sydney Kingsford Smith Airport", city: "Sydney", cityKey: "sydney", lat: -33.9399, lng: 151.1753, country: "AU" },
  MEL: { iata: "MEL", nameKo: "멜버른공항", nameEn: "Melbourne Airport", city: "Melbourne", cityKey: "melbourne", lat: -37.6733, lng: 144.8433, country: "AU" },
  BNE: { iata: "BNE", nameKo: "브리즈번공항", nameEn: "Brisbane Airport", city: "Brisbane", cityKey: "brisbane", lat: -27.3842, lng: 153.1175, country: "AU" },
  AKL: { iata: "AKL", nameKo: "오클랜드공항", nameEn: "Auckland Airport", city: "Auckland", cityKey: "auckland", lat: -37.0082, lng: 174.785, country: "NZ" },
  CHC: { iata: "CHC", nameKo: "크라이스트처치공항", nameEn: "Christchurch Airport", city: "Christchurch", cityKey: "christchurch", lat: -43.4894, lng: 172.5322, country: "NZ" },
  JFK: { iata: "JFK", nameKo: "존 F. 케네디 국제공항", nameEn: "John F. Kennedy International Airport", city: "New York", cityKey: "newyork", lat: 40.6413, lng: -73.7781, country: "US" },
  EWR: { iata: "EWR", nameKo: "뉴어크 리버티국제공항", nameEn: "Newark Liberty International Airport", city: "New York", cityKey: "newyork", lat: 40.6895, lng: -74.1745, country: "US" },
  LGA: { iata: "LGA", nameKo: "라과디아공항", nameEn: "LaGuardia Airport", city: "New York", cityKey: "newyork", lat: 40.7769, lng: -73.874, country: "US" },
  LAX: { iata: "LAX", nameKo: "LA 국제공항", nameEn: "Los Angeles International Airport", city: "Los Angeles", cityKey: "losangeles", lat: 33.9416, lng: -118.4085, country: "US" },
  SFO: { iata: "SFO", nameKo: "샌프란시스코국제공항", nameEn: "San Francisco International Airport", city: "San Francisco", cityKey: "sanfrancisco", lat: 37.6213, lng: -122.379, country: "US" },
  ORD: { iata: "ORD", nameKo: "오헤어국제공항", nameEn: "O'Hare International Airport", city: "Chicago", cityKey: "chicago", lat: 41.9742, lng: -87.9073, country: "US" },
  SEA: { iata: "SEA", nameKo: "시애틀 터코마국제공항", nameEn: "Seattle-Tacoma International Airport", city: "Seattle", cityKey: "seattle", lat: 47.4502, lng: -122.3088, country: "US" },
  MIA: { iata: "MIA", nameKo: "마이애미국제공항", nameEn: "Miami International Airport", city: "Miami", cityKey: "miami", lat: 25.7959, lng: -80.287, country: "US" },
  LAS: { iata: "LAS", nameKo: "매카런국제공항", nameEn: "Harry Reid International Airport", city: "Las Vegas", cityKey: "lasvegas", lat: 36.084, lng: -115.1537, country: "US" },
  BOS: { iata: "BOS", nameKo: "로건국제공항", nameEn: "Logan International Airport", city: "Boston", cityKey: "boston", lat: 42.3656, lng: -71.0096, country: "US" },
  IAD: { iata: "IAD", nameKo: "덜레스국제공항", nameEn: "Washington Dulles International Airport", city: "Washington", cityKey: "washington", lat: 38.9531, lng: -77.4565, country: "US" },
  DFW: { iata: "DFW", nameKo: "댈러스 포트워스국제공항", nameEn: "Dallas/Fort Worth International Airport", city: "Dallas", cityKey: "dallas", lat: 32.8998, lng: -97.0403, country: "US" },
  ATL: { iata: "ATL", nameKo: "하츠필드 잭슨 애틀랜타국제공항", nameEn: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", cityKey: "atlanta", lat: 33.6407, lng: -84.4277, country: "US" },
  YYZ: { iata: "YYZ", nameKo: "토론토 피어슨국제공항", nameEn: "Toronto Pearson International Airport", city: "Toronto", cityKey: "toronto", lat: 43.6777, lng: -79.6248, country: "CA" },
  YVR: { iata: "YVR", nameKo: "밴쿠버국제공항", nameEn: "Vancouver International Airport", city: "Vancouver", cityKey: "vancouver", lat: 49.1967, lng: -123.1815, country: "CA" },
  YUL: { iata: "YUL", nameKo: "몬트리올 피에르 트뤼도국제공항", nameEn: "Montréal-Trudeau International Airport", city: "Montreal", cityKey: "montreal", lat: 45.4706, lng: -73.7408, country: "CA" },
  GRU: { iata: "GRU", nameKo: "상파울루 국제공항", nameEn: "São Paulo/Guarulhos International Airport", city: "São Paulo", cityKey: "saopaulo", lat: -23.4356, lng: -46.4731, country: "BR" },
  GIG: { iata: "GIG", nameKo: "리우데자네이루 국제공항", nameEn: "Rio de Janeiro/Galeão International Airport", city: "Rio de Janeiro", cityKey: "riodejaneiro", lat: -22.809, lng: -43.2506, country: "BR" },
  EZE: { iata: "EZE", nameKo: "부에노스아이레스 에세이사공항", nameEn: "Ministro Pistarini International Airport", city: "Buenos Aires", cityKey: "buenosaires", lat: -34.8222, lng: -58.5358, country: "AR" },
  SCL: { iata: "SCL", nameKo: "산티아고국제공항", nameEn: "Arturo Merino Benítez International Airport", city: "Santiago", cityKey: "santiago", lat: -33.393, lng: -70.7858, country: "CL" },
  BOG: { iata: "BOG", nameKo: "엘도라도국제공항", nameEn: "El Dorado International Airport", city: "Bogotá", cityKey: "bogota", lat: 4.7016, lng: -74.1469, country: "CO" },
  LIM: { iata: "LIM", nameKo: "호르헤 차베스국제공항", nameEn: "Jorge Chávez International Airport", city: "Lima", cityKey: "lima", lat: -12.0219, lng: -77.1143, country: "PE" },
  MEX: { iata: "MEX", nameKo: "멕시코시티국제공항", nameEn: "Mexico City International Airport", city: "Mexico City", cityKey: "mexicocity", lat: 19.4363, lng: -99.0721, country: "MX" },
  CUN: { iata: "CUN", nameKo: "칸쿤국제공항", nameEn: "Cancún International Airport", city: "Cancún", cityKey: "cancun", lat: 21.0365, lng: -86.8771, country: "MX" },
  CAI: { iata: "CAI", nameKo: "카이로국제공항", nameEn: "Cairo International Airport", city: "Cairo", cityKey: "cairo", lat: 30.1219, lng: 31.4056, country: "EG" },
  JNB: { iata: "JNB", nameKo: "오리 탐보국제공항", nameEn: "O. R. Tambo International Airport", city: "Johannesburg", cityKey: "johannesburg", lat: -26.1392, lng: 28.246, country: "ZA" },
  CPT: { iata: "CPT", nameKo: "케이프타운국제공항", nameEn: "Cape Town International Airport", city: "Cape Town", cityKey: "capetown", lat: -33.9648, lng: 18.6017, country: "ZA" },
  NBO: { iata: "NBO", nameKo: "조모 케냐타국제공항", nameEn: "Jomo Kenyatta International Airport", city: "Nairobi", cityKey: "nairobi", lat: -1.3192, lng: 36.9278, country: "KE" },
  ADD: { iata: "ADD", nameKo: "볼레국제공항", nameEn: "Addis Ababa Bole International Airport", city: "Addis Ababa", cityKey: "addisababa", lat: 8.9779, lng: 38.7993, country: "ET" },
  CMN: { iata: "CMN", nameKo: "무함마드 5세국제공항", nameEn: "Mohammed V International Airport", city: "Casablanca", cityKey: "casablanca", lat: 33.3675, lng: -7.5898, country: "MA" },
  PNH: { iata: "PNH", nameKo: "프놈펜국제공항", nameEn: "Phnom Penh International Airport", city: "Phnom Penh", cityKey: "phnompenh", lat: 11.5466, lng: 104.8441, country: "KH" },
  REP: { iata: "REP", nameKo: "씨엠립국제공항", nameEn: "Siem Reap International Airport", city: "Siem Reap", cityKey: "siemreap", lat: 13.4107, lng: 103.8128, country: "KH" },
  VTE: { iata: "VTE", nameKo: "왓타이국제공항", nameEn: "Wattay International Airport", city: "Vientiane", cityKey: "vientiane", lat: 17.9883, lng: 102.5633, country: "LA" },
  RGN: { iata: "RGN", nameKo: "양곤국제공항", nameEn: "Yangon International Airport", city: "Yangon", cityKey: "yangon", lat: 16.9073, lng: 96.1332, country: "MM" },
  LPQ: { iata: "LPQ", nameKo: "루앙프라방국제공항", nameEn: "Luang Prabang International Airport", city: "Luang Prabang", cityKey: "luangprabang", lat: 19.8973, lng: 102.1608, country: "LA" },
  NQZ: { iata: "NQZ", nameKo: "아스타나 나자르바예프국제공항", nameEn: "Nursultan Nazarbayev International Airport", city: "Astana", cityKey: "astana", lat: 51.0278, lng: 71.4611, country: "KZ" },
  ALA: { iata: "ALA", nameKo: "알마티국제공항", nameEn: "Almaty International Airport", city: "Almaty", cityKey: "almaty", lat: 43.3521, lng: 77.0405, country: "KZ" },
};

/** @deprecated use VERIFIED_AIRPORTS — 하위 호환 */
export const CITY_AIRPORT: Record<string, VerifiedAirport> = Object.fromEntries(
  Object.values(VERIFIED_AIRPORTS)
    .filter((a, i, arr) => arr.findIndex((x) => x.cityKey === a.cityKey) === i)
    .map((a) => [a.cityKey, a])
);

/** 출발지 선택용 인기 도시 */
export const POPULAR_ORIGIN_CITIES = [
  "Seoul", "Busan", "Jeju", "Tokyo", "Osaka", "Singapore", "Bangkok",
  "Taipei", "Hong Kong", "London", "Paris", "New York", "Los Angeles",
  "Sydney", "Dubai", "Istanbul", "Da Nang", "Barcelona", "Rome", "Berlin",
  "Kyoto", "Munich", "Prague", "Hanoi", "Ho Chi Minh City",
] as const;

function norm(city: string) {
  return city.trim().toLowerCase().replace(/[\s_-]/g, "");
}

export function resolveCityInput(city: string) {
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  return CITY_ALIASES[lower] ?? CITY_ALIASES[norm(trimmed)] ?? trimmed;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

type NearestOptions = {
  countryCode?: string;
  maxKm?: number;
  cityName?: string;
};

/** 도시 좌표에서 가장 가까운 IATA 등록 공항 */
export function findNearestAirport(
  lat: number,
  lng: number,
  options?: NearestOptions
): VerifiedAirport | null {
  const all = Object.values(VERIFIED_AIRPORTS);
  const maxKm = options?.maxKm ?? 350;

  const pickNearest = (candidates: VerifiedAirport[]) => {
    let best: VerifiedAirport | null = null;
    let bestKm = Infinity;
    for (const airport of candidates) {
      const km = haversineKm({ lat, lng }, airport);
      if (km < bestKm) {
        bestKm = km;
        best = airport;
      }
    }
    return best && bestKm <= maxKm ? { airport: best, km: bestKm } : null;
  };

  if (options?.countryCode) {
    const cc = options.countryCode.toUpperCase();
    const local = all.filter((a) => a.country.toUpperCase() === cc);
    const localHit = pickNearest(local);
    if (localHit) return localHit.airport;
  }

  const globalHit = pickNearest(all);
  return globalHit?.airport ?? null;
}

export function resolveAirportByIata(iata: string): VerifiedAirport | null {
  const code = iata.trim().toUpperCase();
  if (!VERIFIED_IATA.has(code)) return null;
  return VERIFIED_AIRPORTS[code] ?? null;
}

/** 동기 — IATA 코드·별칭·정확한 도시명만 */
export function resolveCityAirport(city: string): VerifiedAirport | null {
  const trimmed = city.trim();
  if (/^[a-zA-Z]{3}$/.test(trimmed)) {
    return resolveAirportByIata(trimmed);
  }

  const resolved = resolveCityInput(trimmed);
  const key = norm(resolved);

  const byKey = Object.values(VERIFIED_AIRPORTS).find(
    (a) => a.cityKey === key || norm(a.city) === key
  );
  if (byKey) return byKey;

  const byCity = Object.values(VERIFIED_AIRPORTS).find(
    (a) => a.city.toLowerCase() === resolved.toLowerCase()
  );
  return byCity ?? null;
}

/** 비동기 — 도시 지오코딩 후 가장 가까운 공항 */
export async function resolveCityAirportAsync(city: string): Promise<VerifiedAirport | null> {
  const trimmed = city.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z]{3}$/.test(trimmed)) {
    return resolveAirportByIata(trimmed);
  }

  const resolved = resolveCityInput(trimmed);
  const geo = await geocodeCity(resolved);
  if (geo) {
    const nearest = findNearestAirport(geo.lat, geo.lng, {
      countryCode: geo.countryCode,
      cityName: resolved,
    });
    if (nearest) return nearest;
  }

  return resolveCityAirport(resolved);
}

/** Wikivoyage에서 파싱한 코드 — 화이트리스트·거리 검증 후 사용 */
export function resolveDestinationAirport(
  city: string,
  wikivoyageIata?: string,
  cityCoords?: { lat: number; lng: number }
): VerifiedAirport | null {
  if (wikivoyageIata && cityCoords) {
    const code = wikivoyageIata.trim().toUpperCase();
    if (VERIFIED_IATA.has(code)) {
      const fromIata = resolveAirportByIata(code);
      if (fromIata) {
        const dist = haversineKm(fromIata, cityCoords);
        if (dist <= 200) return fromIata;
      }
    }
  }

  if (cityCoords) {
    const nearest = findNearestAirport(cityCoords.lat, cityCoords.lng, { cityName: city });
    if (nearest) return nearest;
  }

  return resolveCityAirport(city);
}

export function airportLabel(airport: VerifiedAirport, locale: "ko" | "en") {
  const name = locale === "en" ? airport.nameEn : airport.nameKo;
  return `${airport.city} · ${name} (${airport.iata})`;
}

export function airportDistanceKm(
  airport: VerifiedAirport,
  coords: { lat: number; lng: number }
) {
  return Math.round(haversineKm(airport, coords));
}
