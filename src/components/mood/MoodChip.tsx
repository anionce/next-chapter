import { cn } from "@/lib/utils"
import { moodLabel, type MoodOption } from "@/lib/moods"
import { useT } from "@/lib/i18n"

interface MoodChipProps {
  option: MoodOption
  active: boolean
  disabled: boolean
  onToggle: () => void
}

export function MoodChip({ option, active, disabled, onToggle }: MoodChipProps) {
  const { lang } = useT()
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/50",
        disabled && !active && "pointer-events-none opacity-40"
      )}
    >
      <span aria-hidden="true">{option.emoji}</span>
      {moodLabel(option.id, lang)}
    </button>
  )
}
