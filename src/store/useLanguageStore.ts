export type Lang = "es" | "en"

/**
 * Locked to English — the app was Spanish-first with an ES/EN toggle, but
 * the free translation API backing synopsis translation (MyMemory) has a
 * small daily quota that runs out from normal use, and the decision was to
 * drop Spanish entirely rather than show partially-translated content.
 * `Lang` stays a union (not just "en") since `genreLabel`/`moodLabel`/
 * `seasonLabel`/the i18n dictionary all still carry both translations —
 * only English is reachable through the UI now, but nothing needs deleting
 * to revert this later.
 */
export function useLanguageStore<T>(selector: (state: { lang: Lang }) => T): T {
  return selector({ lang: "en" })
}
