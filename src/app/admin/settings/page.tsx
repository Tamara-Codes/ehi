import { requireAdmin } from "@/lib/auth-guards";
import { getSchedules } from "@/lib/services/admin.service";
import { addScheduleAction, editScheduleAction, deleteScheduleAction } from "../actions";
import { CustomSelect } from "@/components/CustomSelect";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: pad(i) }));
const MINUTES = ["00", "15", "30", "45"].map((m) => ({ value: m, label: m }));

// value matches JS Date.getDay() (0=Sunday..6=Saturday); displayed
// Monday-first to match the rest of the app's calendar convention.
const DAYS = [
  { value: 1, label: "Pon" },
  { value: 2, label: "Uto" },
  { value: 3, label: "Sri" },
  { value: 4, label: "Čet" },
  { value: 5, label: "Pet" },
  { value: 6, label: "Sub" },
  { value: 0, label: "Ned" },
];

type ScheduleValues = {
  message?: string;
  notificationTime?: string;
  notifyDays?: number[];
};

function ScheduleFields({ schedule }: { schedule?: ScheduleValues }) {
  const [currentHour, currentMinute] = (schedule?.notificationTime ?? "16:00:00")
    .slice(0, 5)
    .split(":");
  const activeDays = new Set(schedule?.notifyDays ?? [1, 2, 3, 4, 5, 6, 0]);

  return (
    <>
      <div>
        <label className="field-label">Poruka obavijesti</label>
        <textarea
          name="message"
          required
          rows={2}
          defaultValue={schedule?.message}
          placeholder="npr. Ne zaboravite upisati što ste danas radili."
          className="field-input resize-none"
        />
      </div>

      <div>
        <label className="field-label">Vrijeme</label>
        <div className="flex items-center gap-2">
          <CustomSelect name="hour" options={HOURS} defaultValue={currentHour} />
          <span className="text-muted">:</span>
          <CustomSelect
            name="minute"
            options={MINUTES}
            defaultValue={MINUTES.some((m) => m.value === currentMinute) ? currentMinute : "00"}
          />
        </div>
      </div>

      <div>
        <label className="field-label">Dani u tjednu</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label
              key={day.value}
              className="pill has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="days"
                value={day.value}
                defaultChecked={activeDays.has(day.value)}
                className="sr-only"
              />
              {day.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const schedules = await getSchedules();
  const { saved } = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-semibold">Postavke</h1>
        <p className="mt-1 text-sm text-muted">
          Dodajte koliko god želite podsjetnika za radnike — svaki sa svojom porukom, vremenom i
          danima.
        </p>
      </div>

      {saved && (
        <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          ✓ Postavke spremljene.
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted uppercase">Nova obavijest</h2>
        <form action={addScheduleAction} className="card flex flex-col gap-4">
          <ScheduleFields />
          <button
            type="submit"
            className="btn-secondary self-start bg-brand text-white hover:bg-brand-hover"
          >
            Dodaj obavijest
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted uppercase">Postojeće obavijesti</h2>

        {schedules.length === 0 && (
          <p className="text-sm text-muted">Još nema dodanih obavijesti.</p>
        )}

        <div className="flex flex-col gap-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="card flex flex-col gap-4">
              <form action={editScheduleAction} className="flex flex-col gap-4">
                <input type="hidden" name="scheduleId" value={schedule.id} />
                <ScheduleFields schedule={schedule} />
                <button
                  type="submit"
                  className="btn-secondary self-start bg-brand text-white hover:bg-brand-hover"
                >
                  Spremi
                </button>
              </form>

              <form action={deleteScheduleAction} className="self-start">
                <input type="hidden" name="scheduleId" value={schedule.id} />
                <ConfirmSubmitButton
                  confirmMessage="Obrisati ovu obavijest?"
                  className="text-xs text-muted hover:text-foreground"
                >
                  Ukloni obavijest
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
