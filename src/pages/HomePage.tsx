import { useNavigate } from "react-router-dom"
import { ModeCard, CARD_COLORS } from "@/components/home/ModeCard"
import { useLibrary } from "@/hooks/useLibrary"
import { MIN_COMPARISONS_FOR_FAVORITES } from "@/lib/db"
import { useT } from "@/lib/i18n"
import { useReadingStore } from "@/store/useReadingStore"
import { MOOD_OPTIONS } from "@/lib/moods"

export function HomePage() {
  const { t } = useT()
  const navigate = useNavigate()
  const setSurpriseMood = useReadingStore((s) => s.setSurpriseMood)
  const setSource = useReadingStore((s) => s.setSource)
  const books = useLibrary()
  const unreadCount = books.filter((b) => b.status === "unread").length
  // Each comparison increments eloComparisons on two books at once, so
  // summing and halving gives the real total made, not per-book noise.
  const totalComparisons = books.reduce((sum, b) => sum + (b.eloComparisons ?? 0), 0) / 2
  const hasFavorites = totalComparisons >= MIN_COMPARISONS_FOR_FAVORITES

  function handleSurpriseMe() {
    const pick = MOOD_OPTIONS[Math.floor(Math.random() * MOOD_OPTIONS.length)]
    setSurpriseMood([pick.id])
    navigate("/result")
  }

  // A book with only 1-2 comparisons has an Elo rating that's mostly noise,
  // not a real signal — below MIN_COMPARISONS_FOR_FAVORITES, send to
  // /compare to build up a real ranking instead of landing on a "for you"
  // result that would just be an unpersonalized fallback pool in disguise.
  function handleForYou() {
    if (!hasFavorites) {
      navigate("/compare")
      return
    }
    setSource("favorites")
    navigate("/result")
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("home.eyebrow")}</p>
      <h1 className="mb-2 text-balance font-serif text-3xl font-semibold leading-tight sm:text-4xl">
        {t("home.title")}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">{t("home.subtitle", unreadCount)}</p>

      {/* Equally-weighted ways in — none is "the accurate one" or a
          fallback; each just fits a different way of deciding. */}
      <div className="grid grid-cols-2 gap-3">
        <ModeCard
          to="/mood"
          color={CARD_COLORS[0]}
          emoji="🍂"
          title={t("home.mood.title")}
          description={t("home.mood.desc")}
        />
        <ModeCard
          to="/genre"
          color={CARD_COLORS[1]}
          emoji="📚"
          title={t("home.genre.title")}
          description={t("home.genre.desc")}
        />
        <ModeCard
          onClick={handleSurpriseMe}
          color={CARD_COLORS[2]}
          emoji="🎲"
          title={t("home.random.title")}
          description={t("home.random.desc")}
        />
        <ModeCard
          to="/filters"
          color={CARD_COLORS[3]}
          emoji="🔎"
          title={t("home.filters.title")}
          description={t("home.filters.desc")}
        />
        <ModeCard
          onClick={handleForYou}
          color={CARD_COLORS[4]}
          emoji="⭐"
          title={t("home.forYou.title")}
          description={hasFavorites ? t("home.forYou.desc") : t("home.forYou.descEmpty")}
        />
      </div>
    </div>
  )
}
