import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useLibrary } from "@/hooks/useLibrary"
import { parseLibraryCsv, type ImportResult } from "@/lib/csv"
import { mergeIntoLibrary, replaceLibrary, removeFromLibrary, MIN_BOOKS_TO_COMPARE } from "@/lib/db"
import { searchBooksByQuery } from "@/lib/externalBooks"
import { genreLabel } from "@/lib/genres"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { Book, ReadStatus } from "@/lib/types"

const SOURCE_LABEL: Record<ImportResult["source"], string> = {
  goodreads: "Goodreads",
  storygraph: "StoryGraph",
}

interface BookSectionProps {
  title: string
  emptyText: string
  books: Book[]
  lang: "es" | "en"
  onRemove: (id: string) => void
  removeLabel: string
}

function BookSection({ title, emptyText, books, lang, onRemove, removeLabel }: BookSectionProps) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {books.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="max-h-72 divide-y divide-border overflow-y-auto">
          {books.map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-[13.5px] font-semibold">{b.title}</strong>
                <span className="text-xs text-muted-foreground">{b.author}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{genreLabel(b.genre, lang)}</span>
              <button
                type="button"
                onClick={() => onRemove(b.id)}
                className="shrink-0 text-xs font-medium text-muted-foreground hover:text-destructive"
              >
                {removeLabel}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LibraryPage() {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const books = useLibrary()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Book[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [addStatus, setAddStatus] = useState<ReadStatus>("unread")
  const [adding, setAdding] = useState(false)

  // Debounced live search against Hardcover — picking a real record instead
  // of hand-typing title/author/genre/pages both saves the retyping and
  // rules out the misspellings and miscategorizations manual entry invites.
  useEffect(() => {
    if (selectedBook) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timeout = setTimeout(async () => {
      const found = await searchBooksByQuery(trimmed)
      setSearchResults(found)
      setSearching(false)
    }, 350)
    return () => clearTimeout(timeout)
  }, [query, selectedBook])

  function handleSelectBook(book: Book) {
    setSelectedBook(book)
    setSearchResults([])
  }

  function handleClearSelection() {
    setSelectedBook(null)
    setQuery("")
  }

  async function handleAddSelected() {
    if (!selectedBook) return
    setAdding(true)
    await mergeIntoLibrary([{ ...selectedBook, status: addStatus, source: "added" }])
    setAdding(false)
    setSelectedBook(null)
    setQuery("")
    setAddStatus("unread")
  }

  const wishlist = useMemo(
    () => books.filter((b) => b.status === "unread").sort((a, b) => a.title.localeCompare(b.title)),
    [books]
  )
  const read = useMemo(
    () => books.filter((b) => b.status === "read").sort((a, b) => a.title.localeCompare(b.title)),
    [books]
  )

  async function handleFile(file: File) {
    setError(null)
    setPending(null)
    try {
      const result = await parseLibraryCsv(file)
      if (result.books.length === 0) {
        setError(t("library.noRows"))
        return
      }
      setPending(result)
    } catch {
      setError(t("library.badFile"))
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function commit(mode: "merge" | "replace") {
    if (!pending) return
    setBusy(true)
    if (mode === "replace") await replaceLibrary(pending.books)
    else await mergeIntoLibrary(pending.books)
    setBusy(false)
    setPending(null)
  }

  const pendingUnread = pending?.books.filter((b) => b.status === "unread").length ?? 0
  const pendingRead = pending?.books.filter((b) => b.status === "read").length ?? 0

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mb-5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        {t("back.home")}
      </button>

      <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("library.eyebrow")}</p>
      <h2 className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">{t("library.title")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {t("library.summary", books.length, wishlist.length, read.length)}
      </p>

      <BookSection
        title={t("library.wishlistTitle")}
        emptyText={t("library.wishlistEmpty")}
        books={wishlist}
        lang={lang}
        onRemove={removeFromLibrary}
        removeLabel={t("library.remove")}
      />
      <BookSection
        title={t("library.readTitle")}
        emptyText={t("library.readEmpty")}
        books={read}
        lang={lang}
        onRemove={removeFromLibrary}
        removeLabel={t("library.remove")}
      />

      <button
        type="button"
        onClick={() => navigate("/compare")}
        disabled={read.length < MIN_BOOKS_TO_COMPARE}
        className="mb-6 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-dashed border-primary/40 bg-accent p-5 text-left transition-transform enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div>
          <p className="mb-1 text-sm font-semibold text-accent-foreground">{t("library.rankTitle")}</p>
          <p className="text-[13px] text-accent-foreground/80">
            {read.length < MIN_BOOKS_TO_COMPARE ? t("library.rankNeedMore") : t("library.rankDesc")}
          </p>
        </div>
        <span className="shrink-0 text-lg text-accent-foreground">→</span>
      </button>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <p className="mb-1 text-sm font-semibold">{t("library.addTitle")}</p>
        <p className="mb-4 text-[13px] text-muted-foreground">{t("library.addDesc")}</p>

        {selectedBook ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-primary/30 bg-accent p-3">
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[13.5px] font-semibold text-accent-foreground">
                {selectedBook.title}
              </strong>
              <span className="text-xs text-accent-foreground/80">
                {selectedBook.author}
                {selectedBook.pages != null ? ` · ${selectedBook.pages} pages` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="shrink-0 cursor-pointer text-xs font-medium text-accent-foreground/80 hover:text-accent-foreground"
            >
              {t("library.addChange")}
            </button>
          </div>
        ) : (
          <div className="mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("library.addSearchPlaceholder")}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
            />
            {searching && <p className="mt-2 text-xs text-muted-foreground">{t("library.addSearching")}</p>}
            {!searching && searchResults.length > 0 && (
              <div className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {searchResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBook(b)}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px] font-semibold">{b.title}</strong>
                      <span className="text-xs text-muted-foreground">
                        {b.author}
                        {b.year != null ? ` · ${b.year}` : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">{t("library.addNoResults")}</p>
            )}
          </div>
        )}

        <select
          value={addStatus}
          onChange={(e) => setAddStatus(e.target.value as ReadStatus)}
          className="mb-4 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
        >
          <option value="unread">{t("library.statusUnread")}</option>
          <option value="read">{t("library.statusRead")}</option>
        </select>

        <Button
          disabled={!selectedBook || adding}
          onClick={handleAddSelected}
          className={cn("h-10 rounded-full px-5 text-[13px]", !selectedBook && "cursor-not-allowed opacity-50")}
        >
          {t("library.addSubmit")}
        </Button>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <p className="mb-1 text-sm font-semibold">{t("library.importTitle")}</p>
        <p className="mb-4 text-[13px] text-muted-foreground">{t("library.importDesc")}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        <Button
          variant="outline"
          className="h-10 rounded-full px-5 text-[13px]"
          onClick={() => fileRef.current?.click()}
        >
          {t("library.chooseFile")}
        </Button>
        {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
      </div>

      {pending && (
        <div className="mb-6 rounded-2xl border border-dashed border-primary/40 bg-accent p-5">
          <p className="mb-1 text-sm font-semibold text-accent-foreground">
            {t("library.detected", pending.books.length, SOURCE_LABEL[pending.source])}
          </p>
          <p className="mb-3 text-[13px] text-accent-foreground/80">
            {t("library.pendingSummary", pendingUnread, pendingRead)}
            {pending.skipped > 0 ? t("library.skippedRows", pending.skipped) : "."}
          </p>
          <ul className="mb-4 flex flex-col gap-1 text-[12.5px] text-accent-foreground/80">
            {pending.books.slice(0, 6).map((b) => (
              <li key={b.id} className="truncate">
                {b.title} — {b.author}
              </li>
            ))}
            {pending.books.length > 6 && <li>+{pending.books.length - 6}…</li>}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} className="h-10 rounded-full px-5 text-[13px]" onClick={() => commit("replace")}>
              {t("library.replace")}
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              className="h-10 rounded-full px-5 text-[13px]"
              onClick={() => commit("merge")}
            >
              {t("library.merge")}
            </Button>
            <Button
              disabled={busy}
              variant="ghost"
              className="h-10 rounded-full px-4 text-[13px] text-muted-foreground"
              onClick={() => setPending(null)}
            >
              {t("library.discard")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
