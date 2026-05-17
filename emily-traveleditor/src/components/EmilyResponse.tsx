"use client";

import { ThemeInfo } from "../lib/types";
import { CityData } from "../lib/cities";

interface EmilyResponseProps {
  result: string;
  theme: ThemeInfo | null;
  city: CityData;
  modelId: string;
}

export default function EmilyResponse({ result, theme, city, modelId }: EmilyResponseProps) {
  if (!result) return null;

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        {theme && (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-5`}
          />
        )}

        <div className="relative z-10 p-8 md:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
              {theme?.icon || "\u2728"}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                Emily&apos;s Take
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {city.countryFlag} {city.nameKo} &middot; {theme?.label || "여행"} &middot;{" "}
                <span className="font-mono">{modelId.split("/").pop() || modelId}</span>
              </p>
            </div>
          </div>

          <div className="pl-16">
            <blockquote className="text-lg md:text-xl leading-relaxed text-zinc-200 font-medium">
              &ldquo;{result}&rdquo;
            </blockquote>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Powered by Groq AI
            </div>
            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(result);
                }
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              복사하기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
