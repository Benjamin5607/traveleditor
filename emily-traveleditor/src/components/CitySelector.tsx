"use client";

import { cities, CityData } from "../lib/cities";

interface CitySelectorProps {
  selectedCity: CityData;
  onSelect: (city: CityData) => void;
}

export default function CitySelector({ selectedCity, onSelect }: CitySelectorProps) {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-white">
          어디로 떠날까요?
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-transparent" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {cities.map((city) => {
          const isSelected = city.id === selectedCity.id;
          return (
            <button
              key={city.id}
              onClick={() => onSelect(city)}
              className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 border ${
                isSelected
                  ? "bg-white/10 border-white/20 shadow-lg shadow-white/5 scale-[1.02]"
                  : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient} opacity-0 transition-opacity duration-300 ${
                isSelected ? "opacity-15" : "group-hover:opacity-10"
              }`} />

              <div className="relative z-10">
                <span className="text-2xl">{city.countryFlag}</span>
                <div className="mt-2">
                  <div className={`font-bold text-sm ${isSelected ? "text-white" : "text-zinc-300"}`}>
                    {city.nameKo}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{city.nameEn}</div>
                </div>
                <div className="mt-2 text-[10px] text-zinc-600 leading-snug line-clamp-1">
                  {city.tagline}
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
