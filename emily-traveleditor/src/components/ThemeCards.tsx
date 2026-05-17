"use client";

import { themes, ThemeInfo } from "../lib/types";

interface ThemeCardsProps {
  onSelect: (theme: ThemeInfo) => void;
  loading: boolean;
  activeTheme: string | null;
}

export default function ThemeCards({ onSelect, loading, activeTheme }: ThemeCardsProps) {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-white">
          오늘의 여행 무드는?
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {themes.map((theme) => {
          const isActive = activeTheme === theme.id;
          const isLoading = loading && isActive;

          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme)}
              disabled={loading}
              className={`group relative overflow-hidden rounded-2xl text-left transition-all duration-500 border ${
                isActive
                  ? "border-white/20 shadow-2xl scale-[1.02]"
                  : "border-zinc-800/50 hover:border-zinc-700/50 hover:shadow-lg"
              } ${loading && !isActive ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-opacity duration-500 ${
                isActive ? "opacity-90" : "opacity-20 group-hover:opacity-40"
              }`} />

              <div
                className="absolute inset-0 opacity-30"
                style={{ background: theme.bgPattern }}
              />

              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl transition-transform duration-300 group-hover:scale-110">
                    {theme.icon}
                  </span>
                  {isLoading && (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                </div>

                <h3 className={`text-lg font-bold mb-1 transition-colors ${
                  isActive ? "text-white" : "text-zinc-200 group-hover:text-white"
                }`}>
                  {theme.label}
                </h3>

                <p className={`text-sm leading-relaxed transition-colors ${
                  isActive ? "text-white/80" : "text-zinc-500 group-hover:text-zinc-400"
                }`}>
                  {theme.description}
                </p>

                <div className={`mt-4 inline-flex items-center gap-1.5 text-xs font-medium transition-all ${
                  isActive ? "text-white/90" : "text-zinc-600 group-hover:text-zinc-400"
                }`}>
                  <span>{isLoading ? "에밀리 생각 중..." : "에밀리에게 물어보기"}</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isActive ? "" : "group-hover:translate-x-0.5"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
