import { Outlet } from "react-router-dom"
import { NavBar } from "@/components/layout/NavBar"

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date())
}

export function AppShell() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
        <div className="mb-7 flex items-center justify-between gap-3">
          <span className="font-serif text-lg">
            <span className="italic">next</span> <span className="font-semibold">chapter</span>
          </span>
          <time className="text-xs tabular-nums text-muted-foreground">{todayLabel()}</time>
        </div>
        <div className="mb-8">
          <NavBar />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
