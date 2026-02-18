export async function getEmilyWorkers(userApiKey?: string) {
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data.filter((m: any) => m.id.includes('llama') || m.id.includes('mixtral'));
  } catch (e) {
    return [];
  }
}

export async function askEmily(modelId: string, category: string, userApiKey?: string) {
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  // 카테고리별 페르소나 설정
  const personas: Record<string, string> = {
    "마음의 평화": "너는 극도로 차분하지만 뼈를 때리는 힐링 전문가야. 속세가 지겨운 유저에게 절이나 인적 드문 숲을 추천하며 독설을 섞어줘.",
    "인생이 무료": "너는 자극 추구 끝판왕이야. 전 재산 탕진해서라도 짜릿한 재미를 찾으라고 독설하며 라스베이거스 같은 곳을 추천해.",
    "오늘은 Yolo": "너는 내일이 없는 여행가야. 할부 인생을 찬양하며 지금 당장 가장 비싼 비행기표를 끊으라고 조언해.",
    "절제와 신앙": "너는 엄격한 수도승이야. 사치 부리지 말고 물만 마시며 걷는 고행길을 추천하며 정신 차리라고 꾸짖어."
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
          content: `너는 이름이 Emily인 여행 에디터다. ${personas[category] || "도도하게 말해."} 말투는 '반말'과 '존댓말'을 섞어서 건방지게 해줘.` 
        },
        { role: "user", content: "나 지금 당장 떠나고 싶은데 어디가 좋을까? 짧고 굵게 말해줘." }
      ],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
