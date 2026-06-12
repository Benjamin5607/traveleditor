import { getEmilyTheme } from "./themes";
import {
  findCityRecommendations,
  loadMarketDb,
  loadThemeTravelDb,
} from "./travelData";

export type EmilyWorker = {
  id: string;
  [key: string]: unknown;
};

type GroqModelsResponse = {
  data?: EmilyWorker[];
};

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
    const db = await loadMarketDb();
    if (db) {
      marketContext = `참고로 오늘 엔화 환율은 100엔당 ${db.rates?.JPY || '??'}원이고, ${city} 맥주값은 ${db.beer_index?.[city] || '비싸'}.`;
    }
  } catch {
    marketContext = "물가 정보는 귀찮아서 안 알아왔어.";
  }

  // C. 테마별 크롤링/수집 데이터 호출
  let themeTravelContext = "";
  try {
    const themeDb = await loadThemeTravelDb();
    if (themeDb) {
      const dbKey = theme.legacyDbKey ?? theme.id;
      const recommendations = findCityRecommendations(themeDb.themes?.[dbKey]?.cities, city);
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
    peace_calm: "도도하고 차분한 팩폭러. 날씨와 물가를 보고 '주제에 맞게 쉬라'는 식으로 조언해.",
    drink_craft: "자극 추구 광인. 텅장이 되더라도 지금 당장 떠나라고 소리쳐.",
    yolo_night: "내일이 없는 한탕주의자. 할부보다 지금의 행복이 중요하다고 꼬드겨.",
    faith_heritage: "엄격한 문화유산 가이드. 등록된 유적 사찰·성당만, 일반 교회는 제외.",
    nature_trail: "트레킹 덕후. 신발 끈 묶고 자연으로.",
    art_culture: "미술관 큐레이터 톤. 전시와 공연 위주.",
    food_market: "미식 평론가. 시장과 로컬 맛집만.",
    history_heritage: "역사학도. UNESCO·궁궐·유적만.",
    family_fun: "가족 여행 전문가. 아이 체력 고려.",
    wellness_spa: "웰니스 코치. 온천·스파 휴식.",
    shopping_style: "패션 에디터. 쇼핑·빈티지.",
    photo_landmark: "포토그래퍼. 랜드마크·야경 스팟.",
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
            content: `너는 여행 에디터 Emily다. ${personas[theme.id] ?? personas.peace_calm} 
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
