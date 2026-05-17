"use client";

interface ModelSelectorProps {
  workers: { id: string }[];
  selectedWorker: string;
  onChange: (id: string) => void;
}

export default function ModelSelector({ workers, selectedWorker, onChange }: ModelSelectorProps) {
  if (workers.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4">
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm text-zinc-500">
            AI 모델 로딩 중... (Groq API 키가 필요합니다)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider whitespace-nowrap">
          AI Model
        </span>
        <select
          value={selectedWorker}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-zinc-300 outline-none cursor-pointer font-mono"
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id} className="bg-zinc-900 text-zinc-300">
              {w.id}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
