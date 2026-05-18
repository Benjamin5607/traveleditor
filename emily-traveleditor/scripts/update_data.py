import os
import json
import requests
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / 'public' / 'data'
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary"
WIKIVOYAGE_API_URL = "https://en.wikivoyage.org/w/api.php"
WIKIDATA_ENTITY_URL = "https://www.wikidata.org/wiki/Special:EntityData"
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
CRAWLER_HEADERS = {
    "User-Agent": os.environ.get(
        "EMILY_CRAWLER_USER_AGENT",
        "EmilyTravelEditor/1.0 (https://github.com/Benjamin5607/traveleditor)",
    )
}
TARGET_CITIES = [
    city.strip()
    for city in os.environ.get("EMILY_CRAWL_CITIES", "Seoul,Tokyo,London,Paris,DaNang").split(",")
    if city.strip()
]
CITY_PAGE_TITLES = {
    "DaNang": "Da Nang",
}
THEME_CRAWL_CONFIG = {
    "마음의 평화": {
        "keywords": ["tea house", "coffee roastery", "botanical garden", "quiet walk"],
        "brief": "차, 커피, 고요한 산책처럼 마음이 진정되는 장소",
    },
    "인생이 무료": {
        "keywords": ["winery", "whisky distillery", "craft brewery", "beer tour"],
        "brief": "와이너리, 위스키 디스틸러리, 비어 브류어리처럼 술과 생산지를 경험하는 장소",
    },
    "오늘은 욜로": {
        "keywords": ["nightclub", "speakeasy bar", "concept bar", "nightlife district"],
        "brief": "클럽, 스픽이지 바, 특이한 콘셉트 바처럼 밤의 에너지가 강한 장소",
    },
    "신앙": {
        "keywords": ["religious site", "mosque", "cathedral", "temple", "halal travel"],
        "brief": "할랄 투어, 종교 유적지, 사원, 성당, 모스크처럼 믿음과 문화가 만나는 장소",
    },
}


def request_json(url: str, **kwargs: Any) -> dict[str, Any]:
    headers = {**CRAWLER_HEADERS, **kwargs.pop("headers", {})}
    response = requests.get(url, timeout=15, headers=headers, **kwargs)
    response.raise_for_status()
    return response.json()

def get_exchange_rates():
    # 무료 환율 API (KRW 기준)
    try:
        res = requests.get("https://open.er-api.com/v6/latest/KRW", timeout=15)
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


def search_wikipedia(query: str, limit: int = 2) -> list[dict[str, Any]]:
    try:
        data = request_json(
            WIKIPEDIA_API_URL,
            params={
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": query,
                "srlimit": limit,
                "utf8": 1,
            },
        )
        return data.get("query", {}).get("search", [])
    except requests.RequestException:
        return []


def get_wikipedia_summary(title: str) -> dict[str, str] | None:
    try:
        data = request_json(f"{WIKIPEDIA_SUMMARY_URL}/{quote(title)}")
        extract = data.get("extract") or ""
        if not extract:
            return None
        official_urls = get_wikidata_official_urls(data.get("wikibase_item"))
        return {
            "title": data.get("title") or title,
            "extract": extract[:700],
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "official_url": official_urls[0] if official_urls else "",
        }
    except requests.RequestException:
        return None


def get_wikidata_official_urls(entity_id: str | None) -> list[str]:
    if not entity_id:
        return []

    try:
        data = request_json(f"{WIKIDATA_ENTITY_URL}/{entity_id}.json")
        entity = data.get("entities", {}).get(entity_id, {})
        claims = entity.get("claims", {}).get("P856", [])
        urls = []
        for claim in claims:
            value = claim.get("mainsnak", {}).get("datavalue", {}).get("value")
            if isinstance(value, str) and value.startswith("http"):
                urls.append(value)
        return urls
    except requests.RequestException:
        return []


def get_wikivoyage_city_source(city: str) -> dict[str, str] | None:
    title = CITY_PAGE_TITLES.get(city, city)
    try:
        data = request_json(
            WIKIVOYAGE_API_URL,
            params={
                "action": "query",
                "format": "json",
                "prop": "extracts",
                "explaintext": 1,
                "titles": title,
                "redirects": 1,
            },
        )
        pages = data.get("query", {}).get("pages", {})
        page = next(iter(pages.values()))
        extract = page.get("extract") or ""
        if not extract:
            return None
        page_title = page.get("title") or title
        return {
            "title": f"Wikivoyage: {page_title}",
            "extract": extract[:1600],
            "url": f"https://en.wikivoyage.org/wiki/{quote(page_title.replace(' ', '_'))}",
            "official_url": "",
        }
    except (requests.RequestException, StopIteration):
        return None


