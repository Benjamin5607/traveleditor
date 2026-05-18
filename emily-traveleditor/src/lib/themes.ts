export const EMILY_THEMES = [
  {
    name: "마음의 평화",
    shortLabel: "차 · 커피",
    description: "조용한 티하우스와 로스터리에서 숨을 고르는 일정",
    accent: "from-emerald-300 via-teal-300 to-cyan-300",
    prompt:
      "마음의 평화를 찾는 사람에게 어울리는 조용한 티하우스, 로스터리 카페, 다도 체험, 고요한 산책 코스를 중심으로 추천해.",
  },
  {
    name: "인생이 무료",
    shortLabel: "와이너리 · 디스틸러리 · 브류어리",
    description: "술이 만들어지는 현장과 한 잔의 낭만을 따라가는 일정",
    accent: "from-amber-300 via-orange-300 to-rose-300",
    prompt:
      "와이너리, 위스키 디스틸러리, 비어 브류어리처럼 술과 생산지 경험이 있는 장소를 중심으로 추천해.",
  },
  {
    name: "오늘은 욜로",
    shortLabel: "클럽 · 스픽이지 · 컨셉 바",
    description: "밤의 에너지와 낯선 콘셉트가 강한 곳만 고르는 일정",
    accent: "from-fuchsia-300 via-pink-300 to-purple-300",
    prompt:
      "클럽, 스픽이지 바, 특이한 콘셉트 바처럼 밤에 에너지가 폭발하는 장소를 중심으로 추천해.",
  },
  {
    name: "신앙",
    shortLabel: "할랄투어 · 종교 유적지",
    description: "믿음과 문화가 겹치는 유적지와 순례 감성의 일정",
    accent: "from-sky-300 via-indigo-300 to-violet-300",
    prompt:
      "할랄 투어, 종교 유적지, 사원, 성당, 모스크, 순례길처럼 믿음과 문화가 만나는 장소를 중심으로 추천해.",
  },
] as const;

export type EmilyThemeName = (typeof EMILY_THEMES)[number]["name"];

export function getEmilyTheme(name: string) {
  return EMILY_THEMES.find((theme) => theme.name === name) ?? EMILY_THEMES[0];
}
