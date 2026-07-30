import { useNavigate } from "react-router-dom"
import { ModeCard } from "@/components/home/ModeCard"
import { useLibrary } from "@/hooks/useLibrary"
import { useT } from "@/lib/i18n"
import { useReadingStore } from "@/store/useReadingStore"
import { MOOD_OPTIONS } from "@/lib/moods"

export function HomePage() {
  const { t } = useT()
  const navigate = useNavigate()
  const setMoods = useReadingStore((s) => s.setMoods)
  const books = useLibrary()
  const unreadCount = books.filter((b) => b.status === "unread").length
  const readingCount = books.filter((b) => b.status === "reading").length

  function handleSurpriseMe() {
    const pick = MOOD_OPTIONS[Math.floor(Math.random() * MOOD_OPTIONS.length)]
    setMoods([pick.id])
    navigate("/result")
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("home.eyebrow")}</p>
      <h1 className="mb-2 text-balance font-serif text-3xl font-semibold leading-tight sm:text-4xl">
        {t("home.title")}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("home.subtitle", unreadCount, readingCount)}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ModeCard
          to="/mood"
          featured
          emoji="🍂"
          title={t("home.mood.title")}
          description={t("home.mood.desc")}
          tag={t("home.mood.tag")}
        />
        <ModeCard to="/genre" emoji="📚" title={t("home.genre.title")} description={t("home.genre.desc")} />
        <ModeCard
          onClick={handleSurpriseMe}
          emoji="🎲"
          title={t("home.random.title")}
          description={t("home.random.desc")}
        />
        <ModeCard to="/filters" emoji="🔎" title={t("home.filters.title")} description={t("home.filters.desc")} />
      </div>
    </div>
  )
}
