import Papa from "papaparse"
import type { MoodId } from "@/lib/moods"
import type { Book, ReadStatus } from "@/lib/types"
import { pickGenreFromTags } from "@/lib/genres"

export type CsvSource = "goodreads" | "storygraph"

export interface ImportResult {
  source: CsvSource
  books: Book[]
  skipped: number
}

function slugify(title: string, author: string): string {
  return `${title}-${author}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toInt(value: string | undefined): number | null {
  if (!value) return null
  const n = parseInt(value.replace(/[^\d]/g, ""), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Tries several possible header spellings — export formats drift between app versions. */
function firstInt(row: Record<string, string>, keys: string[]): number | null {
  for (const key of keys) {
    const n = toInt(row[key])
    if (n != null) return n
  }
  return null
}

/** Goodreads/StoryGraph both export ISBNs Excel-escaped as ="0439023483". */
function cleanIsbn(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const digits = raw.replace(/[^0-9Xx]/g, "")
  return digits.length >= 10 ? digits : undefined
}

/**
 * CSV shelves/tags are a personal free-for-all ("favorites", "owned",
 * "5-star", "young-adult", "sci-fi-fantasy"…) — matching against the fixed
 * genre taxonomy (src/lib/genres.ts) instead of just taking the first tag
 * means junk tags are skipped rather than shown as-is.
 */
function pickGenre(raw: string | undefined): string {
  if (!raw) return "Unclassified"
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
  return pickGenreFromTags(tags)
}

/** StoryGraph tracks moods directly — the one CSV field that maps onto our own mood taxonomy. */
const STORYGRAPH_MOOD_MAP: Record<string, MoodId> = {
  dark: "oscuro",
  mysterious: "suspense",
  tense: "suspense",
  emotional: "emotivo",
  sad: "tragico",
  hopeful: "reconfortante",
  lighthearted: "reconfortante",
  funny: "reconfortante",
  relaxing: "acogedor",
  cozy: "acogedor",
  reflective: "que-hace-pensar",
  informative: "que-hace-pensar",
  inspiring: "que-hace-pensar",
  atmospheric: "atmosferico",
  gothic: "gotico",
  historical: "historico",
}

function parseStorygraphMoods(raw: string | undefined): MoodId[] {
  if (!raw) return []
  const found = new Set<MoodId>()
  raw
    .toLowerCase()
    .split(/[,;]/)
    .map((m) => m.trim())
    .forEach((m) => {
      const mapped = STORYGRAPH_MOOD_MAP[m]
      if (mapped) found.add(mapped)
    })
  return Array.from(found).slice(0, 4)
}

function toStatus(shelf: string): ReadStatus {
  if (shelf === "to-read") return "unread"
  if (shelf === "currently-reading" || shelf === "reading") return "reading"
  return "read"
}

function detectSource(fields: string[]): CsvSource {
  if (fields.includes("Exclusive Shelf")) return "goodreads"
  if (fields.includes("Read Status") || fields.includes("Moods")) return "storygraph"
  return "goodreads"
}

function mapGoodreadsRow(row: Record<string, string>): Book | null {
  const title = row["Title"]?.trim()
  const author = row["Author"]?.trim()
  if (!title || !author) return null

  const shelf = (row["Exclusive Shelf"] ?? "").trim().toLowerCase()
  const rating = toInt(row["My Rating"])
  const isbn = cleanIsbn(row["ISBN13"]) ?? cleanIsbn(row["ISBN"])

  return {
    id: slugify(title, author),
    title,
    author,
    pages: firstInt(row, ["Number of Pages", "Pages"]),
    year: firstInt(row, ["Original Publication Year", "Year Published"]),
    genre: pickGenre(row["Bookshelves"]),
    moods: [],
    status: toStatus(shelf),
    source: "goodreads",
    ...(rating ? { rating } : {}),
    ...(isbn ? { isbn } : {}),
  }
}

function mapStorygraphRow(row: Record<string, string>): Book | null {
  const title = row["Title"]?.trim()
  const author = (row["Authors"] ?? row["Author"])?.trim()
  if (!title || !author) return null

  const status = (row["Read Status"] ?? "").trim().toLowerCase()
  const rating = toInt(row["Star Rating"])
  const isbn = cleanIsbn(row["ISBN/UID"])

  return {
    id: slugify(title, author),
    title,
    author,
    pages: firstInt(row, ["Pages", "Page Count", "Number of Pages"]),
    year: firstInt(row, ["Publication Year", "Year Published"]),
    genre: pickGenre(row["Tags"]),
    moods: parseStorygraphMoods(row["Moods"]),
    status: toStatus(status),
    source: "storygraph",
    ...(rating ? { rating } : {}),
    ...(isbn ? { isbn } : {}),
  }
}

export function parseLibraryCsv(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? []
        const source = detectSource(fields)
        const mapper = source === "storygraph" ? mapStorygraphRow : mapGoodreadsRow

        const books: Book[] = []
        let skipped = 0
        for (const row of results.data) {
          const book = mapper(row)
          if (book) books.push(book)
          else skipped++
        }
        resolve({ source, books, skipped })
      },
      error: (err: Error) => reject(err),
    })
  })
}
