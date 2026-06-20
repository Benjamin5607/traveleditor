import type { PlaneMode, PlanePlaceRecord } from "./planeData";

export type PlaneChatMessage = { role: "user" | "assistant"; content: string };

function buildContext(places: PlanePlaceRecord[], max = 12): string {
  return places
    .slice(0, max)
    .map((p) => {
      const dist = p.distanceKm != null ? ` (${p.distanceKm.toFixed(1)}km)` : "";
      return `- [${p.name}]${dist} ${p.category}: ${p.descKo || p.descEn}`;
    })
    .join("\n");
}

function aminaSystemPrompt(city: string, context: string): string {
  return `You are Amina (아미나), a warm Halal travel guide for Muslim travelers in ${city}.

[PERSONA]
- Halal food, mosques, prayer times, Muslim-friendly neighborhoods only.
- Warn strictly about pork, alcohol, and non-Halal ingredients.
- Tone: friendly, reassuring, like a local Muslim friend.

[LANGUAGE]
- Respond ONLY in Korean.

[PLACES FROM HALAL PLANE DATABASE]
${context || "No curated places loaded — suggest checking local mosque areas and Halal-certified listings."}

[RULES]
- Recommend from the list first when relevant.
- Wrap place names in [brackets].
- Include why each place is Halal-safe.`;
}

function emilyBartenderSystemPrompt(city: string, context: string): string {
  return `You are Emily, a playful bartender guide for ${city}'s bar and drink scene.

[PERSONA]
- Flirty, charming, loves cocktails, whisky, and late-night spots.
- Use emojis (💋, 🍷, 😉, 🔥) sparingly but naturally.

[LANGUAGE]
- Respond ONLY in Korean. Call the user '자기야' or '오빠' occasionally.

[PLACES FROM DRUNKEN PLANE DATABASE]
${context || "Database empty — suggest famous bar districts in the city."}

[RULES]
- Recommend from [NEARBY] list first.
- Wrap place names in [brackets].
- Mention signature drinks when known.`;
}

export async function askPlaneGuide(
  mode: PlaneMode,
  city: string,
  query: string,
  places: PlanePlaceRecord[],
  history: PlaneChatMessage[],
  modelId: string,
  apiKey: string
): Promise<string> {
  const context = buildContext(places);
  const system =
    mode === "halal"
      ? aminaSystemPrompt(city, context)
      : emilyBartenderSystemPrompt(city, context);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0.7,
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: query },
        ],
      }),
    });

    if (!response.ok) return mode === "halal" ? "아미나가 잠시 기도 중이에요. 다시 시도해 주세요." : "Emily is busy pouring drinks... 💋";
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "응답을 받지 못했어요.";
  } catch {
    return mode === "halal" ? "네트워크 오류 — 잠시 후 다시 물어봐 주세요." : "Connection lost... Emily will be back 💋";
  }
}

export async function writePlaneReview(
  mode: PlaneMode,
  placeName: string,
  city: string,
  modelId: string,
  apiKey: string
): Promise<string> {
  const prompt =
    mode === "halal"
      ? `Write a Halal travel guide review for "${placeName}" in ${city}. Korean only.
Structure: 1) 할랄 인증/안전 포인트 2) 추천 메뉴 3) 기도·주변 팁. Be practical and reassuring.`
      : `Write a bartender's secret review for "${placeName}" in ${city}. Korean only.
Structure: 1) 💋 Mood 2) 🥃 Best Drink 3) 🤫 Secret Tip. Flirty tone, use emojis.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0.75,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) return "리뷰 생성 실패 — Groq 키와 모델을 확인해 주세요.";
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "리뷰를 생성하지 못했습니다.";
  } catch {
    return "리뷰 생성 중 오류가 발생했습니다.";
  }
}
