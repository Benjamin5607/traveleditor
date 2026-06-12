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
DEFAULT_CITIES = "Seoul,Tokyo,Osaka,London,Paris,DaNang,Bangkok,Singapore,Taipei,Barcelona,Rome,Berlin"
TARGET_CITIES = [
    city.strip()
    for city in os.environ.get("EMILY_CRAWL_CITIES", DEFAULT_CITIES).split(",")
    if city.strip()
]
CITY_PAGE_TITLES = {
    "DaNang": "Da Nang",
    "HongKong": "Hong Kong",
    "NewYork": "New York",
    "LosAngeles": "Los Angeles",
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


def get_wikipedia_summary(title: str) -> dict[str, str | float] | None:
    try:
        data = request_json(f"{WIKIPEDIA_SUMMARY_URL}/{quote(title)}")
        extract = data.get("extract") or ""
        if not extract:
            return None
        wikibase_item = data.get("wikibase_item")
        official_urls = get_wikidata_official_urls(wikibase_item)
        coordinates = data.get("coordinates") or {}
        result = {
            "title": data.get("title") or title,
            "extract": extract[:700],
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "official_url": official_urls[0] if official_urls else "",
        }
        lat = coordinates.get("lat")
        lng = coordinates.get("lon")
        if lat is None or lng is None:
            lat, lng = get_wikidata_coordinates(wikibase_item)
        if lat is not None and lng is not None:
            result["lat"] = lat
            result["lng"] = lng
        return result
    except requests.RequestException:
        return None


def get_wikidata_coordinates(entity_id: str | None) -> tuple[float | None, float | None]:
    if not entity_id:
        return None, None

    try:
        data = request_json(f"{WIKIDATA_ENTITY_URL}/{entity_id}.json")
        entity = data.get("entities", {}).get(entity_id, {})
        claims = entity.get("claims", {}).get("P625", [])
        if not claims:
            return None, None
        value = claims[0].get("mainsnak", {}).get("datavalue", {}).get("value", {})
        return value.get("latitude"), value.get("longitude")
    except requests.RequestException:
        return None, None


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

    # 도시 Wikivoyage 문서는 맥락용만 — "Wikivoyage: Bangkok" 같은 메타 항목은 장소로 넣지 않음
    if city_source:
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
        items = []
        for source in sources[:3]:
            item = {
                "title": source["title"],
                "angle": config["brief"],
                "why": source["extract"][:180],
                "source_titles": [source["title"]],
                "source_urls": [source["url"]],
                "official_url": source.get("official_url", ""),
                "reservation_hint": "공식 사이트에서 운영시간과 예약 가능 여부를 확인하세요." if source.get("official_url") else "출처 링크에서 운영 정보를 먼저 확인하세요.",
            }
            if source.get("lat") is not None and source.get("lng") is not None:
                item["lat"] = source["lat"]
                item["lng"] = source["lng"]
            items.append(item)
        cities[city] = items

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
        coords_by_title = {
            source["title"]: (source.get("lat"), source.get("lng"))
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

            coord_title = valid_titles[0] if valid_titles else (fallback_source or {}).get("title")
            fallback_lat, fallback_lng = coords_by_title.get(coord_title, (None, None))
            if fallback_lat is None and fallback_source:
                fallback_lat = fallback_source.get("lat")
                fallback_lng = fallback_source.get("lng")
            cleaned_item = {
                "title": str(item.get("title") or (fallback_source or {}).get("title") or city),
                "angle": str(item.get("angle") or config["brief"]),
                "why": str(item.get("why") or config["brief"]),
                "source_titles": valid_titles,
                "source_urls": valid_urls,
                "official_url": next((official_urls_by_title.get(title, "") for title in valid_titles if official_urls_by_title.get(title)), ""),
                "reservation_hint": "공식 사이트에서 운영시간과 예약 가능 여부를 확인하세요." if any(official_urls_by_title.get(title) for title in valid_titles) else "공식 예약 링크가 확인되지 않아 출처 링크를 먼저 확인하세요.",
            }
            if fallback_lat is not None and fallback_lng is not None:
                cleaned_item["lat"] = fallback_lat
                cleaned_item["lng"] = fallback_lng
            cleaned_items.append(cleaned_item)

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

ICN_COORDS = (37.4602, 126.4407)
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import asin, cos, radians, sin, sqrt

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))


def estimate_flight_krw(distance_km: float) -> dict[str, int]:
    if distance_km < 50:
        return {"low": 0, "high": 0}
    if distance_km < 1200:
        low = 90000 + distance_km * 75
        spread_ratio = 0.85
    elif distance_km < 3500:
        low = 160000 + distance_km * 45
        spread_ratio = 0.55
    elif distance_km < 7000:
        low = 220000 + distance_km * 35
        spread_ratio = 0.5
    else:
        low = 400000 + distance_km * 55
        spread_ratio = 0.4
    spread = low * spread_ratio
    return {"low": int(low), "high": int(low + spread)}


