export async function getEmilyWorkers(userApiKey?: string) {
  // 빌드 타임 주입 또는 유저 입력 키 사용
  const apiKey = userApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    console.error("API Key missing");
    return [];
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) return [];

    const result = await response.json();
    // 2026년 기준 Groq 모델 리스트 필터링
    return result.data.filter((m: any) => 
      m.id.includes('llama') || m.id.includes('mixtral')
    );
  } catch (e) {
    console.error(e);
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
        { role: "system", content: `너는 에디터 Emily다. 테마는 ${category}야. 도도하게 말해.` },
        { role: "user", content: prompt }
      ],
    }),
  });
  return response.json();
}
