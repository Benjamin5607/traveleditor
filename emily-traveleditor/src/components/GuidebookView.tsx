import { formatKrw } from "../lib/budget";
import type { TravelGuidebook } from "../lib/tripTypes";

type GuidebookViewProps = {
  guidebook: TravelGuidebook;
};

export default function GuidebookView({ guidebook }: GuidebookViewProps) {
  const { budget, bookingLinks, days, places, preferences, mapUrl, mapEmbedUrl, osmDirectionsUrl, flightEstimate, dataSource } = guidebook;

  const bookingItems = [
    { label: "Google 항공권", href: bookingLinks.flights },
    { label: "Skyscanner 항공권", href: bookingLinks.flightsSkyscanner },
    { label: "숙소 검색", href: bookingLinks.lodging },
    { label: "식당 검색", href: bookingLinks.restaurants },
    { label: "Google 지도", href: mapUrl },
    { label: "OpenStreetMap", href: bookingLinks.osm },
    ...(osmDirectionsUrl ? [{ label: "OSM 경로", href: osmDirectionsUrl }] : []),
  ];

  return (
    <div id="emily-guidebook" className="guidebook-print space-y-6">
      <header className="rounded-[2rem] border border-yellow-200/20 bg-gradient-to-br from-yellow-200/10 to-transparent p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">My Travel Guidebook</p>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-400">
            {dataSource === "live" ? "실시간 무료 API 보강" : "수집 JSON 기반"}
          </span>
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{guidebook.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">{guidebook.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">{preferences.city}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">{preferences.theme}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">{preferences.days}일 {preferences.nights}박</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">예산 {formatKrw(preferences.budgetKrw)}</span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print mt-5 rounded-full border border-yellow-200/40 bg-yellow-200/10 px-5 py-2 text-sm font-bold text-yellow-100 hover:bg-yellow-200/20"
        >
          PDF로 저장 (인쇄)
        </button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Budget</p>
          <h3 className="mt-2 text-2xl font-black text-white">예산 추정</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">항공 (추정)</dt><dd className="font-semibold text-white">{formatKrw(budget.flights)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">숙박</dt><dd className="font-semibold text-white">{formatKrw(budget.lodging)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">교통</dt><dd className="font-semibold text-white">{formatKrw(budget.transport)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">식비</dt><dd className="font-semibold text-white">{formatKrw(budget.meals)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">체험/입장</dt><dd className="font-semibold text-white">{formatKrw(budget.activities)}</dd></div>
            <div className="border-t border-white/10 pt-3 flex justify-between gap-4"><dt className="text-zinc-300">합계</dt><dd className="text-lg font-black text-yellow-200">{formatKrw(budget.total)}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-zinc-400">{flightEstimate.label}</p>
          <p className={`mt-2 text-sm font-bold ${budget.withinBudget ? "text-emerald-300" : "text-rose-300"}`}>
            {budget.withinBudget ? "설정 예산 안에 들어오는 추정치입니다." : "설정 예산을 초과하는 추정치입니다."}
          </p>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-zinc-500">
            {budget.notes.map((note) => <li key={note}>{note}</li>)}
            <li>{flightEstimate.note}</li>
          </ul>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Book</p>
          <h3 className="mt-2 text-2xl font-black text-white">무료 예약/검색 링크</h3>
          <div className="mt-5 grid gap-3">
            {bookingItems.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:border-yellow-200/40 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </article>
      </section>

      {mapEmbedUrl && (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Map</p>
          <iframe
            title="OpenStreetMap route preview"
            src={mapEmbedUrl}
            className="h-72 w-full rounded-2xl border-0 bg-zinc-900"
            loading="lazy"
          />
        </section>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Itinerary</p>
            <h3 className="mt-2 text-2xl font-black text-white">일정표</h3>
          </div>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-yellow-200 hover:text-yellow-100">
            Google Maps에서 경로 보기
          </a>
        </div>

        <div className="space-y-5">
          {days.map((day) => (
            <div key={day.day} className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <h4 className="text-lg font-black text-white">{day.label}</h4>
              <div className="mt-4 space-y-4">
                {day.blocks.map((block, index) => {
                  const place = places.find((item) => item.id === block.place_id);
                  const primaryUrl = place?.official_url || place?.source_urls?.[0];

                  return (
                    <div key={`${day.day}-${index}`} className="grid gap-3 border-t border-white/5 pt-4 first:border-t-0 first:pt-0 md:grid-cols-[80px_1fr_auto]">
                      <p className="text-sm font-bold text-yellow-200">{block.time}</p>
                      <div>
                        <p className="font-bold text-white">{block.place_title}</p>
                        <p className="mt-1 text-sm text-zinc-400">{block.activity}</p>
                        <p className="mt-1 text-xs text-zinc-500">이동: {block.transport}</p>
                      </div>
                      {primaryUrl && (
                        <a href={primaryUrl} target="_blank" rel="noreferrer" className="self-start rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300 hover:text-white">
                          링크
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Places</p>
        <h3 className="mt-2 text-2xl font-black text-white">추천 장소</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {places.map((place) => {
            const primaryUrl = place.official_url || place.source_urls?.[0];
            return (
              <article key={place.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <p className="text-sm font-bold text-yellow-200">{place.angle || "테마 후보"}</p>
                <h4 className="mt-2 text-xl font-black text-white">{place.title}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{place.why}</p>
                {place.lat != null && place.lng != null && (
                  <p className="mt-2 text-xs text-zinc-500">좌표: {place.lat.toFixed(4)}, {place.lng.toFixed(4)}</p>
                )}
                {primaryUrl && (
                  <a href={primaryUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-yellow-200 px-4 py-2 text-sm font-black text-zinc-950">
                    공식/출처 확인
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {guidebook.tips.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Tips</p>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-zinc-300">
            {guidebook.tips.map((tip) => <li key={tip}>• {tip}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
