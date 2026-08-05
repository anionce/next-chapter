import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { useLibrary } from "@/hooks/useLibrary"
import { rankBooks } from "@/lib/score"
import { searchExternalByFilters, bookKey } from "@/lib/externalBooks"
import { SELECTABLE_GENRES, genreLabel } from "@/lib/genres"
import { useT } from "@/lib/i18n"
import type { AdvancedFilters } from "@/lib/types"
import { cn } from "@/lib/utils"

const DEFAULTS: AdvancedFilters = {
  author: "",
  genre: null,
  afterYear: null,
  beforeYear: null,
  source: "wishlist",
  length: null,
}

// Same threshold "Short" already uses everywhere else in the app (scoring
// reasons) — kept consistent rather than inventing a second definition of
// "short". "Long" leaves a deliberate 300-399 gap rather than being the
// exact inverse, since "long" shouldn't mean "not short".
const SHORT_MAX_PAGES = 300
const LONG_MIN_PAGES = 400

function fieldClass(extra = "") {
  return cn(
    "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:border-primary",
    extra
  )
}

export function FiltersPage() {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const books = useLibrary()
  const { register, watch } = useForm<AdvancedFilters>({ defaultValues: DEFAULTS })
  const filters = watch()

  const excludeKeys = useMemo(() => new Set(books.map((b) => bookKey(b.title))), [books])

  // A "precision search" tool returning your entire wishlist/every quality
  // book on Hardcover just because nothing's been typed yet reads as a bug,
  // not a feature — it implies a match against a query that was never
  // actually made. Require at least one real filter before fetching or
  // showing anything.
  const hasAnyFilter =
    !!filters.author || !!filters.genre || !!filters.afterYear || !!filters.beforeYear || !!filters.length

  // Length is a preset, not a raw min/max — translated to the same bounds
  // the client-side post-filter below uses (`< SHORT_MAX_PAGES`, `>=
  // LONG_MIN_PAGES`) so the server-side query and the post-filter agree.
  const minPages = filters.length === "long" ? LONG_MIN_PAGES : null
  const maxPages = filters.length === "short" ? SHORT_MAX_PAGES - 1 : null

  const { data: externalResults = [], isFetching: externalFetching } = useQuery({
    queryKey: ["filters-external", filters.author, filters.genre, filters.afterYear, filters.beforeYear, minPages, maxPages],
    queryFn: () =>
      searchExternalByFilters({
        author: filters.author,
        genre: filters.genre,
        afterYear: filters.afterYear,
        beforeYear: filters.beforeYear,
        minPages,
        maxPages,
        excludeKeys,
        limit: 200,
      }),
    enabled: filters.source === "external" && hasAnyFilter,
    staleTime: 5 * 60 * 1000,
  })

  const results = useMemo(() => {
    if (!hasAnyFilter) return []
    const pool = filters.source === "wishlist" ? books.filter((b) => b.status === "unread") : externalResults
    const filtered = pool.filter((b) => {
      if (filters.author && !b.author.toLowerCase().includes(filters.author.toLowerCase())) return false
      if (filters.genre && b.genre !== filters.genre) return false
      if (filters.afterYear && (b.year == null || b.year < Number(filters.afterYear))) return false
      if (filters.beforeYear && (b.year == null || b.year > Number(filters.beforeYear))) return false
      if (filters.length === "short" && (b.pages == null || b.pages >= SHORT_MAX_PAGES)) return false
      if (filters.length === "long" && (b.pages == null || b.pages < LONG_MIN_PAGES)) return false
      return true
    })
    return rankBooks(filtered, { moods: [], genre: filters.genre }, filtered.length)
  }, [books, externalResults, filters, hasAnyFilter])

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mb-5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        {t("back.home")}
      </button>

      <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("filters.eyebrow")}</p>
      <h2 className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">{t("filters.title")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("filters.subtitle")}</p>

      <form className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-[13px] font-medium sm:col-span-2">
          {t("filters.source")}
          <div className="flex flex-wrap gap-2">
            {(["wishlist", "external"] as const).map((value) => (
              <label
                key={value}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground",
                  "border-border bg-background text-foreground"
                )}
              >
                <input {...register("source")} type="radio" value={value} className="sr-only" />
                {value === "wishlist" ? t("filters.sourceWishlist") : t("filters.sourceExternal")}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t("filters.author")}
          <input {...register("author")} type="text" placeholder={t("filters.authorPlaceholder")} className={fieldClass()} />
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t("filters.genre")}
          <select {...register("genre")} className={fieldClass()}>
            <option value="">{t("filters.genreAny")}</option>
            {SELECTABLE_GENRES.map((g) => (
              <option key={g} value={g}>
                {genreLabel(g, lang)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t("filters.years")}
          <div className="flex items-center gap-2">
            <input {...register("afterYear")} type="number" placeholder={t("filters.yearFrom")} className={fieldClass()} />
            <span className="text-muted-foreground">–</span>
            <input {...register("beforeYear")} type="number" placeholder={t("filters.yearTo")} className={fieldClass()} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t("filters.length")}
          <div className="flex flex-wrap gap-2">
            {(["", "short", "long"] as const).map((value) => (
              <label
                key={value || "any"}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground",
                  "border-border bg-background text-foreground"
                )}
              >
                <input {...register("length")} type="radio" value={value} className="sr-only" />
                {value === "" ? t("filters.lengthAny") : value === "short" ? t("filters.lengthShort") : t("filters.lengthLong")}
              </label>
            ))}
          </div>
        </div>
      </form>

      {!hasAnyFilter ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("filters.setAFilter")}
        </p>
      ) : (
        <>
          {filters.source === "external" && externalFetching ? (
            <p className="text-xs text-muted-foreground">{t("filters.searching")}</p>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">{t("filters.results", results.length)}</p>
          )}
          {!(filters.source === "external" && externalFetching) && results.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("filters.noResults")}
            </p>
          )}
        </>
      )}
      {results.length > 0 && (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card px-5">
          {results.map(({ book, score }) => (
            <div key={book.id} className="flex items-center gap-3.5 py-3.5">
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold">{book.title}</strong>
                <span className="text-xs text-muted-foreground">
                  {book.author} · {book.pages != null ? `${book.pages} pages` : t("result.pagesUnknown")}
                  {book.year != null && ` · ${book.year}`} · {genreLabel(book.genre, lang)}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">{score}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
