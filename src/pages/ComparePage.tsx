import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { BookCover } from "@/components/result/BookCover"
import { db, pickComparisonPair, recordComparison, undoLastComparison, type ComparisonPairResult } from "@/lib/db"
import { fetchBookCoverUrl } from "@/lib/synopsis"
import { useLibrary } from "@/hooks/useLibrary"
import { useT } from "@/lib/i18n"

export function ComparePage() {
  const navigate = useNavigate()
  const { t } = useT()
  // Only used to trigger a re-check once CSV import/manual add changes the
  // read count — the pair itself always comes fresh from pickComparisonPair,
  // never derived from this list directly.
  const books = useLibrary()
  const readCount = books.filter((b) => b.status === "read").length

  const [result, setResult] = useState<ComparisonPairResult | undefined>(undefined)
  // The real total from Dexie, not a session-local counter — undo needs to
  // work even for a comparison made in an earlier visit, so "is there
  // anything to undo" has to reflect actual history, not just this page load.
  const [totalComparisons, setTotalComparisons] = useState<number | null>(null)
  // Local library books rarely carry a cover of their own (CSV imports
  // almost never do) — fetched per book id once its pair loads, skipped
  // entirely for books that already have one.
  const [fetchedCovers, setFetchedCovers] = useState<Record<string, string>>({})

  const loadPair = useCallback(async () => {
    setResult(await pickComparisonPair())
  }, [])

  const refreshTotal = useCallback(async () => {
    setTotalComparisons(await db.comparisons.count())
  }, [])

  useEffect(() => {
    loadPair()
    refreshTotal()
  }, [loadPair, refreshTotal, readCount])

  useEffect(() => {
    if (result?.status !== "ok") return
    for (const book of result.pair) {
      if (book.coverUrl || book.coverId || book.isbn || fetchedCovers[book.id]) continue
      fetchBookCoverUrl(book.title, book.author).then((url) => {
        if (url) setFetchedCovers((prev) => ({ ...prev, [book.id]: url }))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  async function handlePick(winnerId: string) {
    if (result?.status !== "ok") return
    const [a, b] = result.pair
    await recordComparison(a, b, winnerId)
    await refreshTotal()
    loadPair()
  }

  async function handleUndo() {
    const undone = await undoLastComparison()
    if (undone) {
      await refreshTotal()
      loadPair()
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/library")}
        className="mb-5 block text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        {t("back.library")}
      </button>

      <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("compare.eyebrow")}</p>
      <h2 className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">{t("compare.title")}</h2>
      <p className="mb-8 text-sm text-muted-foreground">{t("compare.subtitle")}</p>

      {result === undefined ? null : result.status === "not-enough-books" ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("compare.needMore")}
        </p>
      ) : result.status === "exhausted" ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("compare.exhausted")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {result.pair.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => handlePick(book.id)}
                className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-transform hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <BookCover
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  isbn={book.isbn}
                  coverId={book.coverId}
                  coverUrl={book.coverUrl ?? fetchedCovers[book.id]}
                />
                <div className="min-w-0">
                  <strong className="block text-[13.5px] font-semibold text-balance">{book.title}</strong>
                  <span className="text-xs text-muted-foreground">{book.author}</span>
                </div>
              </button>
            ))}
          </div>
          {!!totalComparisons && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-center text-[12.5px] text-muted-foreground">
                {t("compare.count", totalComparisons)}
              </p>
              <Button variant="ghost" className="h-9 px-3 text-[12.5px] text-muted-foreground" onClick={handleUndo}>
                {t("compare.undo")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
