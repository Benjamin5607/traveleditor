#!/usr/bin/env python3
"""Import Halal Plane + Drunken Plane Google Sheets CSV into JSON for Travel Editor."""

import csv
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data"

HALAL_CSV = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vTNTKjVwyPYpXBkAux_dPlqV6V2QMAe-uXcH0kkS0e9VQxKABasjiNT0smYJiogQ6oOM1vpxZ3bPz0a/pub?output=csv"
)
DRUNKEN_CSV = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vSIfH4gg0a9eZp7xYu35eBGjSgCkOZqwptCgyzMG6RI_iHvOx11EF31HbvO-GL3iRwwUnnLpM2ZVH7O/pub?output=csv"
)


def fetch_csv(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "EmilyTravelEditor/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def norm_country(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r"[\U0001F1E6-\U0001F1FF\U0001F300-\U0001FAFF]+", "", s).strip()
    aliases = {
        "korea": "Korea",
        "south korea": "Korea",
        "republic of korea": "Korea",
        "japan": "Japan",
        "thailand": "Thailand",
        "singapore": "Singapore",
        "malaysia": "Malaysia",
        "indonesia": "Indonesia",
        "vietnam": "Vietnam",
        "china": "China",
        "taiwan": "Taiwan",
        "usa": "USA",
        "united states": "USA",
        "uk": "UK",
        "united kingdom": "UK",
        "france": "France",
        "germany": "Germany",
        "uae": "UAE",
        "turkey": "Turkey",
    }
    key = s.lower()
    return aliases.get(key, s or raw.strip())


def parse_halal(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        country = norm_country(row.get("Country", "") or "")
        name = (row.get("name") or "").strip()
        if not country or not name:
            continue
        try:
            lat = float(row.get("lat") or 0)
            lon = float(row.get("lon") or 0)
        except ValueError:
            continue
        if not lat or not lon:
            continue
        out.append(
            {
                "country": country,
                "name": name,
                "nameKo": (row.get("name_ko") or "").strip() or None,
                "lat": lat,
                "lng": lon,
                "category": (row.get("category") or "").strip(),
                "label": (row.get("label") or "").strip(),
                "descKo": (row.get("desc_ko") or "").strip(),
                "descEn": (row.get("desc_en") or "").strip(),
                "address": (row.get("address") or "").strip(),
            }
        )
    return out


def parse_drunken(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        country = norm_country(row.get("Country", "") or "")
        name = (row.get("name") or "").strip()
        if not country or not name:
            continue
        try:
            lat = float(row.get("lat") or 0)
            lon = float(row.get("lon") or 0)
        except ValueError:
            continue
        if not lat or not lon:
            continue
        out.append(
            {
                "country": country,
                "name": name,
                "category": (row.get("category") or "").strip(),
                "lat": lat,
                "lng": lon,
                "address": (row.get("address") or "").strip(),
                "descKo": (row.get("desc_ko") or "").strip(),
                "descEn": (row.get("desc_en") or "").strip(),
                "signature": (row.get("signature") or "").strip(),
                "vibe": (row.get("vibe") or "").strip(),
                "tags": (row.get("tags") or "").strip(),
                "label": (row.get("label") or "").strip(),
            }
        )
    return out


def read_csv_dicts(text: str) -> list[dict]:
    return list(csv.DictReader(text.replace("\r\n", "\n").replace("\r", "\n").splitlines()))


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    halal_text = fetch_csv(HALAL_CSV)
    drunken_text = fetch_csv(DRUNKEN_CSV)

    halal_places = parse_halal(read_csv_dicts(halal_text))
    drunken_places = parse_drunken(read_csv_dicts(drunken_text))

    halal_payload = {
        "source": "halal_plane",
        "updated": "import",
        "count": len(halal_places),
        "places": halal_places,
    }
    drunken_payload = {
        "source": "drunken_plane",
        "updated": "import",
        "count": len(drunken_places),
        "places": drunken_places,
    }

    (OUT / "halal_plane_db.json").write_text(
        json.dumps(halal_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (OUT / "drunken_plane_db.json").write_text(
        json.dumps(drunken_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"halal_plane: {len(halal_places)} places")
    print(f"drunken_plane: {len(drunken_places)} places")


if __name__ == "__main__":
    main()
