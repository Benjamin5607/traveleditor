/** 여행 '장소'가 아닌 Wikipedia·메타·이벤트·컨셉 항목 제외 — 실제 POI만 통과 */

import type { PlaceSource } from "./placeQuality";

/** Wikivoyage 도시 문서 자체 (예: "Wikivoyage: Bangkok") */
export function isWikivoyageMetaPage(title: string): boolean {
  return /^wikivoyage:\s*/i.test(title.trim());
}

const POI_WIKIVOYAGE_SECTIONS = /^(see|do|eat|drink|buy|sleep)$/i;

/** 이벤트·사건·방송·추상 투어 컨셉 등 비-장소 제목 */
const NON_PHYSICAL_TITLE = [
  /^wikivoyage:\s*/i,
  /\(TV series\)/i,
  /\(miniseries\)/i,
  /\(film\)/i,
  /\(documentary\)/i,
  /\(video game\)/i,
  /\(album\)/i,
  /\(song\)/i,
  /\(novel\)/i,
  /\(book\)/i,
  /\(memoir\)/i,
  /\(band\)/i,
  /\(company\)/i,
  /\(airline\)/i,
  /\(season \d+\)/i,
  /^the amazing race/i,
  /^Islam in /i,
  /^Iranians in /i,
  /^Indians in /i,
  /^Koreans in /i,
  /^Chinese in /i,
  /^History of /i,
  /^Demographics of /i,
  /^Economy of /i,
  /^Transport in /i,
  /^List of /i,
  /^Category:/i,
  /\bscandal\b/i,
  /\b(bombings?|attacks?|assassination|massacre|riot|protests?)\b/i,
  /\b\d{4}\s+\w+\s+(bombings?|attacks?|war|crash|disaster|scandal|elections?)\b/i,
  /vice \(TV/i,
  /크래프트 비어 투어/i,
  /와인 투어/i,
  /맥주 투어/i,
  /craft beer tour/i,
  /wine tour/i,
  /beer tour/i,
  /food tour$/i,
  /city tour$/i,
  /walking tour$/i,
  /guided tour$/i,
  /^tour of /i,
  /(방콕|도쿄|서울|오사카|싱가포르|파리|런던|뉴욕).+(투어|투어)$/i,
  /^Tokyo$/i,
  /^Seoul$/i,
  /^Bangkok$/i,
  /^Osaka$/i,
  /^Singapore$/i,
  /^Pattaya$/i,
  /^Ansan$/i,
  /^Chōfu$/i,
  /^Adachi, Tokyo$/i,
];

/** Wikipedia 요약에서 비-장소(사건·방송·인물·도시 전체) 신호 */
const NON_PHYSICAL_WHY = [
  /TV series|television series|crime drama|reality competition|reality show/i,
  /memoir by|novel by|created by .+ based on the \d{4}/i,
  /were a series of (explosions|attacks)/i,
  /occurred in .+ on \d{1,2} /i,
  /injuring \d+ people|botched attempt|were arrested and charged/i,
  /applications were accepted|teams of two|hosted by /i,
  /figurative painter|journalist investigating|was canceled after/i,
  /diaspora|minority group|migrants in the country/i,
  /competition show based on the American series/i,
  /is an American (crime|reality)/i,
  /entertainment and sex scandal/i,
  /^wikivoyage:\s*/i,
  /^[A-Z][a-z]+ is a city in /,
  /^[A-Z][a-z]+ is a (special )?ward of /,
  /is one of the \d+ districts of /i,
  /born .+ is a (British|American|Japanese)/i,
];

/** 실제 방문 가능한 시설·랜드마크 신호 */
const PHYSICAL_PLACE_SIGNALS = [
  /temple|shrine|mosque|church|cathedral|monastery|pagoda|stupa|wat\b|synagogue/i,
  /museum|gallery|palace|castle|fort|tower|bridge|monument|memorial(?! day)/i,
  /park|garden|zoo|aquarium|beach|island|harbor|harbour|market|bazaar/i,
  /plaza|square|station|terminal|airport|stadium|arena|theatre|theater|opera/i,
  /restaurant|café|cafe|bistro|pub|brewery|winery|distillery|bar\b|nightclub/i,
  /hotel|hostel|inn\b|spa\b|onsen|mall|department store|boutique/i,
  /사원|성당|사찰|신사|모스크|박물관|미술관|궁|성|공원|정원|시장|해변|섬|역|항/i,
  /寺|神社|ワイナリー|醸造|วัด|ตลาด/i,
  /district$|neighborhood|quarter|old town|downtown/i,
  /insa-dong|myeong-dong|asakusa|shibuya|shinjuku|siam|sukhumvit|chatuchak|itaewon|roppongi|khaosan/i,
  /인사동|명동|이태원|신주쿠|시부야|아사쿠사|차투차크|카오산|실롬|방콕/i,
  /road$|street$|building$|greenhouse|온실|dome$/i,
  /-dong$|동$/i,
];

const TRUSTED_PHYSICAL_SOURCES: PlaceSource[] = [
  "osm",
  "nominatim",
  "photon",
  "wikidata",
];

function hasPhysicalPlaceSignal(text: string): boolean {
  return PHYSICAL_PLACE_SIGNALS.some((re) => re.test(text));
}

export function isJunkPlaceTitle(title: string, why?: string): boolean {
  return !isPhysicalPlace(title, why);
}

/**
 * 실제 존재하는 방문 장소(POI)인지 판별.
 * OSM·Wikidata 등은 이미 물리 좌표 기반이므로 완화, Wikipedia·정적 JSON은 엄격.
 */
export function isPhysicalPlace(
  title: string,
  why?: string,
  options?: {
    lat?: number;
    lng?: number;
    source?: PlaceSource;
    wikivoyageSection?: string;
  }
): boolean {
  const t = title.trim();
  if (t.length < 2) return false;
  if (isWikivoyageMetaPage(t)) return false;

  const hay = `${t} ${why ?? ""}`;

  if (NON_PHYSICAL_TITLE.some((re) => re.test(t))) return false;
  if (NON_PHYSICAL_WHY.some((re) => re.test(hay))) return false;

  const source = options?.source;
  const hasCoords =
    options?.lat != null &&
    options?.lng != null &&
    !Number.isNaN(options.lat) &&
    !Number.isNaN(options.lng);

  if (source === "wikivoyage" && options?.wikivoyageSection) {
    if (!POI_WIKIVOYAGE_SECTIONS.test(options.wikivoyageSection)) return false;
    return true;
  }

  if (source && TRUSTED_PHYSICAL_SOURCES.includes(source) && hasCoords) {
    return true;
  }

  if (source === "wikipedia") {
    if (!hasCoords) return false;
    return hasPhysicalPlaceSignal(hay);
  }

  if (hasCoords && hasPhysicalPlaceSignal(hay)) {
    return true;
  }

  if (
    hasCoords &&
    /^[\uac00-\ud7a3\u3040-\u30ff\u4e00-\u9fff][\uac00-\ud7a3\u3040-\u30ff\u4e00-\u9fff\s]{1,18}$/.test(t)
  ) {
    return true;
  }

  if (hasCoords && /^[A-Z0-9가-힣][\w\s.'-가-힣]{2,60}$/.test(t) && !/\d{4}/.test(t)) {
    const wordCount = t.split(/\s+/).length;
    if (wordCount >= 1 && wordCount <= 6) {
      if (hasPhysicalPlaceSignal(t)) return true;
    }
  }

  return hasPhysicalPlaceSignal(t);
}

/** 추천 장소 목록 최종 게이트 — 좌표 있는 실제 POI만 */
export function filterValidPlaceCandidates<
  T extends { title: string; why?: string; angle?: string; lat?: number; lng?: number; qualityScore?: number },
>(places: T[], options?: { requireCoords?: boolean }): T[] {
  const requireCoords = options?.requireCoords ?? true;

  return places.filter((p) => {
    const sourceMatch = p.angle?.match(/\[(OSM|NOMINATIM|PHOTON|WIKIDATA|WIKIVOYAGE|WIKIPEDIA)/i);
    const source = sourceMatch?.[1]?.toLowerCase() as PlaceSource | undefined;
    const wikivoyageSection = p.angle?.match(/Wikivoyage (See|Do|Eat|Drink|Buy|Sleep)/i)?.[1];

    if (
      !isPhysicalPlace(p.title, p.why ?? p.angle, {
        lat: p.lat,
        lng: p.lng,
        source,
        wikivoyageSection,
      })
    ) {
      return false;
    }

    if (requireCoords && (p.lat == null || p.lng == null)) {
      return false;
    }

    return true;
  });
}
