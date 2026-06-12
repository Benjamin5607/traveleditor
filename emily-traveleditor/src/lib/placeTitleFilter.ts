/** 여행 '장소'가 아닌 Wikipedia·메타 항목 제외 */

/** Wikivoyage 도시 문서 자체 (예: "Wikivoyage: Bangkok") — 장소가 아님 */
export function isWikivoyageMetaPage(title: string): boolean {
  return /^wikivoyage:\s*/i.test(title.trim());
}

const JUNK_TITLE = [
  /^wikivoyage:\s*/i,
  /\(TV series\)/i,
  /\(film\)/i,
  /\(video game\)/i,
  /\(album\)/i,
  /\(song\)/i,
  /\(novel\)/i,
  /\(band\)/i,
  /\(company\)/i,
  /\(airline\)/i,
  /^Islam in /i,
  /^Iranians in /i,
  /^Koreans in /i,
  /^Chinese in /i,
  /^History of /i,
  /^Demographics of /i,
  /^Economy of /i,
  /^Transport in /i,
  /^List of /i,
  /^Category:/i,
  /district$/i,
  /prefecture$/i,
  /metropolis$/i,
  /^Tokyo$/i,
  /^Seoul$/i,
  /^Bangkok$/i,
  /^Osaka$/i,
];

const JUNK_WHY =
  /TV series|memoir by|crime drama|figurative painter|diaspora|minority group|migrants in the country/i;

export function isJunkPlaceTitle(title: string, why?: string): boolean {
  const t = title.trim();
  if (t.length < 2) return true;
  if (isWikivoyageMetaPage(t)) return true;
  if (JUNK_TITLE.some((re) => re.test(t))) return true;
  if (why && JUNK_WHY.test(why)) return true;
  if (why && /^wikivoyage:\s*/i.test(why)) return true;
  return false;
}

/** 추천 장소 목록 최종 게이트 */
export function filterValidPlaceCandidates<T extends { title: string; why?: string; angle?: string }>(
  places: T[]
): T[] {
  return places.filter(
    (p) => !isJunkPlaceTitle(p.title, p.why ?? p.angle)
  );
}
