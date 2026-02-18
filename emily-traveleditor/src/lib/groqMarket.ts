export async function getEmilyWorkers(userApiKey?: string) {
  // 1. 전달받은 키가 없으면 환경변수(Secrets)에서 가져옴
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    console.error("API Key is missing. Check GitHub Secrets or Input.");
    return [];
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) throw new Error("Failed to fetch models from Groq");

    const { data } = await response.json();
    // 텍스트 생성용 주요 모델들만 필터링해서 인력시장 구성
    return data.filter((m: any) => 
      m.id.includes('llama') || 
      m.id.includes('mixtral') || 
      m.id.includes('gemma')
    );
  } catch (error) {
    console.error("인력시장 로딩 실패:", error);
    return [];
  }
}

export async function askEmily(modelId: string, category: string, prompt: string, userApiKey?: string) {
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;

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
          content: `너는 여행 에디터 Emily다. 테마: ${category}. 
          날씨, 주류 가격, 너의 기분을 섞어서 도도하고 전문적인 독설 섞인 여행 조언을 해줘.` 
        },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) throw new Error("Emily is busy right now.");
  return response.json();
}
