import { requireAdmin } from "@/lib/auth-guards";
import { getNotificationSettings } from "@/lib/services/admin.service";
import { setNotificationTimeAction } from "../actions";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getNotificationSettings();
  // notificationTime comes back as "HH:MM:SS" from Postgres; <input type="time">
  // wants "HH:MM".
  const currentTime = settings.notificationTime.slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Postavke</h1>

      <form action={setNotificationTimeAction} className="card flex flex-col gap-3">
        <div>
          <label htmlFor="time" className="field-label">
            Vrijeme dnevne obavijesti za radnike
          </label>
          <p className="mb-3 text-xs text-muted">
            Svakog dana u ovo vrijeme radnici će dobiti podsjetnik za unos dnevnog izvještaja.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            id="time"
            name="time"
            type="time"
            defaultValue={currentTime}
            required
            className="field-input w-auto"
          />
          <button type="submit" className="btn-secondary bg-brand text-white hover:bg-brand-hover">
            Spremi
          </button>
        </div>
      </form>
    </div>
  );
}
