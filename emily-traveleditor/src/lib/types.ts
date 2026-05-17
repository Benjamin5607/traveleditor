export interface WeatherInfo {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export interface ExchangeRates {
  USD: string;
  JPY: string;
  EUR: string;
  THB: string;
  VND: string;
  TWD: string;
  SGD: string;
  [key: string]: string;
}

export interface ThemeInfo {
  id: string;
  label: string;
  icon: string;
  description: string;
  gradient: string;
  textColor: string;
  bgPattern: string;
}

export const themes: ThemeInfo[] = [
  {
    id: "peace",
    label: "마음의 평화",
    icon: "\uD83E\uDDD8",
    description: "고요함 속에서 나를 찾는 여행",
    gradient: "from-sky-600 via-indigo-500 to-blue-700",
    textColor: "text-sky-100",
    bgPattern: "radial-gradient(ellipse at top, rgba(56,189,248,0.15), transparent)",
  },
  {
    id: "free",
    label: "인생이 무료",
    icon: "\uD83D\uDD25",
    description: "텅장이 되더라도 지금 당장 GO",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    textColor: "text-amber-100",
    bgPattern: "radial-gradient(ellipse at top, rgba(251,191,36,0.15), transparent)",
  },
  {
    id: "yolo",
    label: "오늘은 YOLO",
    icon: "\uD83D\uDE80",
    description: "내일은 내일의 내가 알아서 할 거야",
    gradient: "from-fuchsia-600 via-purple-500 to-violet-700",
    textColor: "text-fuchsia-100",
    bgPattern: "radial-gradient(ellipse at top, rgba(217,70,239,0.15), transparent)",
  },
  {
    id: "faith",
    label: "절제와 신앙",
    icon: "\uD83D\uDE4F",
    description: "욕망을 내려놓고 고행의 길로",
    gradient: "from-stone-600 via-emerald-700 to-teal-800",
    textColor: "text-emerald-100",
    bgPattern: "radial-gradient(ellipse at top, rgba(52,211,153,0.1), transparent)",
  },
];
