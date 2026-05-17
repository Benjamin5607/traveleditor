"use client";

import { useState, useEffect } from "react";
import { CityData } from "../lib/cities";
import { WeatherInfo, ExchangeRates } from "../lib/types";
import { getWeatherData } from "../lib/groqMarket";

interface LiveDashboardProps {
  city: CityData;
}

function weatherCodeToEmoji(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("clear")) return "\u2600\uFE0F";
  if (d.includes("cloud")) return "\u2601\uFE0F";
  if (d.includes("rain") || d.includes("drizzle")) return "\uD83C\uDF27\uFE0F";
  if (d.includes("thunder")) return "\u26C8\uFE0F";
  if (d.includes("snow")) return "\u2744\uFE0F";
  if (d.includes("mist") || d.includes("fog") || d.includes("haze")) return "\uD83C\uDF2B\uFE0F";
  return "\uD83C\uDF24\uFE0F";
}

async function fetchWeatherData(cityName: string): Promise<WeatherInfo | null> {
  try {
    const data = await getWeatherData(cityName);
    if (data) {
      return {
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
      };
    }
  } catch { /* fallback below */ }
  return null;
}

async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/KRW");
    const data = await res.json();
    if (data.rates) {
      return {
        USD: (1 / data.rates.USD).toFixed(0),
        JPY: (100 / data.rates.JPY).toFixed(0),
        EUR: (1 / data.rates.EUR).toFixed(0),
        THB: (1 / data.rates.THB).toFixed(1),
        VND: (1000 / data.rates.VND).toFixed(1),
        TWD: (1 / data.rates.TWD).toFixed(1),
        SGD: (1 / data.rates.SGD).toFixed(0),
      };
    }
  } catch { /* fallback below */ }
  return null;
}

export default function LiveDashboard({ city }: LiveDashboardProps) {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [localTime, setLocalTime] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setWeatherLoading(true);
      const [w, r] = await Promise.all([
        fetchWeatherData(city.nameEn),
        fetchExchangeRates(),
      ]);
      if (!cancelled) {
        setWeather(w);
        setRates(r);
        setWeatherLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [city.nameEn]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: city.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };
      setLocalTime(now.toLocaleTimeString("ko-KR", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [city.timezone]);

  const rateEntries: { label: string; code: string; unit: string }[] = [
    { label: "USD", code: "USD", unit: "1$" },
    { label: "JPY", code: "JPY", unit: "100\u00A5" },
    { label: "EUR", code: "EUR", unit: "1\u20AC" },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weather Card */}
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {city.nameKo} 날씨
            </span>
            <span className="text-xs text-zinc-600">\uD83C\uDF0D Live</span>
          </div>
          {weatherLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-zinc-800 rounded w-24" />
              <div className="h-4 bg-zinc-800 rounded w-32" />
            </div>
          ) : weather ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{weatherCodeToEmoji(weather.description)}</span>
                <span className="text-4xl font-bold text-white">{weather.temp}\u00B0</span>
              </div>
              <p className="mt-1 text-sm text-zinc-400 capitalize">{weather.description}</p>
              <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                <span>\uD83D\uDCA7 {weather.humidity}%</span>
                <span>\uD83C\uDF2C\uFE0F {weather.windSpeed}m/s</span>
              </div>
            </div>
          ) : (
            <div className="text-zinc-600 text-sm">
              <span className="text-2xl">\uD83C\uDF24\uFE0F</span>
              <p className="mt-1">날씨 데이터 준비 중...</p>
            </div>
          )}
        </div>

        {/* Exchange Rate Card */}
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              환율 (KRW 기준)
            </span>
            <span className="text-xs text-zinc-600">\uD83D\uDCB1</span>
          </div>
          {rates ? (
            <div className="space-y-2.5">
              {rateEntries.map(({ label, code, unit }) => (
                <div key={code} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{label}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">
                      {Number(rates[code]).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500 ml-1">원/{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-zinc-800 rounded w-full" />
              <div className="h-5 bg-zinc-800 rounded w-full" />
              <div className="h-5 bg-zinc-800 rounded w-full" />
            </div>
          )}
        </div>

        {/* Local Time & City Info */}
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/50 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              현지 정보
            </span>
            <span className="text-xs text-zinc-600">\uD83D\uDD70\uFE0F</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white font-mono">{localTime || "--:--"}</span>
              <span className="text-xs text-zinc-500">현지시간</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">도시</span>
                <span className="text-zinc-300">{city.countryFlag} {city.nameKo}, {city.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">통화</span>
                <span className="text-zinc-300">{city.currencyCode} ({city.currency})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">시차</span>
                <span className="text-zinc-300">UTC{city.utcOffset >= 0 ? "+" : ""}{city.utcOffset}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
