import { useState } from "react"

const GRADIENTS = [
  "linear-gradient(155deg, #7C2F49, #A24361 60%, #C97A93)",
  "linear-gradient(155deg, #5A2438, #8B3E58 60%, #B5637A)",
  "linear-gradient(155deg, #6B2E44, #A24361 55%, #E0A9BA)",
  "linear-gradient(155deg, #4A2030, #7C2F49 60%, #A2637A)",
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

interface BookCoverProps {
  id: string
  title: string
  author: string
  isbn?: string
  coverId?: number
  coverUrl?: string
}

/**
 * Real covers when we have a source, the designed gradient card otherwise.
 * `coverUrl` (Hardcover-sourced external books) wins when present — real
 * edition art, no quality gate needed. The `coverId`/`isbn` Open Library
 * fallback stays for local-library books (CSV imports only ever have an
 * ISBN), where crowdsourced scan quality varies enough that a loaded image
 * still gets checked against a minimum pixel size.
 */
export function BookCover({ id, title, author, isbn, coverId, coverUrl }: BookCoverProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const gradient = GRADIENTS[hashId(id) % GRADIENTS.length]

  const isOpenLibraryFallback = !coverUrl
  const coverSrc =
    coverUrl ??
    (coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`
      : isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
        : null)

  if (coverSrc && !imgFailed) {
    return (
      <div className="flex h-[156px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary shadow-lg">
        <img
          src={coverSrc}
          alt={`Portada de ${title}`}
          onError={() => setImgFailed(true)}
          onLoad={(e) => {
            if (!isOpenLibraryFallback) return
            const img = e.currentTarget
            if (img.naturalWidth < 120 || img.naturalHeight < 160) setImgFailed(true)
          }}
          className="h-full w-full object-contain"
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-[156px] w-[104px] shrink-0 flex-col justify-between rounded-lg p-2.5 shadow-lg"
      style={{ background: gradient }}
    >
      <p className="text-balance font-serif text-[13px] leading-tight font-semibold text-white">{title}</p>
      <p className="text-[9px] tracking-wide text-white/75 uppercase">{author}</p>
    </div>
  )
}
