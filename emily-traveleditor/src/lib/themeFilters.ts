import { isAdministrativePlace } from "./placeTitleFilter";
import type { ThemeId } from "./themes";
import type { PlaceCandidate } from "./tripTypes";

/** 테마 무관 도시 하이라이트 — 유연 테마 일정 보충용 */
export const GENERAL_CITY_OSM: Array<{ filter: string; label: string }> = [
  { filter: '["tourism"="attraction"]', label: "명소" },
  { filter: '["tourism"="museum"]', label: "박물관" },
  { filter: '["tourism"="viewpoint"]', label: "전망" },
  { filter: '["amenity"="marketplace"]', label: "시장" },
  { filter: '["historic"="monument"]', label: "랜드마크" },
  { filter: '["leisure"="park"]', label: "공원" },
  { filter: '["tourism"="gallery"]', label: "갤러리" },
];

export const GENERAL_PHOTON_TAGS = [
  "tourism:attraction",
  "tourism:museum",
  "tourism:viewpoint",
  "amenity:marketplace",
];

/** 테마별 OSM Overpass 필터 */
export const THEME_OSM: Record<ThemeId, Array<{ filter: string; label: string }>> = {
  peace_calm: [
    { filter: '["amenity"="cafe"]', label: "카페" },
    { filter: '["shop"="tea"]', label: "티숍" },
    { filter: '["leisure"="garden"]', label: "정원" },
    { filter: '["tourism"="museum"]', label: "박물관" },
  ],
  drink_craft: [
    { filter: '["craft"="brewery"]', label: "브루어리" },
    { filter: '["craft"="winery"]', label: "와이너리" },
    { filter: '["craft"="distillery"]', label: "증류소" },
    { filter: '["amenity"="pub"]', label: "펍" },
  ],
  yolo_night: [
    { filter: '["amenity"="nightclub"]', label: "클럽" },
    { filter: '["amenity"="bar"]', label: "바" },
    { filter: '["amenity"="biergarten"]', label: "비어가든" },
  ],
  faith_heritage: [
    { filter: '["historic"="church"]', label: "역사 교회" },
    { filter: '["historic"="monastery"]', label: "역사 수도원" },
    { filter: '["amenity"="monastery"]', label: "수도원" },
    { filter: '["heritage"]', label: "문화유산" },
    { filter: '["historic"="temple"]', label: "역사 사원" },
    { filter: '["historic"="mosque"]', label: "역사 모스크" },
  ],
  nature_trail: [
    { filter: '["natural"="beach"]["name"]', label: "해변" },
    { filter: '["natural"="beach"]["wikidata"]', label: "해변(위키데이터)" },
    { filter: '["leisure"="beach_resort"]["name"]', label: "해변 리조트" },
    { filter: '["leisure"="nature_reserve"]', label: "자연보호구역" },
    { filter: '["boundary"="national_park"]', label: "국립공원" },
    { filter: '["natural"="peak"]', label: "전망봉우리" },
    { filter: '["tourism"="viewpoint"]', label: "전망대" },
  ],
  art_culture: [
    { filter: '["tourism"="museum"]', label: "박물관" },
    { filter: '["tourism"="gallery"]', label: "갤러리" },
    { filter: '["amenity"="theatre"]', label: "공연장" },
    { filter: '["amenity"="arts_centre"]', label: "문화센터" },
  ],
  food_market: [
    { filter: '["amenity"="marketplace"]', label: "시장" },
    { filter: '["shop"="greengrocer"]', label: "재래시장" },
    { filter: '["amenity"="food_court"]', label: "푸드코트" },
    { filter: '["amenity"="restaurant"]["cuisine"]', label: "요리 태그 맛집" },
    { filter: '["amenity"="restaurant"]["tourism"="attraction"]', label: "관광 맛집" },
    { filter: '["amenity"="restaurant"]["wikidata"]', label: "위키데이터 등록 맛집" },
  ],
  history_heritage: [
    { filter: '["historic"="castle"]', label: "성" },
    { filter: '["historic"="monument"]', label: "기념비" },
    { filter: '["historic"="archaeological_site"]', label: "유적" },
    { filter: '["heritage"]', label: "문화유산" },
  ],
  family_fun: [
    { filter: '["tourism"="zoo"]', label: "동물원" },
    { filter: '["tourism"="aquarium"]', label: "수족관" },
    { filter: '["tourism"="theme_park"]', label: "테마파크" },
    { filter: '["tourism"="museum"]', label: "과학관" },
  ],
  wellness_spa: [
    { filter: '["leisure"="spa"]', label: "스파" },
    { filter: '["amenity"="public_bath"]', label: "공중탕" },
    { filter: '["natural"="hot_spring"]', label: "온천" },
    { filter: '["leisure"="fitness_centre"]', label: "요가·피트니스" },
  ],
  shopping_style: [
    { filter: '["shop"="clothes"]', label: "패션" },
    { filter: '["shop"="boutique"]', label: "부티크" },
    { filter: '["shop"="department_store"]', label: "백화점" },
    { filter: '["amenity"="marketplace"]', label: "플리마켓" },
  ],
  photo_landmark: [
    { filter: '["natural"="beach"]["name"]', label: "해변" },
    { filter: '["natural"="beach"]["wikidata"]', label: "해변(위키데이터)" },
    { filter: '["tourism"="attraction"]', label: "명소" },
    { filter: '["tourism"="viewpoint"]', label: "전망" },
    { filter: '["man_made"="tower"]', label: "타워" },
    { filter: '["historic"="monument"]', label: "랜드마크" },
  ],
};

