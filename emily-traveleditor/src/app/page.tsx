"use client";
import { useState } from "react";
import { getEmilyWorkers, askEmily } from "@/lib/groqMarket";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [result, setResult] = useState("");

  const loadWorkers = async () => {
    const data = await getEmilyWorkers(apiKey);
    setWorkers(data);
    if (data.length > 0) setSelectedWorker(data[0].id);
  };

  return (
    <main className="p-8 font-sans">
      <h1 className="text-3xl font-bold mb-6">Emily's Traveleditor</h1>
      
      {/* 설정 영역 */}
      <div className="mb-8 p-4 border rounded">
        <input 
          type="password" 
          placeholder="Groq API Key 입력"
          className="border p-2 mr-2 text-black"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <button onClick={loadWorkers} className="bg-blue-500 text-white p-2 rounded">
          지금 일할 놈들 다 나와 (인력시장 로딩)
        </button>
      </div>

      {/* 모델 선택 및 카테고리 */}
      {workers.length > 0 && (
        <div className="space-y-4">
          <select 
            value={selectedWorker} 
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="block border p-2 text-black"
          >
            {workers.map((w: any) => <option key={w.id} value={w.id}>{w.id}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-4">
            {["마음의 평화", "인생이 무료", "오늘은 Yolo", "절제와 신앙"].map(cat => (
              <button 
                key={cat}
                onClick={async () => {
                  const res = await askEmily(apiKey, selectedWorker, cat, "오늘 나의 여행 운세와 장소를 추천해줘.");
                  setResult(res.choices[0].message.content);
                }}
                className="bg-gray-800 text-white p-4 rounded hover:bg-black"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 결과 화면 */}
      {result && (
        <div className="mt-8 p-6 bg-yellow-50 border-l-4 border-yellow-400 text-black">
          <p className="whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </main>
  );
}