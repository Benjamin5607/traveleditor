"use client";

import { useEffect } from "react";

/** GitHub Pages 배포 후 이전 HTML이 남아 있으면 청크 404가 납니다. 자동 새로고침 안내. */
export default function ChunkErrorRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(msg)) {
        const key = "emily-chunk-reload";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
          return;
        }
        console.warn(
          "[Emily Travel Editor] Asset cache mismatch — hard refresh (Ctrl+Shift+R) or clear site data for benjamin5607.github.io"
        );
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason ?? "");
      if (/ChunkLoadError|Failed to load chunk/i.test(reason)) {
        const key = "emily-chunk-reload";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
