import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useReadingStore } from "@/store/useReadingStore"
import { GENRES, genreLabel } from "@/lib/genres"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function GenrePage() {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const { selectedGenre, setGenre, setSource } = useReadingStore()

  function handleSubmit() {
    setSource("genre")
    navigate("/result")
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mb-5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        {t("back.home")}
      </button>

      <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("genre.eyebrow")}</p>
      <h2 className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">{t("genre.title")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("genre.subtitle")}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {GENRES.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => setGenre(genre)}
            aria-pressed={selectedGenre === genre}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-colors",
              selectedGenre === genre
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50"
            )}
          >
            {genreLabel(genre, lang)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-accent p-5">
        <div>
          <p className="font-serif text-[15px] italic text-accent-foreground">
            {selectedGenre ? genreLabel(selectedGenre, lang) : t("genre.empty")}
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {selectedGenre ? t("genre.ready") : t("genre.pick")}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!selectedGenre}
          className="h-11 rounded-full px-6 text-[14px] font-semibold"
        >
          {t("genre.cta")}
        </Button>
      </div>
    </div>
  )
}
