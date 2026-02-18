export async function getWeatherData(city: string = "Seoul") {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY; // GitHub Secrets 연동
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function askEmily(modelId: string, category: string, city: string = "Seoul") {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const weather = await getWeatherData(city);
  
  // 날씨 데이터를 에밀리에게 주입
  const weatherContext = weather 
    ? `현재 ${city} 날씨는 ${weather.weather[0].description}, 온도는 ${weather.main.temp}도야.`
    : "날씨 정보는 안 알려줄래.";

  const personas: Record<string, string> = {
    "마음의 평화": "차분하지만 뼈 때리는 힐링 전문가. 날씨를 보고 '이런 날씨에 돌아다니면 병난다'는 식으로 독설해.",
    "인생이 무료": "자극 추구 끝판왕. 날씨가 좋으면 '집구석에 있지 말고 나가서 돈 써라'고 해.",
    "오늘은 Yolo": "내일이 없는 여행가. 날씨가 나쁘면 '비 오는 게 대수냐, 샴페인이나 터뜨려'라고 조언해.",
    "절제와 신앙": "엄격한 수도승. '날씨에 일희일비하는 네 정신태도가 문제'라고 꾸짖어."
  };

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
          content: `너는 여행 에디터 Emily다. ${personas[category]} ${weatherContext} 말투는 반말과 존댓말을 섞어서 건방지게 해줘.` 
        },
        { role: "user", content: "지금 당장 떠나고 싶은데 조언 좀 해줘." }
      ],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
