import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/** Four in-palette tints, all built from the existing blush/berry tokens
 * (no new colors introduced) — enough to make each card visually distinct
 * while every one gets the exact same size, layout, and weight. No card is
 * "the featured one" anymore: every mode is a real, equally-good way in. */
const CARD_COLORS = [
  "border-accent-foreground/15 bg-accent",
  "border-border bg-secondary",
  "border-primary/25 bg-primary/15",
  "border-primary/35 bg-primary/25",
] as const

interface ModeCardProps {
  to?: string
  onClick?: () => void
  emoji: string
  title: string
  description: string
  color: (typeof CARD_COLORS)[number]
  comingSoonLabel?: string
}

export function ModeCard({ to, onClick, emoji, title, description, color, comingSoonLabel }: ModeCardProps) {
  const content = (
    <>
      <span className="text-2xl leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <strong className="block font-serif text-base font-semibold sm:text-lg">{title}</strong>
        <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{description}</span>
      </div>
    </>
  )

  const className = cn(
    "col-span-1 flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-transform",
    color,
    (to || onClick) && "hover:-translate-y-0.5 hover:shadow-md"
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return (
    <div className={cn(className, "opacity-70")}>
      {content}
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {comingSoonLabel}
      </span>
    </div>
  )
}

export { CARD_COLORS }
