"use client";

import { useEffect, useRef, useState } from "react";

// A native <select>'s closed state can be styled with CSS, but the open
// dropdown list itself is rendered entirely by the OS/browser — no amount
// of CSS can restyle it (this is true even on iOS Safari, which gives zero
// control over it). This component is a fully custom replacement: a
// styled button plus a styled list we control completely, backed by a
// hidden <input> so it still works with plain <form action={...}> /
// FormData submission exactly like a real <select> would.

export type SelectOption = { value: string; label: string };

export function CustomSelect({
  name,
  options,
  defaultValue,
  size = "default",
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const triggerClass = size === "sm" ? "field-select-sm" : "field-select";

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${triggerClass} text-left`}
      >
        {selected?.label ?? ""}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full min-w-max overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => {
                  setValue(option.value);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-background ${
                  option.value === value ? "bg-background font-medium text-brand" : ""
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
