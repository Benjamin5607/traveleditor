"use client";
import { useState, useEffect } from "react";
import { getEmilyWorkers, askEmily } from "../lib/groqMarket";
import type { EmilyWorker } from "../lib/groqMarket";
import { EMILY_THEMES } from "../lib/themes";

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

function normalizeCityName(cityName: string) {
  return cityName.trim().toLowerCase().replace(/[\s-]/g, "");
}

function findCityRecommendations(
  cities: Record<string, ThemeTravelRecommendation[]> | undefined,
  cityName: string
) {
  const target = normalizeCityName(cityName);
  return Object.entries(cities ?? {}).find(([name]) => normalizeCityName(name) === target)?.[1] ?? [];
}

export default function Home() {
  const [workers, setWorkers] = useState<EmilyWorker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [city, setCity] = useState("Seoul"); // 도시 추가
  const [result, setResult] = useState("");
  const [linkRecommendations, setLinkRecommendations] = useState<ThemeTravelRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState("");

  useEffect(() => {
    (async () => {
      const data = await getEmilyWorkers();
      if (data.length > 0) {
        setWorkers(data);
        setSelectedWorker(data[0].id);
      }
    })();
  }, []);

  const loadThemeLinks = async (cat: string) => {
    try {
      const response = await fetch("/traveleditor/data/theme_travel_db.json");
      if (!response.ok) {
        setLinkRecommendations([]);
        return;
      }

      const db = (await response.json()) as ThemeTravelDb;
      setLinkRecommendations(findCityRecommendations(db.themes?.[cat]?.cities, city));
    } catch {
      setLinkRecommendations([]);
    }
  };

  const handleAsk = async (cat: string) => {
    setActiveTheme(cat);
    setResult("");
    setLinkRecommendations([]);
    setLoading(true);
    await loadThemeLinks(cat);
    const msg = await askEmily(selectedWorker, cat, city);
    setResult(msg);
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070b] px-5 py-8 text-zinc-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_28%),linear-gradient(135deg,rgba(39,39,42,0.28),transparent_45%)]" />
      <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-8">
        <header className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">
              Emily Travel Editor
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-[-0.06em] text-white sm:text-6xl md:text-7xl">
                EMILY&apos;S
                <span className="block bg-gradient-to-r from-yellow-200 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                  PANTHEON
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                도시 하나만 던지면 에밀리가 날씨, 물가, 취향 테마를 섞어서 한 줄로 쏘아붙입니다.
              </p>
            </div>
          </div>

          <div className="grid content-end gap-4 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Destination</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="도시 이름 (영문)"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-lg font-semibold text-white outline-none transition focus:border-yellow-200/60 focus:bg-white/[0.14]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Groq Worker</span>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-yellow-200/60 focus:bg-zinc-900"
              >
                {workers.length === 0 && <option value="">모델 불러오는 중</option>}
                {workers.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
              </select>
            </label>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {EMILY_THEMES.map((theme) => {
            const selected = activeTheme === theme.name;

            return (
              <button
                key={theme.name}
                onClick={() => handleAsk(theme.name)}
                disabled={loading || !selectedWorker}
                className={`group relative overflow-hidden rounded-[1.75rem] border p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected ? "border-yellow-200/70 bg-white/[0.12]" : "border-white/10 bg-white/[0.06]"
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.accent}`} />
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-zinc-400">{theme.shortLabel}</p>
                    <h2 className="text-2xl font-black tracking-[-0.03em] text-white">{theme.name}</h2>
                    <p className="max-w-xl text-sm leading-6 text-zinc-400">{theme.description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300 transition group-hover:border-white/30 group-hover:text-white">
                    ASK
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        <section className="min-h-40 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/20">
          {loading && (
            <div className="flex items-center gap-3 text-yellow-200">
              <span className="h-3 w-3 animate-pulse rounded-full bg-yellow-300" />
              <p className="font-bold">에밀리가 {activeTheme} 테마로 날씨와 물가를 째려보는 중...</p>
            </div>
          )}
          {!loading && !result && (
            <p className="text-zinc-500">도시와 모델을 확인한 뒤 테마를 누르면 에밀리의 한마디가 여기에 뜹니다.</p>
          )}
          {!loading && result && (
            <article className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">Emily says</p>
              <p className="text-xl font-semibold leading-9 text-zinc-100">{result}</p>
            </article>
          )}
        </section>

        {linkRecommendations.length > 0 && (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Plan links</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">공식/예약 확인 링크</h2>
              </div>
              <p className="text-sm text-zinc-500">확인된 공식 링크가 없으면 출처 링크를 먼저 보여줍니다.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {linkRecommendations.slice(0, 4).map((item, index) => {
                const sourceUrl = item.source_urls?.[0] ?? "";
                const primaryUrl = item.official_url || sourceUrl;
                const primaryLabel = item.official_url ? "공식/예약 확인" : "운영 정보 확인";

                return (
                  <article key={`${item.title}-${index}`} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-yellow-200">{item.angle || "테마 추천 후보"}</p>
                      <h3 className="text-xl font-black tracking-[-0.03em] text-white">{item.title}</h3>
                      <p className="text-sm leading-6 text-zinc-400">{item.why}</p>
                      <p className="text-xs leading-5 text-zinc-500">{item.reservation_hint}</p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {primaryUrl && (
                        <a
                          href={primaryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-yellow-200 px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-yellow-100"
                        >
                          {primaryLabel}
                        </a>
                      )}
                      {sourceUrl && sourceUrl !== primaryUrl && (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-white/30 hover:text-white"
                        >
                          출처 보기
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