def is_city_relevant(source: dict[str, str], city: str) -> bool:
    title = CITY_PAGE_TITLES.get(city, city)
    haystack = f"{source.get('title', '')} {source.get('extract', '')} {source.get('url', '')}".lower()
    aliases = {city.lower(), title.lower(), title.lower().replace(" ", "")}
    return any(alias in haystack.replace(" ", "") or alias in haystack for alias in aliases)


def crawl_theme_sources(city: str, keywords: list[str], max_sources: int = 5) -> list[dict[str, str]]:
    sources = []
    seen_titles = set()
    city_title = CITY_PAGE_TITLES.get(city, city)
    city_source = get_wikivoyage_city_source(city)

    if city_source:
        sources.append(city_source)
        seen_titles.add(city_source["title"])

    for keyword in keywords:
        if len(sources) >= max_sources:
            break

        for result in search_wikipedia(f'"{city_title}" "{keyword}" travel', limit=3):
            title = result.get("title")
            if not title or title in seen_titles:
                continue

            summary = get_wikipedia_summary(title)
            if not summary or not is_city_relevant(summary, city):
                continue

            seen_titles.add(title)
            sources.append(summary)
            if len(sources) >= max_sources:
                break

    return sources


def fallback_theme_summary(theme: str, config: dict[str, Any], city_sources: dict[str, list[dict[str, str]]]) -> dict[str, Any]:
    cities = {}
    for city, sources in city_sources.items():
        cities[city] = [
            {
                "title": source["title"],
                "angle": config["brief"],
                "why": source["extract"][:180],
                "source_titles": [source["title"]],
                "source_urls": [source["url"]],
                "official_url": source.get("official_url", ""),
                "reservation_hint": "공식 사이트에서 운영시간과 예약 가능 여부를 확인하세요." if source.get("official_url") else "출처 링크에서 운영 정보를 먼저 확인하세요.",
            }
            for source in sources[:3]
        ]

    return {
        "theme": theme,
        "keywords": config["keywords"],
        "cities": cities,
        "generated_by": "wikipedia-fallback",
    }


def sanitize_groq_summary(
    theme: str,
    config: dict[str, Any],
    parsed: dict[str, Any],
    city_sources: dict[str, list[dict[str, str]]],
) -> dict[str, Any]:
    parsed_cities = parsed.get("cities", {})
    cities = {}

    for city in TARGET_CITIES:
        sources = city_sources.get(city, [])
        source_titles = {source["title"] for source in sources}
        source_urls = {source["url"] for source in sources if source.get("url")}
        official_urls_by_title = {
            source["title"]: source.get("official_url", "")
            for source in sources
        }
        fallback_items = fallback_theme_summary(theme, config, {city: sources})["cities"].get(city, [])
        items = parsed_cities.get(city) if isinstance(parsed_cities, dict) else None

        if not isinstance(items, list) or not items:
            cities[city] = fallback_items
            continue

        cleaned_items = []
        for index, item in enumerate(items[:3]):
            if not isinstance(item, dict):
                continue

            raw_titles = item.get("source_titles", [])
            raw_urls = item.get("source_urls", [])
            raw_titles = raw_titles if isinstance(raw_titles, list) else []
            raw_urls = raw_urls if isinstance(raw_urls, list) else []
            valid_titles = [
                title for title in raw_titles
                if isinstance(title, str) and title in source_titles
            ]
            valid_urls = [
                url for url in raw_urls
                if isinstance(url, str) and url in source_urls
            ]

            fallback_source = sources[min(index, len(sources) - 1)] if sources else None
            if fallback_source and (not valid_titles or not valid_urls):
                valid_titles = [fallback_source["title"]]
                valid_urls = [fallback_source["url"]]

            cleaned_items.append({
                "title": str(item.get("title") or (fallback_source or {}).get("title") or city),
                "angle": str(item.get("angle") or config["brief"]),
                "why": str(item.get("why") or config["brief"]),
                "source_titles": valid_titles,
                "source_urls": valid_urls,
                "official_url": next((official_urls_by_title.get(title, "") for title in valid_titles if official_urls_by_title.get(title)), ""),
                "reservation_hint": "공식 사이트에서 운영시간과 예약 가능 여부를 확인하세요." if any(official_urls_by_title.get(title) for title in valid_titles) else "공식 예약 링크가 확인되지 않아 출처 링크를 먼저 확인하세요.",
            })

        cities[city] = cleaned_items or fallback_items

    return {
        "theme": theme,
        "keywords": config["keywords"],
        "cities": cities,
        "generated_by": "groq",
    }


