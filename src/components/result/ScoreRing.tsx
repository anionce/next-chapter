import { useEffect, useRef } from "react"

const R = 50
const CIRC = 2 * Math.PI * R

interface ScoreRingProps {
  score: number
}

export function ScoreRing({ score }: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    const target = CIRC * (1 - score / 100)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) {
      el.style.strokeDashoffset = String(target)
      return
    }
    el.style.transition = "none"
    el.style.strokeDashoffset = String(CIRC)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.22,.9,.26,1)"
        el.style.strokeDashoffset = String(target)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [score])

  return (
    <div className="relative size-28 shrink-0">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={R} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle
          ref={circleRef}
          cx="56"
          cy="56"
          r={R}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="font-serif text-[28px] leading-none font-bold tabular-nums">
          {score}
          <span className="text-base">%</span>
        </b>
        <small className="mt-0.5 text-[10px] text-muted-foreground">for today</small>
      </div>
    </div>
  )
}
