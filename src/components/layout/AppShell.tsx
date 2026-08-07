import { useEffect, useRef } from "react"
import { Outlet } from "react-router-dom"
import { NavBar } from "@/components/layout/NavBar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { ensureSeeded } from "@/lib/db"

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(new Date())
}

export function AppShell() {
  const { user, loading, signIn } = useAuth()
  // Guards against re-seeding on every render/reconnect for the same
  // session — only ever needs to run once per signed-in uid, and
  // ensureSeeded itself is already a no-op once real docs exist, but this
  // avoids firing the check at all beyond the first render for this user.
  const seededFor = useRef<string | null>(null)

  useEffect(() => {
    if (user && seededFor.current !== user.uid) {
      seededFor.current = user.uid
      ensureSeeded(user.uid)
    }
  }, [user])

  if (loading) return null

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-5">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="font-serif text-2xl">
            <span className="italic">next</span> <span className="font-semibold">chapter</span>
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">
            Sign in to sync your library across your devices.
          </p>
          <Button onClick={() => signIn()} className="h-11 rounded-full px-6 text-[14px] font-semibold">
            Sign in with Google
          </Button>
        </div>
      </div>
    )
  }

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
