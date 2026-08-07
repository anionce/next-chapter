import { Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { HomePage } from "@/pages/HomePage"
import { MoodPage } from "@/pages/MoodPage"
import { GenrePage } from "@/pages/GenrePage"
import { FiltersPage } from "@/pages/FiltersPage"
import { LibraryPage } from "@/pages/LibraryPage"
import { ResultPage } from "@/pages/ResultPage"

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="mood" element={<MoodPage />} />
        <Route path="genre" element={<GenrePage />} />
        <Route path="filters" element={<FiltersPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="result" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
