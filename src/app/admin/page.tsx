import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import {
  getEntryCountsForCalendarMonth,
  getEntriesForDay,
} from "@/lib/services/admin.service";
import { ImageGallery } from "@/components/ImageGallery";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

const WEEKDAY_LABELS = ["P", "U", "S", "Č", "P", "S", "N"];

export default async function AdminEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const now = new Date();
  const [year, month] = params.month
    ? params.month.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const selectedDate =
    params.date ?? toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const [counts, entries] = await Promise.all([
    getEntryCountsForCalendarMonth(year, month),
    getEntriesForDay(selectedDate),
  ]);

  // Calendar grid math. JS's Date.getDay() returns 0=Sunday..6=Saturday; our
  // grid wants Monday-first columns, so we shift it: 0=Monday..6=Sunday.
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = new Date(year, month - 2, 1);
  const nextMonth = new Date(year, month, 1);
  const monthLabel = firstOfMonth.toLocaleDateString("hr-HR", {
    month: "long",
    year: "numeric",
  });

  const dayLabel = new Date(selectedDate).toLocaleDateString("hr-HR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/admin?month=${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}&date=${selectedDate}`}
            className="rounded-lg px-2 py-1 text-muted hover:bg-background hover:text-foreground"
          >
            ‹
          </Link>
          <h1 className="text-base font-semibold capitalize">{monthLabel}</h1>
          <Link
            href={`/admin?month=${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}&date=${selectedDate}`}
            className="rounded-lg px-2 py-1 text-muted hover:bg-background hover:text-foreground"
          >
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="py-1 text-xs font-medium text-muted">
              {label}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = toISODate(year, month, day);
            const count = counts[dateStr] ?? 0;
            const isSelected = dateStr === selectedDate;
            return (
              <Link
                key={i}
                href={`/admin?month=${year}-${pad(month)}&date=${dateStr}`}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-sm transition-colors ${
                  isSelected ? "bg-foreground text-white" : "hover:bg-background"
                }`}
              >
                <span>{day}</span>
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold ${
                    count > 0
                      ? isSelected
                        ? "bg-white text-foreground"
                        : "bg-brand text-white"
                      : "invisible"
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted uppercase">
          {dayLabel} · {entries.length} {entries.length === 1 ? "unos" : "unosa"}
        </h2>

        {entries.length === 0 && (
          <p className="text-sm text-muted">Nema unosa za odabrani dan.</p>
        )}

        <div className="flex flex-col gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className="card">
              <div className="flex items-center justify-between text-sm text-muted">
                <span className="font-medium text-foreground">
                  {entry.workerName} <span className="font-normal text-muted">· {entry.siteName}</span>
                </span>
              </div>
              <p className="mt-2 text-sm">{entry.description}</p>

              <div className="mt-3">
                {entry.materialOnSite ? (
                  <Tag label="Materijal na gradilištu" />
                ) : (
                  <NoteLine label="Nedostaje materijal" note={entry.materialMissingNote} tone="warn" />
                )}
              </div>

              {(entry.hasExtraPaidWork || entry.hasProblems || entry.needsOrder) && (
                <div className="mt-3 flex flex-col gap-2">
                  {entry.hasExtraPaidWork && (
                    <NoteLine label="Dodatni radovi za naplatu" note={entry.extraPaidWorkNote} />
                  )}
                  {entry.hasProblems && (
                    <NoteLine label="Problemi ili zastoji" note={entry.problemsNote} tone="warn" />
                  )}
                  {entry.needsOrder && (
                    <NoteLine label="Treba naručiti" note={entry.orderNote} tone="warn" />
                  )}
                </div>
              )}

              {entry.media.length > 0 && <ImageGallery media={entry.media} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tag({ label, tone = "default" }: { label: string; tone?: "default" | "warn" }) {
  return <span className={tone === "warn" ? "tag-warn" : "tag"}>{label}</span>;
}

function NoteLine({
  label,
  note,
  tone = "default",
}: {
  label: string;
  note: string | null;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag label={label} tone={tone} />
      {note && <span className="text-sm text-foreground">{note}</span>}
    </div>
  );
}
