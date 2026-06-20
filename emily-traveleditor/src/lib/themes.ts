export type PlaneMode = "halal" | "drunken" | null;

export type ThemeId =
  | "peace_calm"
  | "drink_craft"
  | "yolo_night"
  | "faith_heritage"
  | "nature_trail"
  | "art_culture"
  | "food_market"
  | "history_heritage"
  | "family_fun"
  | "wellness_spa"
  | "shopping_style"
  | "photo_landmark";

export type ThemeRequirement = {
  id: string;
  labelKo: string;
  labelEn: string;
};

export type EmilyTheme = {
  id: ThemeId;
  name: string;
  nameEn: string;
  shortLabel: string;
  shortLabelEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  accent: string;
  prompt: string;
  promptEn: string;
  /** static theme_travel_db.json 키 (레거시 4테마) */
  legacyDbKey?: string;
  planeMode?: PlaneMode;
  requirements: ThemeRequirement[];
};

export const EMILY_THEMES: EmilyTheme[] = [
  {
    id: "peace_calm",
    name: "마음의 평화",
    nameEn: "Peace & Calm",
    shortLabel: "차 · 커피 · 정원",
    shortLabelEn: "Tea · Coffee · Gardens",
    description: "조용한 티하우스, 로스터리, 정원 산책으로 숨 고르기",
    descriptionEn: "Quiet tea houses, roasteries, and garden walks to unwind",
    icon: "🍵",
    accent: "from-emerald-300 via-teal-300 to-cyan-300",
    planeMode: null,
    prompt: "조용한 티하우스, 로스터리 카페, 다도 체험, 고요한 정원·산책 코스만 추천해.",
    promptEn: "Recommend quiet tea houses, specialty coffee, tea ceremonies, and peaceful gardens.",
    legacyDbKey: "마음의 평화",
    requirements: [
      { id: "tea_cafe", labelKo: "티·커피 공간", labelEn: "Tea & coffee spots" },
      { id: "garden", labelKo: "정원·산책로", labelEn: "Gardens & walks" },
      { id: "quiet", labelKo: "한적한 분위기", labelEn: "Quiet atmosphere" },
    ],
  },
  {
    id: "drink_craft",
    name: "인생이 무료",
    nameEn: "Liquid Life",
    shortLabel: "와이너리 · 양조장",
    shortLabelEn: "Winery · Brewery · Distillery",
    description: "술이 만들어지는 현장과 한 잔의 낭만",
    descriptionEn: "Where drinks are made — wineries, breweries, distilleries",
    icon: "🍷",
    accent: "from-amber-300 via-orange-300 to-rose-300",
    planeMode: "drunken",
    prompt: "와이너리, 위스키 디스틸러리, 비어 브류어리처럼 생산·시음 체험이 있는 장소만 추천해.",
    promptEn: "Wineries, distilleries, and breweries with tasting or production tours only.",
    legacyDbKey: "인생이 무료",
    requirements: [
      { id: "winery", labelKo: "와이너리", labelEn: "Winery" },
      { id: "brewery", labelKo: "브루어리·양조장", labelEn: "Brewery / distillery" },
      { id: "tasting", labelKo: "시음·투어", labelEn: "Tasting or tour" },
    ],
  },
  {
    id: "yolo_night",
    name: "오늘은 욜로",
    nameEn: "YOLO Nights",
    shortLabel: "클럽 · 스픽이지 · 바",
    shortLabelEn: "Clubs · Speakeasies · Bars",
    description: "밤의 에너지와 독특한 콘셉트만 골라 담기",
    descriptionEn: "Nightlife energy and concept bars only",
    icon: "🪩",
    accent: "from-fuchsia-300 via-pink-300 to-purple-300",
    planeMode: "drunken",
    prompt: "클럽, 스픽이지 바, 콘셉트 바처럼 밤에 에너지가 강한 장소만 추천해.",
    promptEn: "Nightclubs, speakeasies, and concept bars with strong evening vibes.",
    legacyDbKey: "오늘은 욜로",
    requirements: [
      { id: "nightlife", labelKo: "나이트라이프", labelEn: "Nightlife" },
      { id: "bar", labelKo: "바·클럽", labelEn: "Bar or club" },
      { id: "evening", labelKo: "저녁·심야 운영", labelEn: "Evening / late hours" },
    ],
  },
  {
    id: "faith_heritage",
    name: "신앙",
    nameEn: "Sacred Heritage",
    shortLabel: "등록 유적 사찰·성당",
    shortLabelEn: "Registered heritage temples & churches",
    description: "문화유산·역사 유적으로 등록된 종교 건축만 — 일반 예배당 제외",
    descriptionEn: "Only registered heritage religious sites — no random neighborhood churches",
    icon: "⛪",
    accent: "from-sky-300 via-indigo-300 to-violet-300",
    planeMode: "halal",
    prompt: "문화유산·역사 유적으로 등록된 사찰, 성당, 모스크, 수도원만 추천해. 일반 동네 교회나 역사 없는 예배당은 제외.",
    promptEn: "Only UNESCO, national heritage, or historically registered temples, cathedrals, mosques, and monasteries. Exclude ordinary parish churches.",
    legacyDbKey: "신앙",
    requirements: [
      { id: "heritage", labelKo: "문화유산·역사 등록", labelEn: "Heritage designation" },
      { id: "temple", labelKo: "사찰·성당·모스크", labelEn: "Temple / cathedral / mosque" },
      { id: "historic", labelKo: "역사적 가치", labelEn: "Historical significance" },
    ],
  },
  {
    id: "nature_trail",
    name: "자연·트레킹",
    nameEn: "Nature & Trails",
    shortLabel: "국립공원 · 둘레길",
    shortLabelEn: "Parks · Trails · Viewpoints",
    description: "숲, 바다, 전망대를 걷는 자연 중심 일정",
    descriptionEn: "Forests, coastlines, and scenic trails",
    icon: "🥾",
    accent: "from-green-400 via-lime-300 to-emerald-300",
    prompt: "국립공원, 둘레길, 전망대, 폭포, 해변 산책로처럼 자연·트레킹 중심 장소만 추천해.",
    promptEn: "National parks, hiking trails, viewpoints, waterfalls, and coastal walks.",
    requirements: [
      { id: "park", labelKo: "공원·자연보호구역", labelEn: "Park / nature reserve" },
      { id: "trail", labelKo: "트레킹·둘레길", labelEn: "Hiking trail" },
      { id: "viewpoint", labelKo: "전망·경관", labelEn: "Scenic viewpoint" },
    ],
  },
  {
    id: "art_culture",
    name: "예술·문화",
    nameEn: "Art & Culture",
    shortLabel: "미술관 · 공연장",
    shortLabelEn: "Museums · Galleries · Venues",
    description: "미술관, 갤러리, 공연·문화 공간 탐방",
    descriptionEn: "Museums, galleries, and cultural venues",
    icon: "🎨",
    accent: "from-violet-300 via-purple-300 to-fuchsia-300",
    prompt: "미술관, 갤러리, 박물관, 공연장, 문화센터처럼 예술·문화 체험이 있는 장소만 추천해.",
    promptEn: "Art museums, galleries, museums, theaters, and cultural centers.",
    requirements: [
      { id: "museum", labelKo: "미술관·박물관", labelEn: "Museum / gallery" },
      { id: "performance", labelKo: "공연·전시", labelEn: "Performance / exhibition" },
      { id: "culture", labelKo: "문화 시설", labelEn: "Cultural venue" },
    ],
  },
  {
    id: "food_market",
    name: "미식·시장",
    nameEn: "Food & Markets",
    shortLabel: "시장 · 로컬 맛집",
    shortLabelEn: "Markets · Local eats",
    description: "전통 시장, 길거리 음식, 로컬 맛집 투어",
    descriptionEn: "Traditional markets, street food, and local restaurants",
    icon: "🍜",
    accent: "from-orange-300 via-red-300 to-rose-300",
    prompt: "전통 시장, 푸드 마켓, 로컬 맛집, 길거리 음식 거리처럼 먹거리 중심 장소만 추천해.",
    promptEn: "Traditional markets, food halls, local restaurants, and street food districts.",
    requirements: [
      { id: "market", labelKo: "시장·푸드홀", labelEn: "Market / food hall" },
      { id: "local_food", labelKo: "로컬 요리", labelEn: "Local cuisine" },
      { id: "street", labelKo: "길거리·골목 맛집", labelEn: "Street food / alley eats" },
    ],
  },
  {
    id: "history_heritage",
    name: "역사·유적",
    nameEn: "History & Heritage",
    shortLabel: "궁궐 · 유적 · UNESCO",
    shortLabelEn: "Palaces · Ruins · UNESCO",
    description: "역사 유적, 궁궐, 세계유산 중심",
    descriptionEn: "Historic sites, palaces, and UNESCO heritage",
    icon: "🏛️",
    accent: "from-stone-300 via-amber-200 to-yellow-300",
    prompt: "궁궐, 성곽, 유적지, UNESCO 세계유산처럼 역사·유적 등록 장소만 추천해.",
    promptEn: "Palaces, fortresses, archaeological sites, and UNESCO World Heritage locations.",
    requirements: [
      { id: "historic_site", labelKo: "역사 유적", labelEn: "Historic site" },
      { id: "palace", labelKo: "궁궐·성", labelEn: "Palace / castle" },
      { id: "unesco", labelKo: "세계유산·국가유산", labelEn: "UNESCO / national heritage" },
    ],
  },
  {
    id: "family_fun",
    name: "가족·키즈",
    nameEn: "Family & Kids",
    shortLabel: "동물원 · 테마파크",
    shortLabelEn: "Zoo · Aquarium · Theme park",
    description: "아이와 함께 즐기는 체험·놀이 공간",
    descriptionEn: "Family-friendly attractions and play spaces",
    icon: "🎠",
    accent: "from-sky-300 via-cyan-300 to-teal-300",
    prompt: "동물원, 수족관, 테마파크, 과학관, 키즈 체험장처럼 가족·아이와 함께 가기 좋은 장소만 추천해.",
    promptEn: "Zoos, aquariums, theme parks, science museums, and kid-friendly experiences.",
    requirements: [
      { id: "family", labelKo: "가족 친화", labelEn: "Family-friendly" },
      { id: "kids", labelKo: "키즈 체험", labelEn: "Kids activities" },
      { id: "play", labelKo: "놀이·관람", labelEn: "Play / viewing" },
    ],
  },
  {
    id: "wellness_spa",
    name: "웰니스·스파",
    nameEn: "Wellness & Spa",
    shortLabel: "온천 · 스파 · 요가",
    shortLabelEn: "Hot springs · Spa · Yoga",
    description: "몸과 마음을 쉬게 하는 휴식 공간",
    descriptionEn: "Hot springs, spas, and wellness retreats",
    icon: "♨️",
    accent: "from-rose-200 via-pink-200 to-purple-200",
    prompt: "온천, 스파, 사우나, 요가·명상 센터처럼 웰니스·휴식 중심 장소만 추천해.",
    promptEn: "Hot springs, spas, saunas, and yoga or meditation centers.",
    requirements: [
      { id: "onsen", labelKo: "온천·스파", labelEn: "Hot spring / spa" },
      { id: "relax", labelKo: "휴식·테라피", labelEn: "Relaxation / therapy" },
      { id: "wellness", labelKo: "웰니스 프로그램", labelEn: "Wellness program" },
    ],
  },
  {
    id: "shopping_style",
    name: "쇼핑·스타일",
    nameEn: "Shopping & Style",
    shortLabel: "빈티지 · 로컬 브랜드",
    shortLabelEn: "Vintage · Local brands",
    description: "로컬 브랜드, 빈티지, 쇼핑 거리 탐방",
    descriptionEn: "Local brands, vintage shops, and shopping districts",
    icon: "🛍️",
    accent: "from-pink-300 via-rose-300 to-red-300",
    prompt: "로컬 브랜드 숍, 빈티지 마켓, 디자이너 거리, 쇼핑몰처럼 쇼핑·스타일 중심 장소만 추천해.",
    promptEn: "Local brand shops, vintage markets, designer districts, and shopping areas.",
    requirements: [
      { id: "shop", labelKo: "쇼핑 거리·몰", labelEn: "Shopping street / mall" },
      { id: "local_brand", labelKo: "로컬 브랜드", labelEn: "Local brand" },
      { id: "vintage", labelKo: "빈티지·플리마켓", labelEn: "Vintage / flea market" },
    ],
  },
  {
    id: "photo_landmark",
    name: "포토·랜드마크",
    nameEn: "Photo & Landmarks",
    shortLabel: "전망 · 아이코닉 스팟",
    shortLabelEn: "Views · Iconic spots",
    description: "인생샷 명소와 도시 랜드마크",
    descriptionEn: "Instagram-worthy views and city landmarks",
    icon: "📸",
    accent: "from-yellow-300 via-amber-300 to-orange-300",
    prompt: "도시 랜드마크, 전망대, 포토존, 야경 명소처럼 사진 찍기 좋은 대표 스팟만 추천해.",
    promptEn: "City landmarks, viewpoints, photo spots, and iconic night views.",
    requirements: [
      { id: "landmark", labelKo: "랜드마크", labelEn: "Landmark" },
      { id: "view", labelKo: "전망·야경", labelEn: "View / nightscape" },
      { id: "photo", labelKo: "포토 스팟", labelEn: "Photo spot" },
    ],
  },
];

export type EmilyThemeName = ThemeId;

export function getEmilyTheme(idOrLegacy: string): EmilyTheme {
  return (
    EMILY_THEMES.find((t) => t.id === idOrLegacy) ??
    EMILY_THEMES.find((t) => t.legacyDbKey === idOrLegacy) ??
    EMILY_THEMES.find((t) => t.name === idOrLegacy) ??
    EMILY_THEMES[0]
  );
}

export function themeDbKey(theme: EmilyTheme) {
  return theme.legacyDbKey ?? theme.id;
}

export function localizeTheme(theme: EmilyTheme, locale: "ko" | "en") {
  if (locale === "en") {
    return {
      name: theme.nameEn,
      shortLabel: theme.shortLabelEn,
      description: theme.descriptionEn,
      prompt: theme.promptEn,
      requirements: theme.requirements.map((r) => r.labelEn),
    };
  }
  return {
    name: theme.name,
    shortLabel: theme.shortLabel,
    description: theme.description,
    prompt: theme.prompt,
    requirements: theme.requirements.map((r) => r.labelKo),
  };
}
