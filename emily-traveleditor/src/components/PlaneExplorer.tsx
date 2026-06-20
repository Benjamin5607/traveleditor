"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { askPlaneGuide, writePlaneReview, type PlaneChatMessage } from "../lib/planeBrain";
import type { PlaneMode, PlanePersona, PlanePlaceRecord } from "../lib/tripTypes";

type PlaneExplorerProps = {
  mode: PlaneMode;
  city: string;
  places: PlanePlaceRecord[];
  persona: PlanePersona;
  modelId?: string;
};

type TabId = "map" | "list" | "chat" | "passport";

const PASSPORT_KEY = "emily-plane-passport";

function passportStorageKey(mode: PlaneMode, city: string) {
  return `${PASSPORT_KEY}:${mode}:${city.toLowerCase().replace(/\s+/g, "-")}`;
}

function loadStamps(mode: PlaneMode, city: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(passportStorageKey(mode, city));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveStamps(mode: PlaneMode, city: string, stamps: string[]) {
  localStorage.setItem(passportStorageKey(mode, city), JSON.stringify(stamps));
}

function personaMeta(persona: PlanePersona) {
  if (persona === "amina") {
    return {
      name: "아미나 Amina",
      emoji: "🕌",
      accent: "from-sky-400 to-indigo-500",
      greeting: "안녕하세요! 할랄 맛집·모스크·기도 팁이 궁금하면 물어보세요.",
      placeholder: "예: 이태원 근처 할랄 한식 추천해줘",
    };
  }
  return {
    name: "Emily Bartender",
    emoji: "🍸",
    accent: "from-fuchsia-400 to-pink-500",
    greeting: "자기야~ 오늘 밤 어디서 한 잔 할지 고민이야? 💋",
    placeholder: "예: 강남 근처 위스키 바 추천해줘",
  };
}

export default function PlaneExplorer({ mode, city, places, persona, modelId }: PlaneExplorerProps) {
  const meta = personaMeta(persona);
  const [tab, setTab] = useState<TabId>("map");
  const [selected, setSelected] = useState<PlanePlaceRecord | null>(places[0] ?? null);
  const [stamps, setStamps] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<PlaneChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [review, setReview] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    setStamps(loadStamps(mode, city));
  }, [mode, city]);

  const sortedPlaces = useMemo(
    () => [...places].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)),
    [places]
  );

  const stampPlace = useCallback(
    (name: string) => {
      setStamps((prev) => {
        if (prev.includes(name)) return prev;
        const next = [...prev, name];
        saveStamps(mode, city, next);
        return next;
      });
    },
    [mode, city]
  );

  useEffect(() => {
    if (tab !== "map" || !mapRef.current || places.length === 0) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      const map = L.map(mapRef.current, { scrollWheelZoom: false });
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];
      const pinColor = mode === "halal" ? "#38bdf8" : "#e879f9";

      for (const place of places) {
        bounds.push([place.lat, place.lng]);
        const isSelected = selected?.name === place.name;
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${isSelected ? 22 : 16}px;height:${isSelected ? 22 : 16}px;border-radius:50%;background:${pinColor};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
          iconSize: [isSelected ? 22 : 16, isSelected ? 22 : 16],
          iconAnchor: [isSelected ? 11 : 8, isSelected ? 11 : 8],
        });
        L.marker([place.lat, place.lng], { icon })
          .addTo(map)
          .on("click", () => setSelected(place))
          .bindPopup(`<strong>${place.name}</strong><br/>${place.category}`);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    })();

    return () => {
      cancelled = true;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [tab, places, selected, mode]);

  const handleChat = async () => {
    const query = chatInput.trim();
    if (!query || chatLoading) return;

    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey || !modelId) {
      setChatHistory((h) => [
        ...h,
        { role: "user", content: query },
        { role: "assistant", content: "Groq API 키와 모델을 설정하면 AI 가이드와 대화할 수 있어요." },
      ]);
      setChatInput("");
      return;
    }

    setChatLoading(true);
    setChatInput("");
    const userMsg: PlaneChatMessage = { role: "user", content: query };
    setChatHistory((h) => [...h, userMsg]);

    const reply = await askPlaneGuide(mode, city, query, places, [...chatHistory, userMsg], modelId, apiKey);
    setChatHistory((h) => [...h, { role: "assistant", content: reply }]);
    setChatLoading(false);
  };

  const handleReview = async (place: PlanePlaceRecord) => {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey || !modelId) {
      setReview("Groq API 키와 모델이 필요합니다.");
      return;
    }
    setReviewLoading(true);
    setReview("");
    const text = await writePlaneReview(mode, place.name, city, modelId, apiKey);
    setReview(text);
    setReviewLoading(false);
  };

  if (places.length === 0) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
        <p className="text-sm text-zinc-400">
          {mode === "halal" ? "Halal Plane" : "Drunken Plane"} DB에 이 도시/국가 데이터가 없습니다.
        </p>
      </section>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "map", label: "지도" },
    { id: "list", label: `목록 (${places.length})` },
    { id: "chat", label: "AI 가이드" },
    { id: "passport", label: `패스포트 (${stamps.length})` },
  ];

  return (
    <section className="no-print overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950/90 to-indigo-950/20">
      <div className="border-b border-white/10 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full bg-gradient-to-r ${meta.accent} px-4 py-1.5 text-sm font-black text-white`}>
            {meta.emoji} {mode === "halal" ? "Halal Plane" : "Drunken Plane"}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-400">
            {meta.name}
          </span>
          <span className="text-xs text-zinc-500">{places.length}곳 큐레이션</span>
        </div>
        <h3 className="mt-3 text-2xl font-black text-white">Plane Explorer</h3>
        <p className="mt-2 text-sm text-zinc-400">{meta.greeting}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t.id ? "bg-yellow-200 text-zinc-950" : "border border-white/10 text-zinc-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6">
        {tab === "map" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div ref={mapRef} className="route-map-container z-0 h-80 w-full rounded-2xl bg-zinc-900 lg:h-[420px]" />
            {selected && (
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-bold text-zinc-500">{selected.category}</p>
                <h4 className="mt-1 text-lg font-black text-white">{selected.name}</h4>
                {selected.nameKo && <p className="text-sm text-zinc-400">{selected.nameKo}</p>}
                {selected.label && <p className="mt-2 text-xs font-bold text-emerald-300">{selected.label}</p>}
                <p className="mt-3 text-sm leading-6 text-zinc-300">{selected.descKo || selected.descEn}</p>
                {selected.distanceKm != null && (
                  <p className="mt-2 text-xs text-zinc-500">도심에서 약 {selected.distanceKm.toFixed(1)}km</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name} ${selected.address ?? city}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-yellow-200 px-3 py-1.5 text-xs font-black text-zinc-950"
                  >
                    Google Maps
                  </a>
                  <button
                    type="button"
                    onClick={() => stampPlace(selected.name)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-200"
                  >
                    {stamps.includes(selected.name) ? "✓ 방문 스탬프" : "패스포트 스탬프"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(selected)}
                    disabled={reviewLoading}
                    className="rounded-full border border-fuchsia-400/40 px-3 py-1.5 text-xs font-bold text-fuchsia-200"
                  >
                    {reviewLoading ? "리뷰 생성 중..." : "AI 리뷰"}
                  </button>
                </div>
                {review && (
                  <p className="mt-4 rounded-xl bg-white/5 p-3 text-xs leading-5 text-zinc-300 whitespace-pre-wrap">
                    {review}
                  </p>
                )}
              </article>
            )}
          </div>
        )}

        {tab === "list" && (
          <div className="grid max-h-[480px] gap-3 overflow-y-auto md:grid-cols-2">
            {sortedPlaces.map((place) => (
              <button
                key={place.name}
                type="button"
                onClick={() => {
                  setSelected(place);
                  setTab("map");
                }}
                className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-yellow-200/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-zinc-500">{place.category}</p>
                    <p className="mt-1 font-bold text-white">{place.name}</p>
                    {place.label && <p className="mt-1 text-xs text-emerald-300">{place.label}</p>}
                  </div>
                  {stamps.includes(place.name) && <span className="text-lg">🛂</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{place.descKo || place.descEn}</p>
              </button>
            ))}
          </div>
        )}

        {tab === "chat" && (
          <div className="flex flex-col gap-4">
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
              {chatHistory.length === 0 && (
                <p className="text-sm text-zinc-500">{meta.greeting}</p>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  className={`rounded-xl px-4 py-3 text-sm leading-6 ${
                    msg.role === "user" ? "ml-8 bg-yellow-200/10 text-yellow-100" : "mr-8 bg-white/5 text-zinc-300"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && <p className="text-sm text-zinc-500">답변 생성 중...</p>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                placeholder={meta.placeholder}
                className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-yellow-200/50"
              />
              <button
                type="button"
                onClick={handleChat}
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-2xl bg-yellow-200 px-5 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </div>
        )}

        {tab === "passport" && (
          <div>
            <p className="text-sm text-zinc-400">
              방문한 장소에 스탬프를 모으세요. 지도 탭에서 「패스포트 스탬프」를 누르면 저장됩니다.
            </p>
            {stamps.length === 0 ? (
              <p className="mt-6 text-center text-sm text-zinc-500">아직 스탬프가 없어요.</p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {stamps.map((name) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-dashed border-yellow-200/40 bg-yellow-200/5 p-4 text-center"
                  >
                    <p className="text-2xl">🛂</p>
                    <p className="mt-2 text-sm font-bold text-white">{name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{city}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
