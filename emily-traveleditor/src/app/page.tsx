"use client";
import { useState, useEffect } from "react";
import { getEmilyWorkers, askEmily } from "../lib/groqMarket";

export default function Home() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getEmilyWorkers();
      if (data.length > 0) {
        setWorkers(data);
        setSelectedWorker(data[0].id);
      }
    })();
  }, []);

  const handleAsk = async (cat: string) => {
    setLoading(true);
    try {
      const msg = await askEmily(selectedWorker, cat);
      setResult(msg);
    } catch (e) {
      setResult("Emily가 지금 화났나봐. 나중에 다시 해.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-black text-yellow-500 my-8 tracking-tighter">EMILY'S PANTHEON</h1>
      
      {workers.length > 0 ? (
        <div className="w-full max-w-md space-y-8">
          <select 
            value={selectedWorker} 
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl text-lg"
          >
            {workers.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
          </select>

          <div className="grid grid-cols-1 gap-4">
            {["마음의 평화", "인생이 무료", "오늘은 Yolo", "절제와 신앙"].map(cat => (
              <button 
                key={cat}
                onClick={() => handleAsk(cat)}
                disabled={loading}
                className="py-6 px-4 bg-zinc-800 border-b-4 border-zinc-600 rounded-2xl active:border-b-0 active:translate-y-1 transition-all text-xl font-bold"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="animate-pulse text-zinc-500">인력시장 문 여는 중...</p>
      )}

      {loading && <p className="mt-8 text-yellow-500 font-bold">에밀리가 고민 중...</p>}

      {result && (
        <div className="mt-10 p-6 bg-zinc-100 text-zinc-900 rounded-3xl shadow-2xl relative">
          <div className="absolute -top-3 left-6 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-bottom-[15px] border-bottom-zinc-100" />
          <p className="text-lg leading-relaxed whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </main>
  );
}
