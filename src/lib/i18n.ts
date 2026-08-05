import { useLanguageStore, type Lang } from "@/store/useLanguageStore"

type Value = string | ((...args: never[]) => string)
type Dict = Record<string, Value>

const es: Dict = {
  "nav.home": "Inicio",
  "nav.mood": "Mood",
  "nav.result": "Resultado",
  "nav.openMenu": "Abrir menú de pantallas",
  "nav.library": "Tu biblioteca",

  "home.eyebrow": "Hoy",
  "home.title": "¿Qué te apetece leer hoy?",
  "home.subtitle": ((unread: number, reading: number) =>
    `${unread} ${unread === 1 ? "libro" : "libros"} por leer esperando turno${
      reading > 0 ? ` · ${reading} en curso ahora mismo` : ""
    }.`) as Value,
  "home.mood.title": "Elegir por mood",
  "home.mood.desc": "Combina hasta 3 sensaciones — acogedor, atmosférico, trágico…",
  "home.genre.title": "Por género",
  "home.genre.desc": "Cuando ya sabes lo que te apetece.",
  "home.random.title": "Sorpréndeme",
  "home.random.desc": "Una decisión menos.",
  "home.filters.title": "Filtros avanzados",
  "home.filters.desc": "Autor, páginas, año.",
  "home.comingSoon": "Próximamente",

  "back.home": "← Inicio",
  "back.mood": "← Mood",
  "back.genre": "← Género",

  "mood.eyebrow": "Modo mood",
  "mood.title": "¿Cómo quieres sentirte leyendo?",
  "mood.subtitle": ((total: number) =>
    `Combina hasta 3. Así encontramos el cruce exacto — no una lista de ${total} libros más.`) as Value,
  "mood.empty": "Sin seleccionar",
  "mood.pickAtLeastOne": "Elige al menos una sensación",
  "mood.cta": "Ver mi lectura de hoy →",

  "genre.eyebrow": "Por género",
  "genre.title": "¿Qué género te apetece?",
  "genre.subtitle": "Elige uno. Seguimos cruzándolo con la fecha y tu biblioteca.",
  "genre.empty": "Sin seleccionar",
  "genre.pick": "Elige un género",
  "genre.ready": "Listo para cruzarlo con hoy",
  "genre.cta": "Ver mi lectura de hoy →",

  "result.eyebrow": "Tu lectura de hoy",
  "result.searching": "Buscando tu próxima lectura…",
  "result.empty": "No hay nada por leer que encaje, ni en tu biblioteca ni fuera. Prueba con otro mood.",
  "result.why": "Por qué este y no otro",
  "result.readThis": "Lee este.",
  "result.addWishlist": "Añadir a mi wishlist",
  "result.notToday": "Hoy no",
  "result.pagesUnknown": "páginas sin datos",

  "filters.eyebrow": "Filtros avanzados",
  "filters.title": "Busca con precisión.",
  "filters.subtitle": "Cuando ya sabes exactamente lo que quieres, esto es más rápido que una decisión.",
  "filters.author": "Autor",
  "filters.authorPlaceholder": "Cualquiera",
  "filters.genre": "Género",
  "filters.genreAny": "Cualquiera",
  "filters.pages": "Páginas",
  "filters.pagesMin": "Mín.",
  "filters.pagesMax": "Máx.",
  "filters.years": "Publicado entre",
  "filters.yearFrom": "Desde",
  "filters.yearTo": "Hasta",
  "filters.source": "Buscar en",
  "filters.sourceWishlist": "Mi wishlist",
  "filters.sourceExternal": "Fuera (nuevos)",
  "filters.results": ((n: number) => `${n} ${n === 1 ? "resultado" : "resultados"}`) as Value,
  "filters.noResults": "Nada encaja con esos filtros. Prueba a soltar alguno.",
  "filters.searching": "Buscando…",

  "library.eyebrow": "Tu biblioteca",
  "library.title": "Conecta tu biblioteca.",
  "library.summary": ((total: number, unread: number, reading: number, read: number) =>
    `${total} libros ahora mismo — ${unread} por leer, ${reading} en curso, ${read} ya leídos.`) as Value,
  "library.importTitle": "Importar CSV",
  "library.importDesc":
    "Exporta tu biblioteca desde Goodreads (Ajustes de cuenta → Cuenta y notificaciones → Descargar mis datos de Goodreads) o StoryGraph (Gestionar cuenta → Gestionar mis datos → Exportar biblioteca de StoryGraph) y súbela aquí. Detectamos el formato automáticamente.",
  "library.chooseFile": "Elegir archivo CSV",
  "library.badFile": "No hemos podido leer ese archivo. Revisa que sea un CSV.",
  "library.noRows": "No hemos reconocido ninguna fila. ¿Es un export de Goodreads o StoryGraph?",
  "library.detected": ((n: number, source: string) => `${n} libros detectados · formato ${source}`) as Value,
  "library.pendingSummary": ((unread: number, reading: number, read: number) =>
    `${unread} por leer, ${reading} en curso, ${read} ya leídos — solo los que están por leer (o en curso) entrarán en tus recomendaciones`) as Value,
  "library.skippedRows": ((n: number) => `. ${n} filas sin título o autor, ignoradas`) as Value,
  "library.replace": "Reemplazar mi biblioteca",
  "library.merge": "Añadir a lo que ya tengo",
  "library.discard": "Descartar",
  "library.wishlistTitle": "Tu wishlist",
  "library.wishlistEmpty": "Nada por leer todavía. Importa tu biblioteca o descubre algo nuevo desde Mood o Género.",
}

