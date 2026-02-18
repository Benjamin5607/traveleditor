"use client";
import { useState, useEffect } from "react";
import { getEmilyWorkers, askEmily } from "../lib/groqMarket";

export default function Home() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [result, setResult] = useState("");

  // 페이지 로드 시 바로 인력시장 체크 (환경변수 키가 있다면)
  useEffect(() => {
    const init = async () => {
      const data = await getEmilyWorkers();
      if (data.length > 0) {
        setWorkers(data);
        setSelectedWorker(data[0].id);
      }
    };
    init();
  }, []);

  const loadManual = async () => {
    const data = await getEmilyWorkers();
    setWorkers(data);
    if (data.length > 0) setSelectedWorker(data[0].id);
    else alert("모델을 못 불러왔어. 키 확인해봐!");
  };

  return (
    <main className="p-10 text-white bg-black min-h-screen">
      <h1 className="text-4xl font-bold mb-10 text-yellow-400">Emily's Traveleditor</h1>
      
      <div className="mb-10">
        <button onClick={loadManual} className="bg-blue-600 p-3 rounded">
          인력시장 다시 부르기
        </button>
      </div>

      {workers.length > 0 ? (
        <div className="space-y-6">
          <select 
            value={selectedWorker} 
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="text-black p-2 w-full max-w-md"
          >
            {workers.map((w) => <option key={w.id} value={w.id}>{w.id}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-4">
            {["마음의 평화", "인생이 무료", "오늘은 Yolo", "절제와 신앙"].map(cat => (
              <button 
                key={cat}
                onClick={async () => {
                  const res = await askEmily(selectedWorker, cat, "추천해줘.");
                  setResult(res.choices[0].message.content);
                }}
                className="border border-yellow-400 p-5 hover:bg-yellow-400 hover:text-black transition"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="animate-pulse">Emily가 인력시장에서 애들 모으는 중...</p>
      )}

      {result && <div className="mt-10 p-5 bg-white text-black rounded">{result}</div>}
    </main>
  );
}
