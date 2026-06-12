/** 여행 '장소'가 아닌 Wikipedia·메타 항목 제외 */

const JUNK_TITLE = [
  /^wikivoyage:/i,
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
  if (JUNK_TITLE.some((re) => re.test(t))) return true;
  if (why && JUNK_WHY.test(why)) return true;
  return false;
}
