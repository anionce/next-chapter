import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { MoodChip } from "@/components/mood/MoodChip"
import { MOOD_OPTIONS, SELECTABLE_MOOD_IDS, formatMoodListLang } from "@/lib/moods"
import { useT } from "@/lib/i18n"
import { useReadingStore } from "@/store/useReadingStore"
import { useLibrary } from "@/hooks/useLibrary"

export function MoodPage() {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const { selectedMoods: rawSelectedMoods, toggleMood, setSource } = useReadingStore()
  const books = useLibrary()
  // A mood dropped from MOOD_OPTIONS can still be sitting in persisted state
  // from before the cut — filter it out here so it can't get stuck showing
  // in the summary text with no chip left to toggle it off.
  const selectedMoods = rawSelectedMoods.filter((id) => SELECTABLE_MOOD_IDS.has(id))

  function handleSubmit() {
    setSource("mood")
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

      <p className="mb-2 text-[11px] font-semibold tracking-widest text-primary uppercase">{t("mood.eyebrow")}</p>
      <h2 className="mb-2 font-serif text-2xl font-semibold sm:text-3xl">{t("mood.title")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("mood.subtitle", books.length)}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {MOOD_OPTIONS.map((option) => (
          <MoodChip
            key={option.id}
            option={option}
            active={selectedMoods.includes(option.id)}
            disabled={!selectedMoods.includes(option.id) && selectedMoods.length >= 3}
            onToggle={() => toggleMood(option.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-accent p-5">
        <div>
          <p className="font-serif text-[15px] italic text-accent-foreground">
            {selectedMoods.length ? formatMoodListLang(selectedMoods, lang) : t("mood.empty")}
          </p>
          {selectedMoods.length === 0 && (
            <p className="mt-1 text-[12.5px] text-muted-foreground">{t("mood.pickAtLeastOne")}</p>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={selectedMoods.length === 0}
          className="h-11 rounded-full px-6 text-[14px] font-semibold"
        >
          {t("mood.cta")}
        </Button>
      </div>
    </div>
  )
}