export const THEME_PHOTON_TAGS: Record<ThemeId, string[]> = {
  peace_calm: ["amenity:cafe", "shop:tea", "leisure:garden"],
  drink_craft: ["craft:brewery", "craft:winery", "craft:distillery"],
  yolo_night: ["amenity:nightclub", "amenity:bar"],
  faith_heritage: ["historic:church", "historic:monastery", "heritage"],
  nature_trail: ["natural:beach", "leisure:nature_reserve", "tourism:viewpoint", "natural:peak"],
  art_culture: ["tourism:museum", "tourism:gallery", "amenity:theatre"],
  food_market: ["amenity:marketplace", "amenity:food_court"],
  history_heritage: ["historic:castle", "historic:monument", "heritage"],
  family_fun: ["tourism:zoo", "tourism:aquarium", "tourism:theme_park"],
  wellness_spa: ["leisure:spa", "natural:hot_spring"],
  shopping_style: ["shop:clothes", "shop:boutique", "shop:department_store"],
  photo_landmark: ["natural:beach", "tourism:attraction", "tourism:viewpoint", "man_made:tower"],
};

export const THEME_WIKIDATA_TYPES: Record<ThemeId, string[]> = {
  peace_calm: ["wd:Q30022", "wd:Q136222", "wd:Q167346"],
  drink_craft: ["wd:Q156362", "wd:Q131734", "wd:Q185583"],
  yolo_night: ["wd:Q622425", "wd:Q187456"],
  faith_heritage: ["wd:Q16970", "wd:Q44613", "wd:Q32815", "wd:Q839954", "wd:Q56242215"],
  nature_trail: ["wd:Q40080", "wd:Q46169", "wd:Q8502", "wd:Q271669"],
  art_culture: ["wd:Q33506", "wd:Q207694", "wd:Q24354"],
  food_market: ["wd:Q132510", "wd:Q11707"],
  history_heritage: ["wd:Q839954", "wd:Q23413", "wd:Q16560"],
  family_fun: ["wd:Q43501", "wd:Q23397", "wd:Q194195"],
  wellness_spa: ["wd:Q1065424", "wd:Q180111"],
  shopping_style: ["wd:Q11315", "wd:Q213441"],
  photo_landmark: ["wd:Q40080", "wd:Q570116", "wd:Q41176", "wd:Q12544"],
};

export const THEME_SLOT_REASON: Record<ThemeId, string> = {
  peace_calm: "차·커피·산책은 한적한 오전·오후가 적합해 이 시간대를 썼습니다.",
  drink_craft: "와이너리·브루어리 투어는 점심 이후 운영이 많아 오전·오후·저녁으로 배치했습니다.",
  yolo_night: "클럽·바는 밤 시간대가 핵심이라 저녁·심야 슬롯을 우선했습니다.",
  faith_heritage: "문화유산 사찰·성당은 이른 오전·오후에 방문하기 좋아 조용한 시간대를 택했습니다.",
  nature_trail: "트레킹·전망은 일출·오전·오후 황금시간대를 우선했습니다.",
  art_culture: "미술관·전시는 오전·오후 관람 시간에 맞췄습니다.",
  food_market: "시장·맛집은 아침 시장·점심·저녁 식사 시간에 맞췄습니다.",
  history_heritage: "역사 유적은 오전·오후 관람에 적합한 시간대로 배치했습니다.",
  family_fun: "가족 체험은 오전·오후·늦은 오후 슬롯으로 아이 컨디션을 고려했습니다.",
  wellness_spa: "스파·온천은 오전·오후·저녁 휴식 시간에 맞췄습니다.",
  shopping_style: "쇼핑은 점심 전후·저녁 시간대 매장 운영에 맞췄습니다.",
  photo_landmark: "랜드마크·야경은 낮·황금시간·야경 슬롯을 포함했습니다.",
};

