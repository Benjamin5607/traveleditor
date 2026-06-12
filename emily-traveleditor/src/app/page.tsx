"use client";
import { useState, useEffect } from "react";
import GuidebookView from "../components/GuidebookView";
import CardCarousel from "../components/CardCarousel";
import SegmentedControl from "../components/SegmentedControl";
import { getEmilyWorkers } from "../lib/groqMarket";
import type { EmilyWorker } from "../lib/groqMarket";
import { buildTravelGuidebook } from "../lib/tripPlanner";
import { BUDGET_THEMES } from "../lib/budgetThemes";
import { EMILY_THEMES, localizeTheme, type ThemeId } from "../lib/themes";
import {
  airportLabel,
  POPULAR_ORIGIN_CITIES,
  resolveCityAirport,
  resolveCityAirportAsync,
  type VerifiedAirport,
} from "../lib/airports";
import { t, type Locale } from "../lib/i18n";
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
  { id: "1d", days: 1, nights: 0, lodging: "none" as LodgingId },
  { id: "3d", days: 3, nights: 0, lodging: "none" as LodgingId },
  { id: "2n3d", days: 3, nights: 2, lodging: "hotel" as LodgingId },
  { id: "3n4d", days: 4, nights: 3, lodging: "hotel" as LodgingId },
] as const;