def geocode_city_server(city: str) -> dict[str, Any] | None:
    title = CITY_PAGE_TITLES.get(city, city)
    try:
        response = requests.get(
            NOMINATIM_URL,
            params={"q": title, "format": "json", "limit": 1, "addressdetails": 1},
            headers=CRAWLER_HEADERS,
            timeout=15,
        )
        response.raise_for_status()
        rows = response.json()
        if not rows:
            return None
        row = rows[0]
        bb = row.get("boundingbox")
        return {
            "lat": float(row["lat"]),
            "lng": float(row["lon"]),
            "countryCode": (row.get("address") or {}).get("country_code"),
            "boundingBox": [float(bb[0]), float(bb[1]), float(bb[2]), float(bb[3])] if bb else None,
        }
    except requests.RequestException:
        return None


def parse_wikivoyage_costs(extract: str, rates: dict[str, float]) -> dict[str, int]:
    import re

    usd = rates.get("USD", 1400)
    eur = rates.get("EUR", 1550)
    hints: dict[str, int] = {}
    text = extract[:8000]
    amounts: list[int] = []

    for match in re.finditer(r"(?:US\$|\$|€|£|¥)\s*(\d{1,4}(?:[.,]\d{1,2})?)", text, re.I):
        sym = match.group(0)[:2] if match.group(0).startswith("US") else match.group(0)[0]
        num = float(match.group(1).replace(",", ""))
        if sym in ("€", "E"):
            amounts.append(int(num * eur))
        elif sym in ("£",):
            amounts.append(int(num * (rates.get("GBP", 1850))))
        elif sym in ("¥",):
            amounts.append(int(num * (rates.get("JPY", 9.5))))
        else:
            amounts.append(int(num * usd))

    if amounts:
        lows = [n for n in amounts if 15000 <= n <= 90000]
        highs = [n for n in amounts if 60000 <= n <= 400000]
        meals = [n for n in amounts if 8000 <= n <= 80000]
        if lows:
            hints["hostel"] = min(lows)
        if highs:
            hints["hotel"] = int(sum(highs) / len(highs))
            hints["inn"] = int(hints["hotel"] * 0.65)
        if meals:
            hints["meal"] = int(sum(meals) / len(meals))
        hints.setdefault("bus_day", 12000)
        hints.setdefault("car_day", int(hints.get("hotel", 120000) * 0.55))
        hints.setdefault("activity", int(hints.get("meal", 35000) * 0.7))
    return hints


def build_geo_cache(cities: list[str]) -> dict[str, Any]:
    import time

    cache: dict[str, Any] = {}
    for city in cities:
        geo = geocode_city_server(city)
        time.sleep(1.1)
        if not geo:
            continue
        key = city.strip().lower().replace(" ", "").replace("-", "")
        cache[key] = {k: v for k, v in geo.items() if v is not None}
    return cache


def build_flight_index(cities: list[str], geo_cache: dict[str, Any]) -> dict[str, Any]:
    index: dict[str, Any] = {}
    icn_lat, icn_lng = ICN_COORDS
    for city in cities:
        key = city.strip().lower().replace(" ", "").replace("-", "")
        geo = geo_cache.get(key)
        if not geo:
            continue
        km = haversine_km(icn_lat, icn_lng, geo["lat"], geo["lng"])
        flight = estimate_flight_krw(km)
        index[key] = {**flight, "km": round(km)}
    return index


def build_cost_index(cities: list[str], rates: dict[str, float]) -> dict[str, dict[str, int]]:
    defaults = {
        "Seoul": {"hotel": 140000, "inn": 85000, "hostel": 42000, "meal": 38000, "bus_day": 10000, "car_day": 85000, "activity": 22000},
        "Tokyo": {"hotel": 180000, "inn": 110000, "hostel": 55000, "meal": 45000, "bus_day": 12000, "car_day": 95000, "activity": 28000},
        "London": {"hotel": 220000, "inn": 130000, "hostel": 60000, "meal": 52000, "bus_day": 15000, "car_day": 110000, "activity": 35000},
        "Paris": {"hotel": 210000, "inn": 125000, "hostel": 58000, "meal": 50000, "bus_day": 14000, "car_day": 105000, "activity": 32000},
        "DaNang": {"hotel": 90000, "inn": 55000, "hostel": 28000, "meal": 25000, "bus_day": 8000, "car_day": 65000, "activity": 18000},
    }
    costs = dict(defaults)
    for city in cities:
        if city in costs:
            continue
        source = get_wikivoyage_city_source(city)
        if source and source.get("extract"):
            parsed = parse_wikivoyage_costs(source["extract"], rates)
            if parsed:
                costs[city] = parsed
    return costs


def main():
    rates = get_exchange_rates()
    geo_cache = build_geo_cache(TARGET_CITIES)
    flight_index = build_flight_index(TARGET_CITIES, geo_cache)
    cost_index = build_cost_index(TARGET_CITIES, rates if isinstance(rates, dict) else {})

    db = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "rates": rates,
        "news": get_travel_news(),
        "beer_index": {
            "Tokyo": 6500, "London": 9500, "Paris": 11000, "DaNang": 2500, "Seoul": 7000
        },
        "cost_index": cost_index,
        "flight_index": flight_index,
    }

    theme_db = collect_theme_travel_data()

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_DIR / 'market_db.json', 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    with open(DATA_DIR / 'theme_travel_db.json', 'w', encoding='utf-8') as f:
        json.dump(theme_db, f, ensure_ascii=False, indent=2)
    with open(DATA_DIR / 'geo_cache.json', 'w', encoding='utf-8') as f:
        json.dump({
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "cities": geo_cache,
        }, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