export const THEME_SLOTS: Record<ThemeId, string[]> = {
  peace_calm: ["09:30", "14:00", "16:30"],
  drink_craft: ["11:00", "14:30", "17:00"],
  yolo_night: ["18:00", "21:00", "23:00"],
  faith_heritage: ["08:30", "11:00", "15:00"],
  nature_trail: ["07:30", "11:00", "15:30"],
  art_culture: ["10:00", "14:00", "16:00"],
  food_market: ["09:00", "12:30", "18:00"],
  history_heritage: ["09:00", "13:00", "16:00"],
  family_fun: ["10:00", "13:30", "16:30"],
  wellness_spa: ["10:00", "14:00", "17:00"],
  shopping_style: ["11:00", "14:00", "17:30"],
  photo_landmark: ["08:00", "12:00", "17:00", "19:30"],
};

const FAITH_REJECT_TITLE =
  /district|in korea|in japan|in thailand|road|halal travel|islam in|diaspora|neighborhood|community|backpacker|khaosan/i;

const FAITH_ACCEPT_TITLE =
  /temple|shrine|cathedral|basilica|mosque|monastery|abbey|wat |wat$|church of|pagoda|stupa|grotto|sanctuary|chapel|heritage|unesco|historic/i;

/** 신앙 테마: 유적·문화유산 등록 종교 건축만 통과 */
export function passesFaithHeritageFilter(title: string, why?: string): boolean {
  if (FAITH_REJECT_TITLE.test(title)) return false;
  const combined = `${title} ${why ?? ""}`.toLowerCase();
  if (/historic|heritage|unesco|문화유산|역사|유적|registered|national treasure|world heritage/.test(combined)) {
    return true;
  }
  if (FAITH_ACCEPT_TITLE.test(title)) return true;
  return false;
}

const THEME_RELEVANCE: Record<ThemeId, RegExp> = {
  peace_calm: /cafe|coffee|tea|garden|museum|park|spa|조용|차|카페|정원|박물관/i,
  drink_craft: /brewery|winery|distillery|pub|bar|와이너리|양조|브루|증류|醸造|ワイナリー/i,
  yolo_night: /club|bar|night|pub|lounge|biergarten|클럽|바|나이트|nightclub/i,
  faith_heritage: FAITH_ACCEPT_TITLE,
  nature_trail: /beach|park|trail|hike|viewpoint|mountain|forest|reserve|peak|해변|공원|트레킹|전망|国立公園/i,
  art_culture: /museum|gallery|theatre|theater|arts|exhibit|박물관|미술|공연|갤러리/i,
  food_market: /market|food|restaurant|cuisine|street food|시장|맛집|푸드|요리|marketplace/i,
  history_heritage: /castle|monument|heritage|historic|palace|ruins|유적|궁|성|문화유산|세계유산/i,
  family_fun: /zoo|aquarium|theme park|amusement|family|동물원|수족관|테마파크/i,
  wellness_spa: /spa|onsen|hot spring|bath|wellness|온천|스파|사우나/i,
  shopping_style: /shop|boutique|mall|market|fashion|vintage|쇼핑|부티크|백화점/i,
  photo_landmark: /landmark|tower|viewpoint|monument|bridge|iconic|랜드마크|전망|야경|타워/i,
};

const CITY_HIGHLIGHT_RE = /\[도시 일반\]|\[City highlight\]|도시 명소|City highlight|GENERAL_CITY|museum|attraction|monument|market|gallery|랜드마크|박물관|시장|명소/i;

/** 테마와 무관한 일반 POI 제외 — 도시 하이라이트 태그는 완화 */
export function passesThemeRelevance(
  title: string,
  why: string | undefined,
  themeId: ThemeId
): boolean {
  if (themeId === "faith_heritage") {
    return passesFaithHeritageFilter(title, why);
  }

  const hay = `${title} ${why ?? ""}`;
  if (FAITH_REJECT_TITLE.test(title)) return false;
  if (isAdministrativePlace(title, why)) return false;

  if (CITY_HIGHLIGHT_RE.test(hay) && /museum|attraction|monument|market|gallery|park|viewpoint|랜드마크|박물관|시장|공원|전망/i.test(hay)) {
    return true;
  }

  const pattern = THEME_RELEVANCE[themeId];
  return pattern ? pattern.test(hay) : true;
}

export function filterPlacesForTheme(places: PlaceCandidate[], themeId: ThemeId): PlaceCandidate[] {
  return places.filter((p) => passesThemeRelevance(p.title, p.why ?? p.angle, themeId));
}
