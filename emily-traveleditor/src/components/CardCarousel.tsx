"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

type CardCarouselProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
};

export default function CardCarousel({ children, className = "", itemClassName = "" }: CardCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(280, el.clientWidth * 0.75);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
    setTimeout(updateArrows, 320);
  };

  return (
    <div className={`relative ${className}`}>
      {canPrev && (
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scroll(-1)}
          className="no-print absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-zinc-900/90 text-white shadow-lg backdrop-blur hover:bg-zinc-800"
        >
          ‹
        </button>
      )}
      {canNext && (
        <button
          type="button"
          aria-label="Next"
          onClick={() => scroll(1)}
          className="no-print absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-zinc-900/90 text-white shadow-lg backdrop-blur hover:bg-zinc-800"
        >
          ›
        </button>
      )}
      <div
        ref={trackRef}
        onScroll={updateArrows}
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${itemClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
