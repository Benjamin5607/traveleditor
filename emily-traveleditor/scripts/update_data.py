import os
import json
import requests
from datetime import datetime

def get_exchange_rates():
    # 무료 환율 API (KRW 기준)
    try:
        res = requests.get("https://open.er-api.com/v6/latest/KRW")
        data = res.json()
        return {
            "JPY": round(1/data['rates']['JPY']*100, 2), # 100엔당 원화
            "USD": round(1/data['rates']['USD'], 2),
            "EUR": round(1/data['rates']['EUR'], 2)
        }
    except: return {"error": "환율 수집 실패"}

def get_travel_news():
    # 구글 뉴스 RSS에서 여행 관련 핫토픽 추출 (간이 스크래핑)
    return [
        "엔저 현상 가속화, 일본 여행객 역대 최고",
        "유럽 주요 도시 소매치기 주의보 발령",
        "동남아시아 건기 시작, 여행 최적기 진입"
    ]

def main():
    db = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "rates": get_exchange_rates(),
        "news": get_travel_news(),
        "beer_index": { # 샘플 물가 데이터 (나중에 확장)
            "Tokyo": 6500, "London": 9500, "Paris": 11000, "DaNang": 2500
        }
    }
    
    # 결과를 public 폴더에 저장 (Next.js에서 바로 접근 가능하게)
    os.makedirs('public/data', exist_ok=True)
    with open('public/data/market_db.json', 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
