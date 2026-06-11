import type { GeoResult } from "./liveTravel";
import { normalizeCityName } from "./travelData";

const DATA_BASE = "/traveleditor/data";
const DB_NAME = "emily-travel-cache";
const STORE = "geo";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEntry = GeoResult & { savedAt: number };

let staticGeo: Record<string, GeoResult> | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return dbPromise;
}

async function idbGet(key: string): Promise<CacheEntry | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as CacheEntry) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbSet(key: string, value: CacheEntry) {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(value, key);
}

export async function loadStaticGeoCache(): Promise<Record<string, GeoResult>> {
  if (staticGeo) return staticGeo;
  try {
    const response = await fetch(`${DATA_BASE}/geo_cache.json`);
    if (!response.ok) {
      staticGeo = {};
      return staticGeo;
    }
    const data = (await response.json()) as { cities?: Record<string, GeoResult> };
    staticGeo = data.cities ?? {};
    return staticGeo;
  } catch {
    staticGeo = {};
    return staticGeo;
  }
}

export async function getCachedGeo(city: string): Promise<GeoResult | null> {
  const key = normalizeCityName(city);
  const staticCache = await loadStaticGeoCache();
  const fromStatic = staticCache[key] ?? staticCache[city];
  if (fromStatic) return fromStatic;

  const fromIdb = await idbGet(key);
  if (fromIdb && Date.now() - fromIdb.savedAt < TTL_MS) {
    const { savedAt, ...geo } = fromIdb;
    void savedAt;
    return geo;
  }
  return null;
}

export async function saveCachedGeo(city: string, geo: GeoResult) {
  const key = normalizeCityName(city);
  await idbSet(key, { ...geo, savedAt: Date.now() });
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`emily-live:city:${key}`, JSON.stringify(geo));
    } catch {
      /* ignore */
    }
  }
}
