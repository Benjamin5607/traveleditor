import { formatKrw } from "../lib/budget";
import { formatKrwLocale, t, type Locale } from "../lib/i18n";
import { formatTransitLeg } from "../lib/transitLegs";
import { getEmilyTheme, localizeTheme } from "../lib/themes";
import type { TravelGuidebook } from "../lib/tripTypes";
import PlaneExplorer from "./PlaneExplorer";
import RouteMap from "./RouteMap";

type GuidebookViewProps = {
  guidebook: TravelGuidebook;
  uiLocale?: Locale;
  groqModelId?: string;
};

function dataSourceLabel(dataSource: TravelGuidebook["dataSource"], locale: Locale) {
  if (dataSource === "plane") return locale === "en" ? "Plane DB" : "Plane DB";
  if (dataSource === "plane+live") return locale === "en" ? "Plane + EOSLS" : "Plane + EOSLS";
  if (dataSource === "live") return t(locale, "guide.eosls");
  return t(locale, "guide.static");
}

export default function GuidebookView({ guidebook, uiLocale, groqModelId }: GuidebookViewProps) {
  const {
    budget,
    bookingLinks,
    days,
    places,
    preferences,
    mapUrl,
    osmDirectionsUrl,
    flightEstimate,
    flightDetail,
    lodgingRecommendations,
    itineraryRationale,
    narration,
    budgetThemeLabel,
    dataSource,
    searchSourcesLabel,
    planeMode,
    planePool,
    planePersona,
  } = guidebook;

  const locale = uiLocale ?? preferences.locale ?? "ko";
  const contentLocale = preferences.locale ?? "ko";
  const needsRebuild = uiLocale != null && uiLocale !== contentLocale;
  const themeLabel = localizeTheme(getEmilyTheme(preferences.theme), locale).name;
  const money = (amount: number) => (locale === "en" ? formatKrwLocale(amount, "en") : formatKrw(amount));

  const AMENITY_LABEL = locale === "en"
    ? { meal: "🍽 Meal", cafe: "☕ Cafe", restroom: "🚻 Restroom" }
    : { meal: "🍽 식사", cafe: "☕ 카페", restroom: "🚻 화장실" };

  const bookingItems = locale === "en"
    ? [
        { label: "Google Flights", href: bookingLinks.flights },
        { label: "Skyscanner", href: bookingLinks.flightsSkyscanner },
        { label: "Kayak", href: bookingLinks.kayakFlights },
        { label: "Booking.com", href: bookingLinks.lodging },
        { label: "Google Hotels", href: bookingLinks.googleHotels },
        { label: "Restaurants", href: bookingLinks.restaurants },
        { label: "Google Maps", href: mapUrl },
        { label: "OpenStreetMap", href: bookingLinks.osm },
        ...(osmDirectionsUrl ? [{ label: t(locale, "guide.osmRoute"), href: osmDirectionsUrl }] : []),
      ]
    : [
        { label: "Google 항공권", href: bookingLinks.flights },
        { label: "Skyscanner 항공권", href: bookingLinks.flightsSkyscanner },
        { label: "Kayak 항공권", href: bookingLinks.kayakFlights },
        { label: "숙소 검색 (Booking)", href: bookingLinks.lodging },
        { label: "Google Hotels", href: bookingLinks.googleHotels },
        { label: "식당 검색", href: bookingLinks.restaurants },
        { label: "Google 지도", href: mapUrl },
        { label: "OpenStreetMap", href: bookingLinks.osm },
        ...(osmDirectionsUrl ? [{ label: t(locale, "guide.osmRoute"), href: osmDirectionsUrl }] : []),
      ];

  return (
    <div id="emily-guidebook" className="guidebook-print space-y-6">
      <header className="rounded-[2rem] border border-yellow-200/20 bg-gradient-to-br from-yellow-200/10 to-transparent p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-yellow-200">{t(locale, "guide.header")}</p>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-400">
            {dataSourceLabel(dataSource, locale)}
          </span>
          {planeMode && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                planeMode === "halal"
                  ? "border-sky-400/40 text-sky-300"
                  : "border-fuchsia-400/40 text-fuchsia-300"
              }`}
            >
              {planeMode === "halal" ? "🕌 Halal Plane" : "🍸 Drunken Plane"}
            </span>
          )}
          {searchSourcesLabel && (
            <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
              {searchSourcesLabel}
            </span>
          )}
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{guidebook.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">{guidebook.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">
            {preferences.originCity} → {preferences.city}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">{themeLabel}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">
            {locale === "en"
              ? `${preferences.days}d ${preferences.nights}n`
              : `${preferences.days}일 ${preferences.nights}박`}
          </span>
          <span className="rounded-full border border-yellow-200/30 bg-yellow-200/10 px-3 py-1 text-yellow-100">{budgetThemeLabel}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-zinc-300">
            {t(locale, "guide.budget.label")} {money(preferences.budgetKrw)}
          </span>
        </div>
        {needsRebuild && (
          <p className="no-print mt-3 text-xs text-amber-200/90">{t(locale, "guide.lang.rebuild")}</p>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print mt-5 rounded-full border border-yellow-200/40 bg-yellow-200/10 px-5 py-2 text-sm font-bold text-yellow-100 hover:bg-yellow-200/20"
        >
          {t(locale, "guide.print")}
        </button>
      </header>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent p-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Guide</p>
        <h3 className="mt-2 text-2xl font-black text-white">{t(locale, "guide.narration")}</h3>
        <p className="mt-4 text-base leading-7 text-zinc-300" lang={contentLocale}>
          {narration.welcome}
        </p>
        <p className="mt-4 text-sm leading-7 text-zinc-400" lang={contentLocale}>
          {narration.philosophy}
        </p>
        <p className="mt-3 text-xs text-zinc-500" lang={contentLocale}>
          {narration.searchNote}
        </p>
      </section>

      {planeMode && planePool && planePool.length > 0 && planePersona && (
        <PlaneExplorer
          mode={planeMode}
          city={preferences.city}
          places={planePool}
          persona={planePersona}
          modelId={groqModelId}
        />
      )}

      {/* 항공 — 구간·항공사·이유 */}
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Flight</p>
        <h3 className="mt-2 text-2xl font-black text-white">{t(locale, "guide.flight")}</h3>
        <div className="mt-4 rounded-2xl border border-yellow-200/20 bg-yellow-200/5 p-5">
          <p className="text-lg font-black text-yellow-100">
            {flightDetail.origin.name} ({flightDetail.origin.code}) → {flightDetail.destination.name} ({flightDetail.destination.code})
          </p>
          <p className="mt-2 text-2xl font-black text-white">{flightEstimate.label}</p>
          {flightDetail.durationHours != null && flightDetail.durationHours > 0 && (
            <p className="mt-1 text-sm text-zinc-400">{t(locale, "guide.flight.duration", { hours: flightDetail.durationHours })}</p>
          )}
          {flightDetail.carriers.length > 0 && (
            <p className="mt-3 text-sm text-zinc-300">
              <span className="font-bold text-white">{t(locale, "guide.flight.carriers")}</span>
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
            {t(locale, "guide.flight.searchBtn")}
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
          <h3 className="mt-2 text-2xl font-black text-white">{t(locale, "guide.lodging.title")}</h3>
          <p className="mt-2 text-sm text-zinc-400">{t(locale, "guide.lodging.subtitle")}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {lodgingRecommendations.map((lodging) => (
              <article key={lodging.name} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-500">{lodging.category}</span>
                  {lodging.source === "wikivoyage" && (
                    <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-xs text-emerald-300">
                      {t(locale, "guide.lodging.wikivoyage")}
                    </span>
                  )}
                </div>
                <h4 className="mt-2 text-xl font-black text-white">{lodging.name}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  <span className="font-bold text-zinc-300">{t(locale, "guide.lodging.why")} </span>
                  <span lang={contentLocale}>{lodging.why}</span>
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={lodging.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full bg-yellow-200 px-4 py-2 text-sm font-black text-zinc-950">
                    Google Maps
                  </a>
                  <a href={lodging.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200">
                    {t(locale, "guide.lodging.book")}
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
          <h3 className="mt-2 text-2xl font-black text-white">{t(locale, "guide.budget.title")}</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">{t(locale, "guide.budget.flights")} ({flightDetail.routeLabel})</dt><dd className="font-semibold text-white">{money(budget.flights)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">{t(locale, "guide.budget.lodging")}</dt><dd className="font-semibold text-white">{money(budget.lodging)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">{t(locale, "guide.budget.transport")}</dt><dd className="font-semibold text-white">{money(budget.transport)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">{t(locale, "guide.budget.meals")}</dt><dd className="font-semibold text-white">{money(budget.meals)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-zinc-400">{t(locale, "guide.budget.activities")}</dt><dd className="font-semibold text-white">{money(budget.activities)}</dd></div>
            <div className="border-t border-white/10 pt-3 flex justify-between gap-4"><dt className="text-zinc-300">{t(locale, "guide.budget.total")}</dt><dd className="text-lg font-black text-yellow-200">{money(budget.total)}</dd></div>
          </dl>
          <p className={`mt-4 text-sm font-bold ${budget.withinBudget ? "text-emerald-300" : "text-rose-300"}`}>
            {budget.withinBudget ? t(locale, "guide.budget.within") : t(locale, "guide.budget.over")}
          </p>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-zinc-500">
            {budget.notes.map((note) => <li key={note}>{note}</li>)}
            <li>{flightEstimate.note}</li>
          </ul>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Book</p>
          <h3 className="mt-2 text-2xl font-black text-white">{t(locale, "guide.booking.title")}</h3>
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
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-2">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Map</p>
          <div className="flex flex-wrap gap-3 text-xs font-bold">
            <a href={mapUrl} target="_blank" rel="noreferrer" className="text-yellow-200 hover:text-yellow-100">
              {t(locale, "guide.googleRoute")}
            </a>
            {osmDirectionsUrl && (
              <a href={osmDirectionsUrl} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white">
                {t(locale, "guide.osmRoute")}
              </a>
            )}
          </div>
        </div>
        <RouteMap city={preferences.city} days={days} places={places} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Itinerary</p>
            <h3 className="mt-2 text-2xl font-black text-white">{t(locale, "guide.itinerary")}</h3>
          </div>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-yellow-200 hover:text-yellow-100">
            {t(locale, "guide.itinerary.maps")}
          </a>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{t(locale, "guide.itinerary.why")}</p>
          <p className="mt-2 text-sm leading-7 text-zinc-300" lang={contentLocale}>{itineraryRationale}</p>
        </div>

        <div className="space-y-5">
          {days.map((day) => (
            <div key={day.day} className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <h4 className="text-lg font-black text-white">{day.label}</h4>
              {narration.dayIntros[day.day] && (
                <p className="mt-2 text-sm leading-6 text-zinc-400">{narration.dayIntros[day.day]}</p>
              )}
              <div className="mt-4 space-y-4">
                {day.blocks.map((block, index) => {
                  const kind = block.kind ?? "attraction";
                  const isMeal = kind !== "attraction";
                  const place = places.find((item) => item.id === block.place_id);
                  const mapsUrl = block.maps_url ?? place?.maps_url;
                  const sourceUrl = place?.official_url || place?.source_urls?.[0];
                  const kindBadge =
                    kind === "breakfast"
                      ? (locale === "en" ? "Breakfast" : "아침")
                      : kind === "lunch"
                        ? (locale === "en" ? "Lunch" : "점심")
                        : kind === "dinner"
                          ? (locale === "en" ? "Dinner" : "저녁")
                          : kind === "cafe"
                            ? (locale === "en" ? "Cafe" : "카페")
                            : null;

                  return (
                    <div
                      key={`${day.day}-${index}`}
                      className={`grid gap-3 border-t border-white/5 pt-4 first:border-t-0 first:pt-0 ${isMeal ? "rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] px-3 py-3" : ""}`}
                    >
                      <div className="grid gap-3 md:grid-cols-[80px_1fr_auto]">
                        <p className="text-sm font-bold text-yellow-200">{block.time}</p>
                        <div>
                          {kindBadge && (
                            <span className="mb-1 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                              {kindBadge}
                            </span>
                          )}
                          <p className="font-bold text-white">{block.place_title}</p>
                          <p className="mt-1 text-sm text-zinc-400">{block.activity}</p>
                          {(block.transport !== "walk" || block.travel) && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-zinc-500">
                                {locale === "en" ? "Transport" : "이동"}:{" "}
                                {block.transport === "bus"
                                  ? locale === "en"
                                    ? "Public transit"
                                    : "대중교통"
                                  : block.transport === "rental_car"
                                    ? locale === "en"
                                      ? "Rental car"
                                      : "렌트카"
                                    : block.transport}
                              </p>
                              {block.travel && block.transport === "bus" && (
                                <div className="rounded-lg border border-sky-400/15 bg-sky-400/[0.06] px-3 py-2 text-xs leading-5 text-sky-100">
                                  <p className="font-bold text-sky-50">
                                    {formatTransitLeg(block.travel, locale)}
                                  </p>
                                  {block.travel.note && (
                                    <p className="mt-1 text-sky-200/80">{block.travel.note}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 self-start">
                          {mapsUrl && (
                            <a href={mapsUrl} target="_blank" rel="noreferrer" className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-black text-zinc-950">
                              Google Maps
                            </a>
                          )}
                          {sourceUrl && (
                            <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300 hover:text-white">
                              {t(locale, "guide.block.source")}
                            </a>
                          )}
                        </div>
                      </div>
                      {block.rationale && (
                        <p className="rounded-xl bg-white/5 px-4 py-3 text-xs leading-5 text-zinc-400">
                          <span className="font-bold text-zinc-300">{t(locale, "guide.block.rationale")} </span>
                          <span lang={contentLocale}>{block.rationale}</span>
                        </p>
                      )}
                      {block.amenities && block.amenities.length > 0 && (
                        <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">{t(locale, "guide.block.amenities")}</p>
                          {block.amenities.map((amenity) => (
                            <div key={`${amenity.kind}-${amenity.name}`} className="rounded-lg bg-black/20 p-3">
                              <p className="text-sm font-bold text-white">
                                {AMENITY_LABEL[amenity.kind]} · {amenity.name}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-zinc-400">{amenity.why}</p>
                              <p className="mt-1 text-xs text-zinc-500">{amenity.tip}</p>
                              <a
                                href={amenity.mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs font-bold text-yellow-200 hover:text-yellow-100"
                              >
                                Google Maps →
                              </a>
                            </div>
                          ))}
                        </div>
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
        <h3 className="mt-2 text-2xl font-black text-white">
          {locale === "en" ? "Recommended places" : "추천 장소"}
        </h3>
        <p className="mt-2 text-xs text-zinc-500">
          {locale === "en"
            ? "Ranked by Wikivoyage curation, reputation signals, and chain/fast-food exclusion."
            : "Wikivoyage 큐레이션·평판 신호·체인/패스트푸드 제외 후 품질 순 정렬."}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {places.map((place) => (
            <article key={place.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-yellow-200">{place.angle || (locale === "en" ? "Theme pick" : "테마 후보")}</p>
                {place.qualityScore != null && place.qualityScore >= 55 && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Q{place.qualityScore}
                  </span>
                )}
              </div>
              <h4 className="mt-2 text-xl font-black text-white">{place.title}</h4>
              {place.why && (
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  <span className="font-bold text-zinc-300">{t(locale, "guide.places.why")} </span>
                  <span lang={contentLocale}>{place.why}</span>
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
                    {t(locale, "guide.places.official")}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">Closing</p>
        <p className="mt-3 text-sm leading-7 text-zinc-300" lang={contentLocale}>{narration.closing}</p>
        {guidebook.tips.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm leading-7 text-zinc-400" lang={contentLocale}>
            {guidebook.tips.map((tip) => <li key={tip}>• {tip}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
