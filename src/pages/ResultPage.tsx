import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { BookCover } from "@/components/result/BookCover"
import { rankBooks } from "@/lib/score"
import { searchExternalBooks, bookKey } from "@/lib/externalBooks"
import { fetchSynopsis } from "@/lib/synopsis"
import { genreLabel, NON_FICTION_GENRES } from "@/lib/genres"
import { useT } from "@/lib/i18n"
import { useReadingStore } from "@/store/useReadingStore"
import { useLibrary } from "@/hooks/useLibrary"
import { mergeIntoLibrary, markAsReading } from "@/lib/db"
import { cn } from "@/lib/utils"
import type { Book } from "@/lib/types"
import type { MoodId } from "@/lib/moods"

const BACK: Record<string, [string, string]> = {
  mood: ["/mood", "back.mood"],
  genre: ["/genre", "back.genre"],
}

// Stable empty-array reference — a fresh `[]` literal on every render when
// lastSource isn't "mood" would defeat useMemo/useQuery dependency checks.
const NO_MOODS: MoodId[] = []

export function ResultPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, lang } = useT()
  const { selectedMoods, selectedGenre, lastSource, excludeNonFiction, toggleExcludeNonFiction } = useReadingStore()
  const books = useLibrary()
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  // Wishlist vs. discover is a deliberate choice, not something the
  // algorithm silently decides by blending both pools into one ranked list
  // — a near-miss external book should never quietly outrank (or get
  // outranked by) a real wishlist match just because they were scored
  // together. Picking one clears the other's picks/dismissals too, since
  // they're unrelated candidate pools. Discovery is the default — most
  // libraries don't have enough unread books to make "from your wishlist"
  // a meaningful choice on its own.
  const [source, setSource] = useState<"wishlist" | "external">("external")
  const unreadCount = useMemo(() => books.filter((b) => b.status === "unread").length, [books])
  const wishlistEnabled = unreadCount > 50

  function switchSource(next: "wishlist" | "external") {
    setSource(next)
    setDismissedIds(new Set())
  }

  // Scope every preference to the flow that actually produced it — the
  // store persists selectedMoods/selectedGenre indefinitely, so without
  // this a stale Mood selection could silently leak into a Genre-sourced
  // search and result.
  const genreForSearch = lastSource === "genre" ? selectedGenre : null
  const moodsForSearch = lastSource === "mood" ? selectedMoods : NO_MOODS

  const excludeKeys = useMemo(() => new Set(books.map((b) => bookKey(b.title))), [books])

  const {
    data: externalBooks = [],
    isLoading: externalLoading,
    isFetching: externalFetching,
  } = useQuery({
    queryKey: ["external-books", genreForSearch, moodsForSearch],
    queryFn: () => searchExternalBooks(genreForSearch, moodsForSearch, excludeKeys, 200),
    enabled: source === "external",
    // 0, deliberately: the whole point of shuffling the candidate pool
    // server-round-trip to round-trip is that revisiting the same mood/genre
    // gives a genuinely different pick — a positive staleTime here would
    // silently reuse the same already-shuffled result on every revisit
    // within the window, which reads as "always the same books" even though
    // the shuffle itself works. Safe to refetch on every mount: the loading
    // state below already covers isFetching, not just isLoading, so this
    // can't reintroduce the old flash-of-stale-content bug.
    staleTime: 0,
  })

  const candidates = useMemo(() => {
    const pool =
      source === "wishlist"
        ? books
        : // Re-check external results against the *current* library on every
          // render, not just at fetch time — the react-query cache can outlive
          // a CSV import, and a stale cache must never re-surface something
          // you already own as if it were new.
          externalBooks.filter((b) => !excludeKeys.has(bookKey(b.title)) && !addedKeys.has(bookKey(b.title)))
    return excludeNonFiction ? pool.filter((b) => !NON_FICTION_GENRES.has(b.genre)) : pool
  }, [source, books, externalBooks, excludeKeys, addedKeys, excludeNonFiction])

  const ranked = useMemo(() => {
    const all = rankBooks(candidates, { moods: moodsForSearch, genre: genreForSearch }, 200)
    return all.filter((r) => !dismissedIds.has(r.book.id))
  }, [candidates, moodsForSearch, genreForSearch, dismissedIds])

  const featured = ranked[0]

  const [backPath, backKey] = BACK[lastSource ?? ""] ?? ["/", "back.home"]

  const { data: synopsis, isLoading: synopsisLoading } = useQuery({
    queryKey: ["synopsis", featured?.book.title, featured?.book.author],
    queryFn: () => fetchSynopsis(featured!.book.title, featured!.book.author),
    enabled: !!featured,
    staleTime: 24 * 60 * 60 * 1000,
  })

  function handleNotToday() {
    if (!featured) return
    setDismissedIds((prev) => new Set(prev).add(featured.book.id))
  }

  async function handleAdd(book: Book) {
    await mergeIntoLibrary([{ ...book, source: "added" }])
    setAddedKeys((prev) => new Set(prev).add(bookKey(book.title)))
    queryClient.invalidateQueries({ queryKey: ["external-books"] })
  }

  async function handleReadThis(book: Book) {
    await markAsReading(book.id)
    navigate("/")
  }

  if (books.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading your library…</p>
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(backPath)}
      className="mb-5 block text-[13px] font-medium text-muted-foreground hover:text-foreground"
    >
      {t(backKey)}
    </button>
  )

  const sourceToggle = (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {(["wishlist", "external"] as const).map((value) => {
          // Wishlist-only makes sense as a real choice once your library can
          // actually supply as many options as discovery does — below that,
          // it's not a meaningful alternative, just a shorter, worse list.
          const disabled = value === "wishlist" && !wishlistEnabled
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => switchSource(value)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                disabled
                  ? "cursor-not-allowed text-muted-foreground/40"
                  : source === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              {value === "wishlist" ? "From your wishlist" : "Discover something new"}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={toggleExcludeNonFiction}
        aria-pressed={excludeNonFiction}
        className={cn(
          "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
          excludeNonFiction
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
      >
        {excludeNonFiction ? "✓ " : ""}No non-fiction
      </button>
    </div>
  )

  // Wait for the external search to settle before committing to a result —
  // showing the library-only pick first and then swapping to a better
  // external one a second later reads as a bug, not a feature.
  if (source === "external" && (externalLoading || externalFetching)) {
    return (
      <div>
        {backButton}
        {sourceToggle}
        <p className="text-sm text-muted-foreground">{t("result.searching")}</p>
      </div>
    )
  }

  if (!featured) {
    return (
      <div>
        {backButton}
        {sourceToggle}
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("result.empty")}
        </p>
      </div>
    )
  }

  const isExternal = featured.book.source === "external"
  const pagesLabel = featured.book.pages != null ? `${featured.book.pages} pages` : t("result.pagesUnknown")

  return (
    <div>
      {backButton}
      {sourceToggle}

      <div className="mb-6 flex items-center gap-5">
        <BookCover
          id={featured.book.id}
          title={featured.book.title}
          author={featured.book.author}
          isbn={featured.book.isbn}
          coverId={featured.book.coverId}
          coverUrl={featured.book.coverUrl ?? synopsis?.coverUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("result.eyebrow")}</p>
          <h2 className="text-balance font-serif text-[22px] font-semibold">{featured.book.title}</h2>
          <p className="mb-2 text-sm text-muted-foreground">{featured.book.author}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
            <span>{pagesLabel}</span>
            <span className="opacity-50">·</span>
            <span>{genreLabel(featured.book.genre, lang)}</span>
          </div>
          {/* Fixed min-height regardless of loading/loaded/empty state — the
              synopsis arrives async after everything else is already on
              screen, and letting it pop in and push the buttons down read
              as the page "moving around" on every single result. */}
          <div className="mt-2 min-h-[84px]">
            {synopsisLoading ? (
              <div className="flex flex-col gap-1.5 pt-0.5">
                <div className="h-3 w-full animate-pulse rounded bg-border/70" />
                <div className="h-3 w-full animate-pulse rounded bg-border/70" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-border/70" />
              </div>
            ) : (
              synopsis?.text && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">{synopsis.text}</p>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-6">
        <p className="mb-2.5 text-xs text-muted-foreground">{t("result.why")}</p>
        <ul className="flex flex-col gap-2">
          {featured.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-[13.5px] leading-snug">
              <span className="mt-0.5 shrink-0 font-bold text-primary">✓</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        {isExternal ? (
          <Button
            onClick={() => handleAdd(featured.book)}
            className="h-11 rounded-full px-6 text-[14px] font-semibold"
          >
            {t("result.addWishlist")}
          </Button>
        ) : (
          <Button
            onClick={() => handleReadThis(featured.book)}
            className="h-11 rounded-full px-6 text-[14px] font-semibold"
          >
            {t("result.readThis")}
          </Button>
        )}
        <Button
          variant="ghost"
          className="h-11 px-2 text-[13px] text-muted-foreground"
          onClick={handleNotToday}
          disabled={ranked.length <= 1}
        >
          {t("result.notToday")}
        </Button>
      </div>
    </div>
  )
}