const en: Dict = {
  "nav.home": "Home",
  "nav.mood": "Mood",
  "nav.result": "Result",
  "nav.openMenu": "Open screen menu",
  "nav.library": "Your library",

  "home.eyebrow": "Today",
  "home.title": "What do you feel like reading today?",
  "home.subtitle": ((unread: number) => `${unread} ${unread === 1 ? "book" : "books"} waiting for their turn.`) as Value,
  "home.mood.title": "Choose by mood",
  "home.mood.desc": "Pick one feeling — atmospheric, dark, tragic…",
  "home.genre.title": "By genre",
  "home.genre.desc": "When you already know what you're after.",
  "home.random.title": "Surprise me",
  "home.random.desc": "One less decision.",
  "home.filters.title": "Advanced filters",
  "home.filters.desc": "Author, pages, year.",
  "home.forYou.title": "For you",
  "home.forYou.desc": "Based on the books you've ranked.",
  "home.forYou.descEmpty": "Rank a few books first.",
  "home.comingSoon": "Coming soon",

  "back.home": "← Home",
  "back.mood": "← Mood",
  "back.genre": "← Genre",
  "back.library": "← Your library",

  "mood.eyebrow": "Mood mode",
  "mood.title": "How do you want to feel while reading?",
  "mood.subtitle": ((total: number) =>
    `Pick one. That's how we find a real match — not another list of ${total} books.`) as Value,
  "mood.empty": "Nothing selected",
  "mood.pickAtLeastOne": "Pick at least one feeling",
  "mood.cta": "See my read for today →",

  "genre.eyebrow": "By genre",
  "genre.title": "What genre are you in the mood for?",
  "genre.subtitle": "Pick one. We'll still cross it with the date and your library.",
  "genre.empty": "Nothing selected",
  "genre.pick": "Pick a genre",
  "genre.ready": "Ready to cross with today",
  "genre.cta": "See my read for today →",

  "compare.eyebrow": "Rank your books",
  "compare.title": "Which did you prefer?",
  "compare.subtitle": "A few quick picks build a real ranking of your taste — used to find books that resemble your actual favorites, not just a 5-star guess.",
  "compare.needMore": "Mark at least 4 books as read to start ranking them.",
  "compare.exhausted": "You've compared every combination of your read books — mark another one as read for more.",
  "compare.count": ((n: number) => `${n} ${n === 1 ? "comparison" : "comparisons"} so far`) as Value,

  "result.eyebrow": "Your read for today",
  "result.searching": "Finding your next read…",
  "result.empty": "Nothing fits, in your library or outside it. Try a different mood.",
  "result.why": "Why this and not another",
  "result.readThis": "Read this.",
  "result.addWishlist": "Add to my wishlist",
  "result.notToday": "Next",
  "result.pagesUnknown": "page count unknown",

  "filters.eyebrow": "Advanced filters",
  "filters.title": "Search with precision.",
  "filters.subtitle": "When you already know exactly what you want, this is faster than a decision.",
  "filters.author": "Author",
  "filters.authorPlaceholder": "Any",
  "filters.genre": "Genre",
  "filters.genreAny": "Any",
  "filters.years": "Published between",
  "filters.yearFrom": "From",
  "filters.yearTo": "To",
  "filters.length": "Length",
  "filters.lengthAny": "Any",
  "filters.lengthShort": "Short",
  "filters.lengthLong": "Long",
  "filters.source": "Search in",
  "filters.sourceWishlist": "My wishlist",
  "filters.sourceExternal": "Outside (new)",
  "filters.results": ((n: number) => `${n} ${n === 1 ? "result" : "results"}`) as Value,
  "filters.noResults": "Nothing matches those filters. Try dropping one.",
  "filters.setAFilter": "Set at least one filter above to search.",
  "filters.searching": "Searching…",

  "library.eyebrow": "Your library",
  "library.title": "Connect your library.",
  "library.summary": ((total: number, unread: number, read: number) =>
    `${total} books right now — ${unread} to read, ${read} already read.`) as Value,
  "library.importTitle": "Import CSV",
  "library.importDesc":
    "Export your library from Goodreads (Account settings → Account & Notifications → Download your Goodreads data) or StoryGraph (Manage account → Manage your data → Export StoryGraph library) and upload it here. We detect the format automatically.",
  "library.chooseFile": "Choose CSV file",
  "library.badFile": "We couldn't read that file. Make sure it's a CSV.",
  "library.noRows": "We didn't recognize any rows. Is this a Goodreads or StoryGraph export?",
  "library.detected": ((n: number, source: string) => `${n} books detected · ${source} format`) as Value,
  "library.pendingSummary": ((unread: number, read: number) =>
    `${unread} to read, ${read} already read — only the ones to read will enter your recommendations`) as Value,
  "library.skippedRows": ((n: number) => `. ${n} rows without a title or author, skipped`) as Value,
  "library.replace": "Replace my library",
  "library.merge": "Add to what I have",
  "library.discard": "Discard",
  "library.wishlistTitle": "Your wishlist",
  "library.wishlistEmpty": "Nothing to read yet. Import your library or discover something new from Mood or Genre.",
  "library.readTitle": "Read",
  "library.readEmpty": "Nothing marked as read yet.",
  "library.rankTitle": "Rank your books",
  "library.rankDesc": "Quick head-to-head picks build a real taste profile — used to find new books that resemble your actual favorites.",
  "library.rankNeedMore": "Mark at least 4 books as read to start.",
  "library.remove": "Remove",
  "library.addTitle": "Add a book",
  "library.addDesc": "Search for a real book instead of typing it in by hand — picks up the title, author, pages, and genre for you.",
  "library.addSearchPlaceholder": "Search by title or author…",
  "library.addSearching": "Searching…",
  "library.addNoResults": "No matches. Try a different spelling.",
  "library.addChange": "Change",
  "library.addSubmit": "Add",
  "library.statusUnread": "Wishlist",
  "library.statusRead": "Read",
}

const DICTS: Record<Lang, Dict> = { es, en }

export function translate(lang: Lang, key: string, ...args: unknown[]): string {
  const entry = DICTS[lang][key] ?? DICTS.es[key]
  if (typeof entry === "function") return (entry as (...a: unknown[]) => string)(...args)
  return entry ?? key
}

export function useT() {
  const lang = useLanguageStore((s) => s.lang)
  return {
    lang,
    t: (key: string, ...args: unknown[]) => translate(lang, key, ...args),
  }
}
