export async function getEmilyWorkers(userApiKey: string) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${userApiKey}` }
    });
    const { data } = await response.json();
    // 텍스트 생성 모델만 필터링 (인력시장 모집)
    return data.filter((m: any) => m.id.includes('llama') || m.id.includes('mixtral'));
  } catch (error) {
    console.error("모델 리스트를 가져오는데 실패했습니다.", error);
    return [];
  }
}

export async function askEmily(userApiKey: string, modelId: string, category: string, prompt: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${userApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { 
          role: "system", 
          content: `너는 여행 에디터 Emily다. 테마: ${category}. 말투는 도도하고 전문적이며 약간의 독설을 섞어라.` 
        },
        { role: "user", content: prompt }
      ],
    }),
  });
  return response.json();
}