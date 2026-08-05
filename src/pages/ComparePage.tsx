import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BookCover } from "@/components/result/BookCover"
import { pickComparisonPair, recordComparison, type ComparisonPairResult } from "@/lib/db"
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
  const [count, setCount] = useState(0)

  const loadPair = useCallback(async () => {
    setResult(await pickComparisonPair())
  }, [])

  useEffect(() => {
    loadPair()
  }, [loadPair, readCount])

  async function handlePick(winnerId: string) {
    if (result?.status !== "ok") return
    const [a, b] = result.pair
    await recordComparison(a, b, winnerId)
    setCount((c) => c + 1)
    loadPair()
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
                  coverUrl={book.coverUrl}
                />
                <div className="min-w-0">
                  <strong className="block text-[13.5px] font-semibold text-balance">{book.title}</strong>
                  <span className="text-xs text-muted-foreground">{book.author}</span>
                </div>
              </button>
            ))}
          </div>
          {count > 0 && (
            <p className="mt-6 text-center text-[12.5px] text-muted-foreground">{t("compare.count", count)}</p>
          )}
        </>
      )}
    </div>
  )
}
