import { formatKrw } from "../lib/budget";
import type { TravelGuidebook } from "../lib/tripTypes";

type GuidebookViewProps = {
  guidebook: TravelGuidebook;
};

export default function GuidebookView({ guidebook }: GuidebookViewProps) {
  const {
    budget,
    bookingLinks,
    days,
    places,
    preferences,
    mapUrl,
    mapEmbedUrl,
    osmDirectionsUrl,
    flightEstimate,
    flightDetail,
    lodgingRecommendations,
    itineraryRationale,
    dataSource,
  } = guidebook;

  const bookingItems = [
    { label: "Google 항공권", href: bookingLinks.flights },
    { label: "Skyscanner 항공권", href: bookingLinks.flightsSkyscanner },
    { label: "Kayak 항공권", href: bookingLinks.kayakFlights },
    { label: "숙소 검색 (Booking)", href: bookingLinks.lodging },
    { label: "Google Hotels", href: bookingLinks.googleHotels },
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

      {/* 항공 — 구간·항공사·이유 */}
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Flight</p>
        <h3 className="mt-2 text-2xl font-black text-white">항공권 (구간 기준 추정)</h3>
        <div className="mt-4 rounded-2xl border border-yellow-200/20 bg-yellow-200/5 p-5">
          <p className="text-lg font-black text-yellow-100">
            {flightDetail.origin.name} ({flightDetail.origin.code}) → {flightDetail.destination.name} ({flightDetail.destination.code})
          </p>
          <p className="mt-2 text-2xl font-black text-white">{flightEstimate.label}</p>
          {flightDetail.durationHours != null && flightDetail.durationHours > 0 && (
            <p className="mt-1 text-sm text-zinc-400">비행시간 약 {flightDetail.durationHours}시간 (추정)</p>
          )}
          {flightDetail.carriers.length > 0 && (
            <p className="mt-3 text-sm text-zinc-300">
              <span className="font-bold text-white">관련 항공사: </span>
              {flightDetail.carriers.join(", ")}
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-zinc-400">{flightDetail.whyThisEstimate}</p>
          {flightDetail.wikivoyageNotes.map((note) => (
            <p key={note} className="mt-2 text-xs text-zinc-500">• {note}</p>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={bookingLinks.flights} target="_blank" rel="noreferrer" className="rounded-full bg-yellow-200 px-4 py-2 text-sm font-black text-zinc-950">
            이 구간 Google Flights에서 검색
          </a>
          <a href={bookingLinks.flightsSkyscanner} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200">
            Skyscanner
          </a>
        </div>
      </section>

      {/* 숙소 추천 */}
      {lodgingRecommendations.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Stay</p>
          <h3 className="mt-2 text-2xl font-black text-white">숙소 추천</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Wikivoyage Sleep 섹션에 실제로 나온 숙소만 표시합니다. 없으면 유형별 검색 링크로 대체합니다.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {lodgingRecommendations.map((lodging) => (
              <article key={lodging.name} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-500">{lodging.category}</span>
                  {lodging.source === "wikivoyage" && (
                    <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-xs text-emerald-300">Wikivoyage 출처</span>
                  )}
                </div>
                <h4 className="mt-2 text-xl font-black text-white">{lodging.name}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  <span className="font-bold text-zinc-300">왜 추천? </span>
                  {lodging.why}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={lodging.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full bg-yellow-200 px-4 py-2 text-sm font-black text-zinc-950">
                    Google Maps
                  </a>
                  <a href={lodging.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200">
                    예약 검색
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Budget</p>
          <h3 className="mt-2 text-2xl font-black text-white">예산 추정</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">항공 ({flightDetail.routeLabel})</dt><dd className="font-semibold text-white">{formatKrw(budget.flights)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">숙박</dt><dd className="font-semibold text-white">{formatKrw(budget.lodging)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">교통</dt><dd className="font-semibold text-white">{formatKrw(budget.transport)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">식비</dt><dd className="font-semibold text-white">{formatKrw(budget.meals)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">체험/입장</dt><dd className="font-semibold text-white">{formatKrw(budget.activities)}</dd></div>
            <div className="border-t border-white/10 pt-3 flex justify-between gap-4"><dt className="text-zinc-300">합계</dt><dd className="text-lg font-black text-yellow-200">{formatKrw(budget.total)}</dd></div>
          </dl>
          <p className={`mt-4 text-sm font-bold ${budget.withinBudget ? "text-emerald-300" : "text-rose-300"}`}>
            {budget.withinBudget ? "설정 예산 안에 들어오는 추정치입니다." : "설정 예산을 초과하는 추정치입니다."}
          </p>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-zinc-500">
            {budget.notes.map((note) => <li key={note}>{note}</li>)}
            <li>{flightEstimate.note}</li>
          </ul>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Book</p>
          <h3 className="mt-2 text-2xl font-black text-white">예약/검색 링크</h3>
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

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4">
        <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Map</p>
        {mapEmbedUrl ? (
          <iframe
            title="OpenStreetMap route preview"
            src={mapEmbedUrl}
            className="h-72 w-full rounded-2xl border-0 bg-zinc-900"
            loading="lazy"
          />
        ) : (
          <div className="flex h-72 items-center justify-center rounded-2xl bg-zinc-900 text-sm text-zinc-400">
            <a href={bookingLinks.osm} target="_blank" rel="noreferrer" className="font-bold text-yellow-200">
              OSM에서 {preferences.city} 보기
            </a>
          </div>
        )}
      </section>

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

        <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">왜 이렇게 짰나요?</p>
          <p className="mt-2 text-sm leading-7 text-zinc-300">{itineraryRationale}</p>
        </div>

        <div className="space-y-5">
          {days.map((day) => (
            <div key={day.day} className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <h4 className="text-lg font-black text-white">{day.label}</h4>
              <div className="mt-4 space-y-4">
                {day.blocks.map((block, index) => {
                  const place = places.find((item) => item.id === block.place_id);
                  const mapsUrl = place?.maps_url;
                  const sourceUrl = place?.official_url || place?.source_urls?.[0];

                  return (
                    <div key={`${day.day}-${index}`} className="grid gap-3 border-t border-white/5 pt-4 first:border-t-0 first:pt-0">
                      <div className="grid gap-3 md:grid-cols-[80px_1fr_auto]">
                        <p className="text-sm font-bold text-yellow-200">{block.time}</p>
                        <div>
                          <p className="font-bold text-white">{block.place_title}</p>
                          <p className="mt-1 text-sm text-zinc-400">{block.activity}</p>
                          <p className="mt-1 text-xs text-zinc-500">이동: {block.transport}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 self-start">
                          {mapsUrl && (
                            <a href={mapsUrl} target="_blank" rel="noreferrer" className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-black text-zinc-950">
                              Google Maps
                            </a>
                          )}
                          {sourceUrl && (
                            <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300 hover:text-white">
                              출처
                            </a>
                          )}
                        </div>
                      </div>
                      {block.rationale && (
                        <p className="rounded-xl bg-white/5 px-4 py-3 text-xs leading-5 text-zinc-400">
                          <span className="font-bold text-zinc-300">일정 근거: </span>
                          {block.rationale}
                        </p>
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
          {places.map((place) => (
            <article key={place.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm font-bold text-yellow-200">{place.angle || "테마 후보"}</p>
              <h4 className="mt-2 text-xl font-black text-white">{place.title}</h4>
              {place.why && (
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  <span className="font-bold text-zinc-300">추천 이유: </span>
                  {place.why}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {place.maps_url && (
                  <a href={place.maps_url} target="_blank" rel="noreferrer" className="rounded-full bg-yellow-200 px-4 py-2 text-sm font-black text-zinc-950">
                    Google Maps
                  </a>
                )}
                {(place.official_url || place.source_urls?.[0]) && (
                  <a
                    href={place.official_url || place.source_urls?.[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200"
                  >
                    공식/출처
                  </a>
                )}
              </div>
            </article>
          ))}
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
