import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface ModeCardProps {
  to?: string
  onClick?: () => void
  emoji: string
  title: string
  description: string
  featured?: boolean
  tag?: string
  comingSoonLabel?: string
}

export function ModeCard({ to, onClick, emoji, title, description, featured, tag, comingSoonLabel }: ModeCardProps) {
  const content = (
    <>
      <span className="text-2xl leading-none">{emoji}</span>
      <div className="min-w-0 flex-1">
        <strong className="block font-serif text-base font-semibold sm:text-lg">{title}</strong>
        <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{description}</span>
      </div>
      {tag && (
        <span className="ml-auto shrink-0 rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold tracking-wide text-accent-foreground uppercase">
          {tag}
        </span>
      )}
    </>
  )

  const className = cn(
    "flex items-center gap-4 rounded-2xl border p-5 text-left transition-transform",
    featured
      ? "col-span-2 sm:col-span-3 border-accent-foreground/25 bg-accent"
      : "col-span-1 flex-col items-start gap-3 border-border bg-card",
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
