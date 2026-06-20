"use client";
import { useState, useEffect } from "react";
import GuidebookView from "../components/GuidebookView";
import { getEmilyWorkers } from "../lib/groqMarket";
import type { EmilyWorker } from "../lib/groqMarket";
import { buildTravelGuidebook } from "../lib/tripPlanner";
import { BUDGET_THEMES } from "../lib/budgetThemes";
import { EMILY_THEMES, type EmilyThemeName } from "../lib/themes";
import {
  LODGING_OPTIONS,
  TRANSPORT_OPTIONS,
  type BudgetThemeId,
  type LodgingId,
  type TransportId,
  type TravelGuidebook,
  type TripPreferences,
} from "../lib/tripTypes";

const TRIP_PRESETS = [
  { label: "무박 1일", days: 1, nights: 0, lodging: "none" as LodgingId },
  { label: "무박 3일", days: 3, nights: 0, lodging: "none" as LodgingId },
  { label: "2박 3일", days: 3, nights: 2, lodging: "hotel" as LodgingId },
  { label: "3박 4일", days: 4, nights: 3, lodging: "hotel" as LodgingId },
];

function pickChatModel(workers: EmilyWorker[]) {
  const preferred = workers.find((worker) =>
    /llama-3\.3|llama-4|versatile|scout|instruct/i.test(worker.id) &&
    !/prompt-guard|guard/i.test(worker.id)
  );
  return preferred?.id ?? workers[0]?.id ?? "";
}

export default function Home() {
  const [workers, setWorkers] = useState<EmilyWorker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [city, setCity] = useState("Seoul");
  const [theme, setTheme] = useState<EmilyThemeName>(EMILY_THEMES[0].name);
  const [days, setDays] = useState(3);
  const [nights, setNights] = useState(2);
  const [transport, setTransport] = useState<TransportId>("bus");
  const [lodging, setLodging] = useState<LodgingId>("hotel");
  const [budgetTheme, setBudgetTheme] = useState<BudgetThemeId>("smart_value");
  const [budgetKrw, setBudgetKrw] = useState(1200000);
  const [guidebook, setGuidebook] = useState<TravelGuidebook | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getEmilyWorkers();
      if (data.length > 0) {
        setWorkers(data);
        setSelectedWorker(pickChatModel(data));
      }
    })();
  }, []);

  const applyPreset = (preset: (typeof TRIP_PRESETS)[number]) => {
    setDays(preset.days);
    setNights(preset.nights);
    setLodging(preset.lodging);
  };

  const handleBuildGuidebook = async () => {
    setLoading(true);
    setError("");
    setGuidebook(null);

    const prefs: TripPreferences = {
      city,
      theme,
      days,
      nights: lodging === "none" ? 0 : nights,
      transport,
      lodging,
      budgetTheme,
      budgetKrw,
    };

    const result = await buildTravelGuidebook(prefs, selectedWorker);
    if ("error" in result) {
      setError(result.error);
    } else {
      setGuidebook(result);
    }
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070b] px-5 py-8 text-zinc-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_28%),linear-gradient(135deg,rgba(39,39,42,0.28),transparent_45%)]" />
      <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="no-print grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">
              Emily Travel Editor
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-[-0.06em] text-white sm:text-6xl">
                나만의
                <span className="block bg-gradient-to-r from-yellow-200 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                  여행 가이드북
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-300">
                EOSLS 로컬 검색(OSM·Nominatim·Photon·Wikivoyage)으로 실제 장소명 수집. Wikipedia는 폴백만.
              </p>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Destination</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="도시 이름 (영문)"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-lg font-semibold text-white outline-none transition focus:border-yellow-200/60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Groq Worker</span>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-semibold text-white outline-none"
              >
                {workers.length === 0 && <option value="">모델 불러오는 중</option>}
                {workers.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
              </select>
            </label>
          </div>
        </header>

        <section className="no-print rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Trip setup</p>
          <h2 className="mt-2 text-2xl font-black text-white">여행 조건</h2>

          <div className="mt-5 flex flex-wrap gap-2">
            {TRIP_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-yellow-200/40 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">일수</span>
              <input type="number" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">박수</span>
              <input type="number" min={0} max={13} value={nights} onChange={(e) => setNights(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">예산 (원){budgetTheme !== "custom" ? " · 테마 자동" : ""}</span>
              <input
                type="number"
                min={100000}
                step={50000}
                value={budgetKrw}
                onChange={(e) => setBudgetKrw(Number(e.target.value))}
                disabled={budgetTheme !== "custom"}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white disabled:opacity-50"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">이동 수단</span>
              <select value={transport} onChange={(e) => setTransport(e.target.value as TransportId)} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
                {TRANSPORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">숙박 유형</span>
              <select value={lodging} onChange={(e) => setLodging(e.target.value as LodgingId)} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white">
                {LODGING_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="no-print rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Budget vibe</p>
          <h2 className="mt-2 text-2xl font-black text-white">MZ 예산 테마</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {BUDGET_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setBudgetTheme(item.id);
                  if (item.id !== "custom") {
                    setBudgetKrw(item.defaultBudgetKrw);
                    if (item.suggestedLodging !== "none") setLodging(item.suggestedLodging);
                  }
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  budgetTheme === item.id ? "border-pink-300/60 bg-pink-300/10" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <p className="text-2xl">{item.emoji}</p>
                <p className="mt-2 font-black text-white">{item.name}</p>
                <p className="mt-1 text-xs font-bold text-pink-200">{item.tagline}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="no-print grid gap-4 md:grid-cols-2">
          {EMILY_THEMES.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setTheme(item.name)}
              className={`rounded-[1.75rem] border p-5 text-left transition ${
                theme === item.name ? "border-yellow-200/70 bg-white/[0.12]" : "border-white/10 bg-white/[0.06]"
              }`}
            >
              <div className={`mb-4 h-1 rounded-full bg-gradient-to-r ${item.accent}`} />
              <p className="text-sm font-bold text-zinc-400">{item.shortLabel}</p>
              <h3 className="mt-2 text-2xl font-black text-white">{item.name}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              {item.planeMode && (
                <p className="mt-3 text-xs font-bold text-yellow-200/80">
                  {item.planeMode === "halal" ? "🕌 Halal Plane 연동" : "🍸 Drunken Plane 연동"}
                </p>
              )}
            </button>
          ))}
        </section>

        <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Groq 없이도 무료 규칙 일정·OSM 지도·검색 링크·PDF가 나옵니다. 키가 있으면 AI 일정으로 업그레이드됩니다.
          </p>
          <button
            type="button"
            onClick={handleBuildGuidebook}
            disabled={loading || !city.trim()}
            className="rounded-full bg-yellow-200 px-6 py-4 text-sm font-black text-zinc-950 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "가이드북 생성 중..." : selectedWorker ? "가이드북 만들기 (AI)" : "가이드북 만들기 (무료)"}
          </button>
        </div>

        {loading && (
          <div className="no-print flex items-center gap-3 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 text-yellow-200">
            <span className="h-3 w-3 animate-pulse rounded-full bg-yellow-300" />
            <p className="font-bold">수집 데이터 확인 후 {theme} 테마 일정을 짜는 중...</p>
          </div>
        )}

        {error && (
          <div className="no-print rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">
            {error}
          </div>
        )}

        {guidebook && <GuidebookView guidebook={guidebook} groqModelId={selectedWorker || undefined} />}
      </section>
    </main>
  );
}
