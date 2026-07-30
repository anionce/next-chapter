import type { Lang } from "@/store/useLanguageStore"

export type MoodId =
  | "acogedor"
  | "atmosferico"
  | "que-hace-pensar"
  | "emotivo"
  | "suspense"
  | "gotico"
  | "otonal"
  | "estival"
  | "invernal"
  | "naturaleza"
  | "pueblo-pequeno"
  | "oscuro"
  | "historico"
  | "literario"
  | "saga-familiar"
  | "tragico"
  | "reconfortante"
  | "inquietante"

export interface MoodOption {
  id: MoodId
  label: string
  emoji: string
}

// Only moods backed by a real Hardcover *Mood*-category tag are selectable
// (see MOOD_TO_HARDCOVER_TAG in externalBooks.ts, categoryId 4 only) — not
// genre/tag-proxied ones either. Genre/tag proxies were tried first
// (gotico→Horror genre, naturaleza→Nature genre, pueblo-pequeno→a freeform
// tag, historico→Historical Fiction genre, literario→Literature genre) and
// dropped: a genre tag answers "is this book about X", not "does it feel
// like X", and most books in a genre don't also carry the mood — confirmed
// live, only 11 of 65 books found via the "Nature" genre tag actually had
// "naturaleza" in their own real mood profile. otonal/estival/invernal (no
// Hardcover tag of any kind, matched via `book.season` instead) and
// saga-familiar (no tag exists for it at all) were already excluded for the
// same underlying reason: a mood you can pick but that can never surface a
// real match is a dead end, not a feature. `MoodId` keeps all 18 values
// (imported CSV data may still carry the dropped ones), only the picker
// list is restricted to these 9.
export const MOOD_OPTIONS: MoodOption[] = [
  { id: "acogedor", label: "Acogedor", emoji: "🪵" },
  { id: "atmosferico", label: "Atmosférico", emoji: "🌧" },
  { id: "que-hace-pensar", label: "Que hace pensar", emoji: "🧠" },
  { id: "emotivo", label: "Emotivo", emoji: "❤️" },
  { id: "suspense", label: "De suspense", emoji: "🔎" },
  { id: "oscuro", label: "Oscuro", emoji: "🕯" },
  { id: "tragico", label: "Trágico", emoji: "💔" },
  { id: "reconfortante", label: "Reconfortante", emoji: "😊" },
  { id: "inquietante", label: "Inquietante", emoji: "😨" },
]

export const MOOD_LABEL: Record<MoodId, string> = Object.fromEntries(
  MOOD_OPTIONS.map((m) => [m.id, m.label])
) as Record<MoodId, string>

const MOOD_LABEL_EN: Record<MoodId, string> = {
  acogedor: "Cozy",
  atmosferico: "Atmospheric",
  "que-hace-pensar": "Thought-provoking",
  emotivo: "Emotional",
  suspense: "Suspenseful",
  gotico: "Gothic",
  otonal: "Autumnal",
  estival: "Summery",
  invernal: "Wintery",
  naturaleza: "Nature",
  "pueblo-pequeno": "Small town",
  oscuro: "Dark",
  historico: "Historical",
  literario: "Literary",
  "saga-familiar": "Family saga",
  tragico: "Tragic",
  reconfortante: "Feel-good",
  inquietante: "Unsettling",
}

/** Display label for a mood chip — the stored `MoodId` is always the
 * canonical Spanish slug regardless of UI language. */
export function moodLabel(id: MoodId, lang: Lang): string {
  return lang === "en" ? MOOD_LABEL_EN[id] : MOOD_LABEL[id]
}

export type Season = "otonal" | "invernal" | "estival" | "primaveral"

const SEASON_LABEL: Record<Season, string> = {
  otonal: "otoño",
  invernal: "invierno",
  estival: "verano",
  primaveral: "primavera",
}

const SEASON_LABEL_EN: Record<Season, string> = {
  otonal: "autumn",
  invernal: "winter",
  estival: "summer",
  primaveral: "spring",
}

/** Northern-hemisphere meteorological seasons — the app's launch audience is Spain. */
export function getSeason(date: Date): Season {
  const month = date.getMonth() // 0-11
  if (month >= 8 && month <= 10) return "otonal" // sep-nov
  if (month === 11 || month <= 1) return "invernal" // dec-feb
  if (month >= 2 && month <= 4) return "primaveral" // mar-may
  return "estival" // jun-aug
}

export function seasonLabel(season: Season, lang: Lang = "es"): string {
  return lang === "en" ? SEASON_LABEL_EN[season] : SEASON_LABEL[season]
}

/** Same as `formatMoodListLang`, always Spanish — kept only for anything
 * that still wants the Spanish-only phrasing explicitly. */
export function formatMoodList(ids: MoodId[]): string {
  const labels = ids.map((id) => MOOD_LABEL[id].toLowerCase())
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`
}

/** Language-aware — for UI display (the Mood screen's combo preview) and,
 * now that the app is English-only, the scoring reasons too. */
export function formatMoodListLang(ids: MoodId[], lang: Lang): string {
  const labels = ids.map((id) => moodLabel(id, lang).toLowerCase())
  const and = lang === "en" ? "and" : "y"
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} ${and} ${labels[1]}`
  return `${labels.slice(0, -1).join(", ")} ${and} ${labels[labels.length - 1]}`
}