function pickChatModel(workers: EmilyWorker[]) {
  const preferred = workers.find((worker) =>
    /llama-3\.3|llama-4|versatile|scout|instruct/i.test(worker.id) &&
    !/prompt-guard|guard/i.test(worker.id)
  );
  return preferred?.id ?? workers[0]?.id ?? "";
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [workers, setWorkers] = useState<EmilyWorker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [originCity, setOriginCity] = useState("Seoul");
  const [city, setCity] = useState("Bangkok");
  const [theme, setTheme] = useState<ThemeId>(EMILY_THEMES[0].id);
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
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    (async () => {
      const data = await getEmilyWorkers();
      if (data.length > 0) {
        setWorkers(data);
        setSelectedWorker(pickChatModel(data));
      }
    })();
  }, []);

  const presetLabels: Record<(typeof TRIP_PRESETS)[number]["id"], string> = {
    "1d": t(locale, "preset.1d"),
    "3d": t(locale, "preset.3d"),
    "2n3d": t(locale, "preset.2n3d"),
    "3n4d": t(locale, "preset.3n4d"),
  };

  const transportLabels: Record<TransportId, string> = {
    walk: locale === "en" ? "Walk" : "도보",
    bus: locale === "en" ? "Transit" : "버스/대중교통",
    rental_car: locale === "en" ? "Rental car" : "렌트카",
  };

  const lodgingLabels: Record<LodgingId, string> = {
    hotel: locale === "en" ? "Hotel" : "호텔",
    inn: locale === "en" ? "Guesthouse" : "여관/게스트하우스",
    hostel: locale === "en" ? "Hostel" : "호스텔",
    none: locale === "en" ? "No stay" : "숙박 없음",
  };

  const [originAirport, setOriginAirport] = useState<VerifiedAirport | null>(() => resolveCityAirport("Seoul"));
  const [destAirport, setDestAirport] = useState<VerifiedAirport | null>(() => resolveCityAirport("Bangkok"));
  const [airportResolving, setAirportResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setAirportResolving(true);
      const [origin, dest] = await Promise.all([
        resolveCityAirportAsync(originCity),
        resolveCityAirportAsync(city),
      ]);
      if (!cancelled) {
        setOriginAirport(origin);
        setDestAirport(dest);
        setAirportResolving(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [originCity, city]);

  const handleBuildGuidebook = async () => {
    setLoading(true);
    setError("");
    setGuidebook(null);

    const prefs: TripPreferences = {
      originCity,
      city,
      theme,
      days,
      nights: lodging === "none" ? 0 : nights,
      transport,
      lodging,
      budgetTheme,
      budgetKrw,
      locale,
    };

    const result = await buildTravelGuidebook(prefs, selectedWorker);
    if ("error" in result) {
      setError(result.error);
    } else {
      setGuidebook(result);
    }
    setLoading(false);
  };

  const selectedTheme = EMILY_THEMES.find((th) => th.id === theme)!;
  const localizedSelected = localizeTheme(selectedTheme, locale);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070b] px-5 py-8 text-zinc-100 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_28%),linear-gradient(135deg,rgba(39,39,42,0.28),transparent_45%)]" />
      <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="no-print grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">
                {t(locale, "app.badge")}
              </div>
              <SegmentedControl
                options={[
                  { value: "ko" as Locale, label: t(locale, "lang.ko") },
                  { value: "en" as Locale, label: t(locale, "lang.en") },
                ]}
                value={locale}
                onChange={setLocale}
              />
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-black leading-none tracking-[-0.06em] text-white sm:text-6xl">
                {t(locale, "app.title1")}
                <span className="block bg-gradient-to-r from-yellow-200 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                  {t(locale, "app.title2")}
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-300">{t(locale, "app.subtitle")}</p>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{t(locale, "origin.label")}</span>
              <input
                type="text"
                list="origin-cities"
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                placeholder={t(locale, "origin.placeholder")}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-lg font-semibold text-white outline-none transition focus:border-yellow-200/60"
              />
              <datalist id="origin-cities">
                {POPULAR_ORIGIN_CITIES.map((c) => <option key={c} value={c} />)}
              </datalist>
              <p className="text-xs text-zinc-500">
                {airportResolving
                  ? t(locale, "airport.resolving")
                  : originAirport
                    ? airportLabel(originAirport, locale)
                    : t(locale, "airport.unknown")}
              </p>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{t(locale, "destination.label")}</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t(locale, "destination.placeholder")}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-lg font-semibold text-white outline-none transition focus:border-yellow-200/60"
              />
              <p className="text-xs text-zinc-500">
                {airportResolving
                  ? t(locale, "airport.resolving")
                  : destAirport
                    ? airportLabel(destAirport, locale)
                    : t(locale, "airport.unknown")}
              </p>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{t(locale, "worker.label")}</span>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-semibold text-white outline-none"
              >
                {workers.length === 0 && <option value="">{t(locale, "worker.loading")}</option>}
                {workers.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
              </select>
            </label>
          </div>
        </header>

        <section className="no-print rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">{t(locale, "trip.setup")}</p>

          <div className="mt-5">
            <SegmentedControl
              options={TRIP_PRESETS.map((p) => ({
                value: p.id,
                label: presetLabels[p.id],
              }))}
              value={
                TRIP_PRESETS.find((p) => p.days === days && p.nights === (lodging === "none" ? 0 : nights) && p.lodging === lodging)?.id ?? "2n3d"
              }
              onChange={(id) => {
                const preset = TRIP_PRESETS.find((p) => p.id === id)!;
                setDays(preset.days);
                setNights(preset.nights);
                setLodging(preset.lodging);
              }}
              className="w-full flex-wrap"
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">{t(locale, "trip.days")}</span>
              <input type="number" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">{t(locale, "trip.nights")}</span>
              <input type="number" min={0} max={13} value={nights} onChange={(e) => setNights(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">
                {t(locale, "trip.budget")}{budgetTheme !== "custom" ? t(locale, "trip.budget.auto") : ""}
              </span>
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
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">{t(locale, "trip.transport")}</span>
              <SegmentedControl
                options={TRANSPORT_OPTIONS.map((o) => ({ value: o.id, label: transportLabels[o.id] }))}
                value={transport}
                onChange={setTransport}
                className="w-full flex-wrap"
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-500">{t(locale, "trip.lodging")}</span>
              <SegmentedControl
                options={LODGING_OPTIONS.map((o) => ({ value: o.id, label: lodgingLabels[o.id] }))}
                value={lodging}
                onChange={setLodging}
                className="w-full flex-wrap"
              />
            </div>
          </div>
        </section>

        <section className="no-print rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">{t(locale, "budget.section")}</p>
          <CardCarousel className="mt-5" itemClassName="py-1">
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
                className={`w-[min(100%,280px)] shrink-0 snap-center rounded-2xl border p-4 text-left transition ${
                  budgetTheme === item.id ? "border-pink-300/60 bg-pink-300/10 ring-1 ring-pink-300/30" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <p className="text-2xl">{item.emoji}</p>
                <p className="mt-2 font-black text-white">{item.name}</p>
                <p className="mt-1 text-xs font-bold text-pink-200">{item.tagline}</p>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{item.description}</p>
              </button>
            ))}
          </CardCarousel>
        </section>

        <section className="no-print rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">{t(locale, "theme.section")}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{localizedSelected.name}</h2>
            </div>
            <p className="text-sm text-zinc-400">{localizedSelected.shortLabel}</p>
          </div>

          <CardCarousel className="mt-5" itemClassName="py-1">
            {EMILY_THEMES.map((item) => {
              const loc = localizeTheme(item, locale);
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={`w-[min(100%,300px)] shrink-0 snap-center rounded-[1.75rem] border p-5 text-left transition ${
                    active ? "border-yellow-200/70 bg-white/[0.12] ring-1 ring-yellow-200/40" : "border-white/10 bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    {active && (
                      <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-[10px] font-black text-zinc-950">✓</span>
                    )}
                  </div>
                  <div className={`mb-3 mt-3 h-1 rounded-full bg-gradient-to-r ${item.accent}`} />
                  <p className="text-xs font-bold text-zinc-400">{loc.shortLabel}</p>
                  <h3 className="mt-1 text-xl font-black text-white">{loc.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{loc.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {loc.requirements.slice(0, 3).map((req) => (
                      <span key={req} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">
                        {req}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </CardCarousel>
        </section>

        <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">{t(locale, "build.hint")}</p>
          <button
            type="button"
            onClick={handleBuildGuidebook}
            disabled={loading || !city.trim() || !originCity.trim()}
            className="rounded-full bg-yellow-200 px-6 py-4 text-sm font-black text-zinc-950 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t(locale, "build.loading") : selectedWorker ? t(locale, "build.ai") : t(locale, "build.free")}
          </button>
        </div>

        {loading && (
          <div className="no-print flex items-center gap-3 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 text-yellow-200">
            <span className="h-3 w-3 animate-pulse rounded-full bg-yellow-300" />
            <p className="font-bold">{t(locale, "loading.status")}</p>
          </div>
        )}

        {error && (
          <div className="no-print rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">
            {error}
          </div>
        )}

        {guidebook && <GuidebookView guidebook={guidebook} />}
      </section>
    </main>
  );
}
