"use client";

import { useState, useEffect } from "react";
import { getEmilyWorkers, askEmily } from "../lib/groqMarket";
import { cities, CityData } from "../lib/cities";
import { ThemeInfo } from "../lib/types";
import Header from "../components/Header";
import CitySelector from "../components/CitySelector";
import LiveDashboard from "../components/LiveDashboard";
import ThemeCards from "../components/ThemeCards";
import EmilyResponse from "../components/EmilyResponse";
import ModelSelector from "../components/ModelSelector";

export default function Home() {
  const [workers, setWorkers] = useState<{ id: string }[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityData>(cities[0]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeInfo | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getEmilyWorkers();
      if (data.length > 0) {
        setWorkers(data);
        setSelectedWorker(data[0].id);
      }
    })();
  }, []);

  const handleThemeSelect = async (theme: ThemeInfo) => {
    if (loading) return;
    setLoading(true);
    setActiveTheme(theme);
    setResult("");

    const msg = await askEmily(selectedWorker, theme.label, selectedCity.nameEn);
    setResult(msg);
    setLoading(false);
  };

  const handleCitySelect = (city: CityData) => {
    setSelectedCity(city);
    setResult("");
    setActiveTheme(null);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />

      <div className="relative z-10 -mt-8 space-y-2">
        <CitySelector selectedCity={selectedCity} onSelect={handleCitySelect} />
        <LiveDashboard city={selectedCity} />
        <ModelSelector
          workers={workers}
          selectedWorker={selectedWorker}
          onChange={setSelectedWorker}
        />
        <ThemeCards
          onSelect={handleThemeSelect}
          loading={loading}
          activeTheme={activeTheme?.id ?? null}
        />
        <EmilyResponse
          result={result}
          theme={activeTheme}
          city={selectedCity}
          modelId={selectedWorker}
        />
      </div>

      <footer className="w-full max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-8" />
        <p className="text-xs text-zinc-600">
          Built with Next.js &middot; Powered by Groq AI &middot; Emily&apos;s Travel Editor
        </p>
      </footer>
    </main>
  );
}
