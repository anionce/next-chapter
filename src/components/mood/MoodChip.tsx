import { cn } from "@/lib/utils"
import { moodLabel, type MoodOption } from "@/lib/moods"
import { useT } from "@/lib/i18n"

interface MoodChipProps {
  option: MoodOption
  active: boolean
  onToggle: () => void
}

export function MoodChip({ option, active, onToggle }: MoodChipProps) {
  const { lang } = useT()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/50"
      )}
    >
      <span aria-hidden="true">{option.emoji}</span>
      {moodLabel(option.id, lang)}
    </button>
  )
}
