import type { Locale } from "./i18n";
import type { ThemeId } from "./themes";
import type { PlaceCandidate } from "./tripTypes";

/** 신앙 등 — 테마 밖 장소를 섞으면 안 되는 엄격 테마 */
export const STRICT_THEMES: ThemeId[] = ["faith_heritage"];

export function isStrictTheme(themeId: ThemeId): boolean {
  return STRICT_THEMES.includes(themeId);
}

/** 일정에 필요한 최소 서로 다른 장소 수 */
export function minPlacesForTrip(days: number): number {
  return Math.max(8, days * 3);
}

export function maxPlacePoolSize(days: number): number {
  return Math.min(28, Math.max(14, days * 4));
}

function dedupeKey(place: PlaceCandidate) {
  return place.title.trim().toLowerCase().replace(/\s+/g, "");
}

/** 테마 장소 우선 + 도시 일반 하이라이트 보충 */
export function blendPlacePools(
  themePlaces: PlaceCandidate[],
  generalPlaces: PlaceCandidate[],
  themeId: ThemeId,
  targetCount: number,
  locale: Locale = "ko"
): PlaceCandidate[] {
  const seen = new Set<string>();
  const out: PlaceCandidate[] = [];

  const themeTag = locale === "en" ? "[Theme focus]" : "[테마 우선]";
  const cityTag = locale === "en" ? "[City highlight]" : "[도시 일반]";

  for (const place of themePlaces) {
    const key = dedupeKey(place);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...place,
      qualityScore: (place.qualityScore ?? 0) + 22,
      angle: place.angle?.includes(themeTag) ? place.angle : `${themeTag} ${place.angle ?? ""}`.trim(),
    });
  }

  for (const place of generalPlaces) {
    if (out.length >= targetCount + 4) break;
    if ((place.qualityScore ?? 0) < 52) continue;
    const key = dedupeKey(place);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...place,
      angle: `${cityTag} ${place.angle ?? ""}`.trim(),
    });
  }

  return out.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
}

export function blendRationale(themeId: ThemeId, locale: Locale, themeCount: number, total: number): string {
  if (isStrictTheme(themeId)) {
    return locale === "en"
      ? "Faith & heritage theme — only registered religious heritage sites, no mixed nightlife or bars."
      : "신앙 테마 — 등록 종교·문화유적만 포함하며 클럽·술집 등은 섞지 않습니다.";
  }
  if (total <= themeCount) {
    return "";
  }
  return locale === "en"
    ? `Theme focus on ${themeCount} places; ${total - themeCount} general city highlights fill longer trips.`
    : `테마 중심 ${themeCount}곳 + 나머지 ${total - themeCount}곳은 도시 대표 명소로 일정을 채웠습니다.`;
}
