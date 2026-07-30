import { useEffect, useRef, useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", key: "nav.home", end: true },
  { to: "/library", key: "nav.library", end: false },
] as const

export function NavBar() {
  const location = useLocation()
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const current =
    NAV_ITEMS.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))) ??
    NAV_ITEMS[0]

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("click", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <>
      {/* Desktop: pill tabs */}
      <nav className="hidden sm:flex w-fit max-w-full gap-1 rounded-full border border-border bg-secondary p-1.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )
            }
          >
            {t(item.key)}
          </NavLink>
        ))}
      </nav>

      {/* Mobile: hamburger trigger + dropdown */}
      <div className="relative sm:hidden" ref={wrapRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
          aria-label={t("nav.openMenu")}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-full border border-border bg-secondary px-4.5 py-3"
        >
          <span className="font-serif text-[15px] font-semibold">{t(current.key)}</span>
          <span className="relative h-3.5 w-[18px] shrink-0" aria-hidden="true">
            <span
              className={cn(
                "absolute inset-x-0 top-0 h-0.5 rounded-full bg-muted-foreground transition-all",
                open && "top-1.5 rotate-45"
              )}
            />
            <span
              className={cn(
                "absolute inset-x-0 top-1.5 h-0.5 rounded-full bg-muted-foreground transition-opacity",
                open && "opacity-0"
              )}
            />
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-muted-foreground transition-all",
                open && "bottom-1.5 -rotate-45"
              )}
            />
          </span>
        </button>

        {open && (
          <div
            id="mobile-nav-menu"
            className="absolute inset-x-0 top-[calc(100%+8px)] z-20 flex flex-col gap-0.5 rounded-2xl border border-border bg-popover p-1.5 shadow-lg"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors",
                    isActive ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-card"
                  )
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
