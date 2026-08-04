import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { useLibrary } from "@/hooks/useLibrary"
import { parseLibraryCsv, type ImportResult } from "@/lib/csv"
import { mergeIntoLibrary, replaceLibrary, removeFromLibrary } from "@/lib/db"
import { GENRES, genreLabel } from "@/lib/genres"
import { useT } from "@/lib/i18n"
import type { Book, ReadStatus } from "@/lib/types"

const SOURCE_LABEL: Record<ImportResult["source"], string> = {
  goodreads: "Goodreads",
  storygraph: "StoryGraph",
}

interface AddBookForm {
  title: string
  author: string
  genre: string
  pages: string
  status: ReadStatus
}

const ADD_DEFAULTS: AddBookForm = { title: "", author: "", genre: GENRES[0], pages: "", status: "unread" }

function manualId(title: string, author: string): string {
  return `manual-${title}-${author}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
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
  const { register, handleSubmit, reset } = useForm<AddBookForm>({ defaultValues: ADD_DEFAULTS })

  const wishlist = useMemo(
    () => books.filter((b) => b.status === "unread").sort((a, b) => a.title.localeCompare(b.title)),
    [books]
  )
  const reading = useMemo(
    () => books.filter((b) => b.status === "reading").sort((a, b) => a.title.localeCompare(b.title)),
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

  async function onAddBook(values: AddBookForm) {
    const title = values.title.trim()
    const author = values.author.trim()
    if (!title || !author) return
    const book: Book = {
      id: manualId(title, author),
      title,
      author,
      pages: values.pages ? Number(values.pages) : null,
      year: null,
      genre: values.genre,
      moods: [],
      status: values.status,
      source: "added",
    }
    await mergeIntoLibrary([book])
    reset(ADD_DEFAULTS)
  }

  const pendingUnread = pending?.books.filter((b) => b.status === "unread").length ?? 0
  const pendingReading = pending?.books.filter((b) => b.status === "reading").length ?? 0
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
        {t("library.summary", books.length, wishlist.length, reading.length, read.length)}
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

      <form
        onSubmit={handleSubmit(onAddBook)}
        className="mb-6 rounded-2xl border border-border bg-card p-5"
      >
        <p className="mb-1 text-sm font-semibold">{t("library.addTitle")}</p>
        <p className="mb-4 text-[13px] text-muted-foreground">{t("library.addDesc")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            {...register("title", { required: true })}
            type="text"
            placeholder={t("library.addBookTitlePlaceholder")}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
          />
          <input
            {...register("author", { required: true })}
            type="text"
            placeholder={t("library.addAuthorPlaceholder")}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
          />
          <select
            {...register("genre")}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {genreLabel(g, lang)}
              </option>
            ))}
          </select>
          <input
            {...register("pages")}
            type="number"
            min={0}
            placeholder={t("library.addPagesPlaceholder")}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
          />
          <select
            {...register("status")}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary sm:col-span-2"
          >
            <option value="unread">{t("library.statusUnread")}</option>
            <option value="reading">{t("library.statusReading")}</option>
            <option value="read">{t("library.statusRead")}</option>
          </select>
        </div>
        <Button type="submit" className="mt-4 h-10 rounded-full px-5 text-[13px]">
          {t("library.addSubmit")}
        </Button>
      </form>

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
            {t("library.pendingSummary", pendingUnread, pendingReading, pendingRead)}
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
