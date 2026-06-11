/** Wikivoyage 본문에서 항공·숙소 정보를 무료 파싱 (환각 없이 문서에 있는 것만) */

export type ParsedFlightInfo = {
  destinationAirport?: string;
  destinationAirportName?: string;
  airlines: string[];
  notes: string[];
};

export type ParsedLodging = {
  name: string;
  why: string;
  category: "hotel" | "hostel" | "inn" | "other";
};

const KNOWN_AIRLINES = [
  "Korean Air", "Asiana", "Jeju Air", "T'way", "Jin Air", "Air Premia",
  "Japan Airlines", "ANA", "All Nippon", "Singapore Airlines", "Thai Airways",
  "Cathay Pacific", "Emirates", "Qatar Airways", "British Airways", "Air France",
  "Lufthansa", "Vietnam Airlines", "EVA Air", "China Airlines", "Scoot",
  "AirAsia", "Jetstar", "United", "Delta", "American Airlines",
];

const AIRPORT_CODE = /\b([A-Z]{3})\b/g;

function sectionText(extract: string, heading: string) {
  const re = new RegExp(`==\\s*${heading}\\s*==([\\s\\S]*?)(?=\\n==|$)`, "i");
  return re.exec(extract)?.[1]?.trim() ?? "";
}

function sleepSection(extract: string) {
  return sectionText(extract, "Sleep") || sectionText(extract, "Accommodation");
}

function getInSection(extract: string) {
  const byPlane = sectionText(extract, "By plane");
  if (byPlane) return byPlane;
  const getIn = sectionText(extract, "Get in");
  if (/airport|flight|plane/i.test(getIn)) return getIn;
  return getIn.slice(0, 1200);
}

export function parseFlightInfoFromWikivoyage(extract: string, city: string): ParsedFlightInfo {
  const text = getInSection(extract);
  const airlines = KNOWN_AIRLINES.filter((name) => text.includes(name));
  const notes: string[] = [];

  const airportLine = text.split("\n").find((line) => /airport|ICN|international/i.test(line));
  if (airportLine) notes.push(airportLine.replace(/^\*\s*/, "").trim().slice(0, 200));

  const codes = [...text.matchAll(AIRPORT_CODE)].map((m) => m[1]).filter((c) => c !== "ICN" && c !== "SEL");
  const destCode = codes[0];

  if (/direct flight|non-stop|nonstop/i.test(text)) {
    notes.push(`${city} 직항편이 Wikivoyage에 언급되어 있습니다.`);
  }
  if (/connect|transfer|stopover/i.test(text)) {
    notes.push("경유편이 일반적일 수 있습니다 — 검색 링크에서 경유 옵션을 비교하세요.");
  }

  return {
    destinationAirport: destCode,
    destinationAirportName: destCode ? `${city} (${destCode})` : undefined,
    airlines,
    notes,
  };
}

function lodgingCategory(name: string, desc: string): ParsedLodging["category"] {
  const hay = `${name} ${desc}`.toLowerCase();
  if (/hostel|dorm|backpack/i.test(hay)) return "hostel";
  if (/guest\s*house|pension|minbak|ryokan|inn/i.test(hay)) return "inn";
  if (/hotel|resort|suite/i.test(hay)) return "hotel";
  return "other";
}

export function parseLodgingFromWikivoyage(extract: string, max = 4): ParsedLodging[] {
  const section = sleepSection(extract);
  if (!section) return [];

  const listings: ParsedLodging[] = [];
  const seen = new Set<string>();

  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("*")) continue;
    const cleaned = line.replace(/^\*\s*/, "").trim();
    const match =
      cleaned.match(/^'{2,3}([^']+)'{2,3}\s*[—–-]\s*(.+)$/i) ??
      cleaned.match(/^(.+?)\s*[—–-]\s*(.+)$/);
    if (!match) continue;

    const name = match[1].replace(/\[.*?\]/g, "").trim();
    const why = match[2].replace(/\[.*?\]/g, "").trim();
    if (name.length < 3 || name.length > 80 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    listings.push({
      name,
      why: why.slice(0, 220),
      category: lodgingCategory(name, why),
    });
    if (listings.length >= max) break;
  }

  return listings;
}