def summarize_theme_with_groq(theme: str, config: dict[str, Any], city_sources: dict[str, list[dict[str, str]]]) -> dict[str, Any]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or not any(city_sources.values()):
        return fallback_theme_summary(theme, config, city_sources)

    source_payload = {
        city: [
            {
                "title": source["title"],
                "extract": source["extract"],
                "url": source["url"],
                "official_url": source.get("official_url", ""),
            }
            for source in sources
        ]
        for city, sources in city_sources.items()
    }
    prompt = f"""
다음은 공개 여행/백과 소스에서 크롤링한 도시별 후보야.
테마: {theme}
테마 기준: {config["brief"]}

각 도시마다 테마에 맞는 여행 후보 2~3개를 골라 한국어 JSON으로만 답해.
도시 키는 반드시 다음 영문 표기를 그대로 써: {json.dumps(TARGET_CITIES, ensure_ascii=False)}
source_titles와 source_urls는 크롤링 소스에 있는 값만 그대로 써. 새 URL을 만들지 마.
official_url은 크롤링 소스의 official_url 값이 있을 때만 써. 새 공식/예약 URL을 만들지 마.
스키마:
{{
  "theme": "{theme}",
  "keywords": {json.dumps(config["keywords"], ensure_ascii=False)},
  "cities": {{
    "CityName": [
      {{
        "title": "장소 또는 권역명",
        "angle": "테마와 맞는 이유 한 줄",
        "why": "여행자에게 줄 짧은 설명",
        "source_titles": ["참고한 소스 제목"],
        "source_urls": ["참고한 URL"],
        "official_url": "공식 사이트 URL 또는 빈 문자열",
        "reservation_hint": "예약/운영 확인 방법"
      }}
    ]
  }},
  "generated_by": "groq"
}}

크롤링 소스:
{json.dumps(source_payload, ensure_ascii=False)}
"""

    try:
        response = requests.post(
            GROQ_CHAT_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                "temperature": 0.2,
                "max_tokens": 2500,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": "You are a travel data editor. Return valid JSON only."},
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=45,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if not isinstance(parsed.get("cities"), dict):
            raise ValueError("Groq response did not include cities")
        return sanitize_groq_summary(theme, config, parsed, city_sources)
    except (requests.RequestException, KeyError, json.JSONDecodeError, ValueError):
        return fallback_theme_summary(theme, config, city_sources)


def collect_theme_travel_data() -> dict[str, Any]:
    themes = {}
    raw_sources = {}

    for theme, config in THEME_CRAWL_CONFIG.items():
        city_sources = {
            city: crawl_theme_sources(city, config["keywords"])
            for city in TARGET_CITIES
        }
        raw_sources[theme] = city_sources
        themes[theme] = summarize_theme_with_groq(theme, config, city_sources)

    return {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "source": {
            "crawl": "Wikivoyage city extracts plus Wikipedia search and summary APIs",
            "enrichment": "Groq chat completions when GROQ_API_KEY is available",
            "cities": TARGET_CITIES,
        },
        "themes": themes,
        "raw_sources": raw_sources,
    }

def main():
    db = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "rates": get_exchange_rates(),
        "news": get_travel_news(),
        "beer_index": { # 샘플 물가 데이터 (나중에 확장)
            "Tokyo": 6500, "London": 9500, "Paris": 11000, "DaNang": 2500
        }
    }
    
    theme_db = collect_theme_travel_data()

    # 결과를 public 폴더에 저장 (Next.js에서 바로 접근 가능하게)
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_DIR / 'market_db.json', 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    with open(DATA_DIR / 'theme_travel_db.json', 'w', encoding='utf-8') as f:
        json.dump(theme_db, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
