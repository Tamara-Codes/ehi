"use client";

import { useEffect, useId, useState } from "react";

// A native window.confirm() works, but it's a plain OS-styled dialog with
// zero design control (shows the raw domain name, can't be themed) — this
// is a fully custom replacement. It renders inside the same <form> as the
// trigger button (position:fixed only affects visual layout, not DOM
// placement), so the modal's own "Obriši" button — a real type="submit" —
// still submits that form normally, no extra wiring needed.
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { confirmMessage: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} {...props}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="card w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p id={titleId} className="text-sm">
              {confirmMessage}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                Odustani
              </button>
              <button type="submit" className="btn-danger">
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
