import { requireAdmin } from "@/lib/auth-guards";
import { getNotificationSettings } from "@/lib/services/admin.service";
import { setNotificationScheduleAction } from "../actions";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = ["00", "15", "30", "45"];

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

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getNotificationSettings();
  // notificationTime comes back as "HH:MM:SS" from Postgres.
  const [currentHour, currentMinute] = settings.notificationTime.slice(0, 5).split(":");
  const activeDays = new Set(settings.notifyDays);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Postavke</h1>

      <form action={setNotificationScheduleAction} className="card flex flex-col gap-4">
        <div>
          <label className="field-label">Vrijeme dnevne obavijesti za radnike</label>
          <p className="mb-3 text-xs text-muted">
            U ovo vrijeme, na odabrane dane, radnici će dobiti podsjetnik za unos dnevnog
            izvještaja.
          </p>
          <div className="flex items-center gap-2">
            <select name="hour" defaultValue={currentHour} className="field-select w-auto">
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-muted">:</span>
            <select
              name="minute"
              defaultValue={MINUTES.includes(currentMinute) ? currentMinute : "00"}
              className="field-select w-auto"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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

        <button
          type="submit"
          className="btn-secondary self-start bg-brand text-white hover:bg-brand-hover"
        >
          Spremi
        </button>
      </form>
    </div>
  );
}
