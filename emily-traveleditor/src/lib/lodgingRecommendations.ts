import { buildGoogleMapsPlaceUrl } from "./placeLinks";
import type { Locale } from "./i18n";
import type { LodgingId, LodgingRecommendation } from "./tripTypes";
import { parseLodgingFromWikivoyage } from "./wikivoyageParser";

function matchesLodgingPref(category: string, lodging: LodgingId) {
  if (lodging === "none") return false;
  if (lodging === "hostel") return category === "hostel" || category === "inn";
  if (lodging === "inn") return category === "inn" || category === "hostel" || category === "hotel";
  return category === "hotel" || category === "inn" || category === "other";
}

function bookingUrlFor(city: string, name: string, lodging: LodgingId) {
  const q = encodeURIComponent(`${name} ${city}`);
  if (lodging === "hostel") return `https://www.hostelworld.com/st/hostels/${encodeURIComponent(city)}/`;
  return `https://www.booking.com/searchresults.html?ss=${q}`;
}

function lodgingLabel(lodging: LodgingId, locale: Locale) {
  if (locale === "en") {
    if (lodging === "hostel") return "hostel";
    if (lodging === "inn") return "guesthouse";
    return "hotel";
  }
  if (lodging === "hostel") return "호스텔";
  if (lodging === "inn") return "게스트하우스";
  return "호텔";
}

export function buildLodgingRecommendations(
  city: string,
  lodging: LodgingId,
  wikivoyageExtract?: string,
  locale: Locale = "ko"
): LodgingRecommendation[] {
  if (lodging === "none") return [];

  const parsed = wikivoyageExtract ? parseLodgingFromWikivoyage(wikivoyageExtract) : [];
  const filtered = parsed.filter((item) => matchesLodgingPref(item.category, lodging));
  const picks = (filtered.length ? filtered : parsed).slice(0, 3);

  if (picks.length) {
    return picks.map((item) => ({
      name: item.name,
      why:
        item.why ||
        (locale === "en"
          ? `${item.name} — listed in Wikivoyage Sleep for ${city}.`
          : `Wikivoyage Sleep 섹션에 소개된 ${city} 숙소입니다.`),
      category: item.category,
      mapsUrl: buildGoogleMapsPlaceUrl(city, { title: item.name }),
      bookingUrl: bookingUrlFor(city, item.name, lodging),
      source: "wikivoyage" as const,
    }));
  }

  const label = lodgingLabel(lodging, locale);
  return [
    {
      name: locale === "en" ? `Search ${label}s in ${city}` : `${city} ${label} 검색`,
      why:
        locale === "en"
          ? `No named stays in Wikivoyage — opening a ${label} search. Filter by budget and area.`
          : `Wikivoyage에 구체 숙소명이 없어 ${label} 유형 검색 링크로 대체했습니다. 예산·위치 필터를 적용해 선택하세요.`,
      category: lodging,
      mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(`${label} in ${city}`)}`,
      bookingUrl:
        lodging === "hostel"
          ? `https://www.hostelworld.com/st/hostels/${encodeURIComponent(city)}/`
          : `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}`,
      source: "search" as const,
    },
  ];
}
