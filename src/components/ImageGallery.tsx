"use client";

import { useEffect, useState } from "react";

type MediaItem = { url: string; kind: "image" | "video" };

// Thumbnails need a click handler and the full-screen view needs open/close
// state, neither of which a server-rendered admin page can do on its own —
// this is why this one piece is a Client Component while the rest of the
// admin dashboard stays server-rendered.
export function ImageGallery({ media }: { media: MediaItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : (i - 1 + media.length) % media.length));
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % media.length));
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [openIndex, media.length]);

  return (
    <>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {media.map((item, i) => (
          <button
            key={item.url}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative shrink-0 cursor-zoom-in"
            aria-label={item.kind === "video" ? "Prikaži video" : "Prikaži sliku u punoj veličini"}
          >
            {item.kind === "video" ? (
              <>
                {/* muted+playsInline: just for a live thumbnail frame, not
                    playback — clicking opens the full-screen view instead. */}
                <video
                  src={item.url}
                  muted
                  playsInline
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20 text-2xl text-white">
                  ▶
                </span>
              </>
            ) : (
              // Signed, short-lived R2 URLs aren't a fit for next/image's
              // remote optimizer allowlist; a plain <img> is correct here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Zatvori"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ×
          </button>

          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex - 1 + media.length) % media.length);
                }}
                aria-label="Prethodna stavka"
                className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex((openIndex + 1) % media.length);
                }}
                aria-label="Sljedeća stavka"
                className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-4"
              >
                ›
              </button>
            </>
          )}

          {media[openIndex].kind === "video" ? (
            <video
              src={media[openIndex].url}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media[openIndex].url}
              alt=""
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {media.length > 1 && (
            <p className="absolute bottom-4 text-sm text-white/70">
              {openIndex + 1} / {media.length}
            </p>
          )}
        </div>
      )}
    </>
  );
}
