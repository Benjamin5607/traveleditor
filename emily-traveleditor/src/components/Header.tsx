"use client";

export default function Header() {
  return (
    <header className="relative w-full overflow-hidden">
      <div className="hero-gradient absolute inset-0 opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-zinc-300 tracking-wider uppercase">
            Live Travel Intelligence
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
            EMILY&apos;S
          </span>
          <br />
          <span className="text-white/90">TRAVEL EDITOR</span>
        </h1>

        <p className="mt-4 text-zinc-400 text-lg md:text-xl max-w-lg leading-relaxed">
          AI가 읽어주는 당신의 여행 무드
          <br />
          <span className="text-zinc-500 text-sm">도시를 고르고, 테마를 선택하면 에밀리가 한마디 해줄게요</span>
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
    </header>
  );
}
