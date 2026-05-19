import { getEmilyTheme } from "./themes";

export type EmilyWorker = {
  id: string;
  [key: string]: unknown;
};

type GroqModelsResponse = {
  data?: EmilyWorker[];
};

type ThemeTravelRecommendation = {
  title?: string;
  angle?: string;
  why?: string;
  source_titles?: string[];
  source_urls?: string[];
  official_url?: string;
  reservation_hint?: string;
};

type ThemeTravelDb = {
  themes?: Record<string, {
    cities?: Record<string, ThemeTravelRecommendation[]>;
  }>;
};

function normalizeCityName(city: string) {
  return city.trim().toLowerCase().replace(/[\s-]/g, "");
}

function getCityThemeRecommendations(
  cities: Record<string, ThemeTravelRecommendation[]> | undefined,
  city: string
) {
  const target = normalizeCityName(city);
  return Object.entries(cities ?? {}).find(([name]) => normalizeCityName(name) === target)?.[1] ?? [];
}

// 1. 실시간 날씨 정보를 가져오는 함수
export async function getWeatherData(city: string) {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 2. 인력시장에서 일할 모델들(Llama, Mixtral 등)을 불러오는 함수
export async function getEmilyWorkers(userApiKey?: string) {
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!response.ok) return [];
    const result = (await response.json()) as GroqModelsResponse;
    return (result.data ?? []).filter((m) =>
      m.id.includes('llama') || m.id.includes('mixtral') || m.id.includes('gemma')
    );
  } catch (e) {
    console.error("인력시장 로딩 실패:", e);
    return [];
  }
}

// 3. 에밀리에게 최종 조언을 구하는 함수 (날씨 + 마켓 데이터 통합)
export async function askEmily(modelId: string, category: string, city: string, userApiKey?: string) {
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const theme = getEmilyTheme(category);

  if (!apiKey) return "Groq API 키가 없어서 에밀리가 출근을 못 했어.";
  if (!modelId) return "먼저 에밀리 인력시장에서 모델을 골라줘.";
  
  // A. 실시간 날씨 호출
  const weather = await getWeatherData(city);
  const weatherContext = weather 
    ? `현재 ${city} 날씨: ${weather.weather[0].description}, 기온: ${weather.main.temp}도.`
    : "날씨 정보는 비밀이야.";

  // B. 자동화 스크립트가 생성할 예정인 마켓 DB 호출
  let marketContext = "";
  try {
    // 깃허브 페이지의 정적 경로 (/traveleditor/data/...)
    const dbRes = await fetch("/traveleditor/data/market_db.json");
    if (dbRes.ok) {
      const db = await dbRes.json();
      marketContext = `참고로 오늘 엔화 환율은 100엔당 ${db.rates?.JPY || '??'}원이고, ${city} 맥주값은 ${db.beer_index?.[city] || '비싸'}.`;
    }
  } catch {
    marketContext = "물가 정보는 귀찮아서 안 알아왔어.";
  }

  // C. 테마별 크롤링/수집 데이터 호출
  let themeTravelContext = "";
  try {
    const themeRes = await fetch("/traveleditor/data/theme_travel_db.json");
    if (themeRes.ok) {
      const themeDb = (await themeRes.json()) as ThemeTravelDb;
      const recommendations = getCityThemeRecommendations(themeDb.themes?.[theme.name]?.cities, city);
      if (recommendations.length > 0) {
        themeTravelContext = recommendations
          .slice(0, 3)
          .map((item) => {
            const link = item.official_url || item.source_urls?.[0] || "링크 없음";
            return `${item.title}: ${item.angle || item.why || "테마 후보"} (확인 링크: ${link})`;
          })
          .join(" / ");
      }
    }
  } catch {
    themeTravelContext = "";
  }

  // D. 카테고리별 페르소나
  const personas: Record<string, string> = {
    "마음의 평화": "도도하고 차분한 팩폭러. 날씨와 물가를 보고 '주제에 맞게 쉬라'는 식으로 조언해.",
    "인생이 무료": "자극 추구 광인. 텅장(텅 빈 통장)이 되더라도 지금 당장 떠나라고 소리쳐.",
    "오늘은 욜로": "내일이 없는 한탕주의자. 할부의 무서움보다 지금의 행복이 중요하다고 꼬드겨.",
    "신앙": "엄격하지만 박식한 순례 가이드. 욕망보다 의미와 예의를 챙기라고 콕 집어줘."
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { 
            role: "system", 
            content: `너는 여행 에디터 Emily다. ${personas[theme.name]} 
            선택된 테마: ${theme.name}. 추천 장소 범위: ${theme.prompt}
            데이터 정보: ${weatherContext} ${marketContext}
            수집된 테마 여행 후보: ${themeTravelContext || "아직 해당 도시 후보는 비어 있어."}
            말투는 건방지고 도도하게, 반말과 존댓말을 섞어서 해줘. 추천은 테마 범위를 벗어나지 마.` 
          },
          { role: "user", content: `나 지금 ${city}로 떠나고 싶은데 ${theme.name} 테마로 짧고 강렬하게 한마디 해줘.` }
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) return "에밀리가 지금 바빠서 대답 안 한대. (에러 났어)";
    return data.choices[0].message.content;
  } catch {
    return "연결 상태가 안 좋아. 인력시장에 문제가 생긴 듯?";
  }
}
