"use client";
import { useState, useEffect } from "react";
import { getEmilyWorkers, askEmily } from "../lib/groqMarket";

export default function Home() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [city, setCity] = useState("Seoul"); // 도시 추가
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
    const msg = await askEmily(selectedWorker, cat, city);
    setResult(msg);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-black text-yellow-500 my-8">EMILY'S PANTHEON</h1>
      
      <div className="w-full max-w-md space-y-4">
        <input 
          type="text" 
          value={city} 
          onChange={(e) => setCity(e.target.value)}
          placeholder="도시 이름 (영문)"
          className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl text-lg text-white"
        />
        
        <select 
          value={selectedWorker} 
          onChange={(e) => setSelectedWorker(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-xl text-lg"
        >
          {workers.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
        </select>

        <div className="grid grid-cols-1 gap-4">
          {["마음의 평화", "인생이 무료", "오늘은 Yolo", "절제와 신앙"].map(cat => (
            <button key={cat} onClick={() => handleAsk(cat)} disabled={loading}
              className="py-6 bg-zinc-800 border-b-4 border-zinc-600 rounded-2xl active:border-b-0 active:translate-y-1 transition-all text-xl font-bold">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="mt-8 text-yellow-500 font-bold">에밀리가 날씨 체크 중...</p>}
      {result && <div className="mt-10 p-6 bg-zinc-100 text-zinc-900 rounded-3xl shadow-2xl text-lg leading-relaxed">{result}</div>}
    </main>
  );
}
