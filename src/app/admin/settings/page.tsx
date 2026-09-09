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

      <form action={setNotificationTimeAction} className="flex flex-col gap-2">
        <label htmlFor="time" className="text-sm font-medium">
          Vrijeme dnevne obavijesti za radnike
        </label>
        <div className="flex gap-2">
          <input
            id="time"
            name="time"
            type="time"
            defaultValue={currentTime}
            required
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-3 py-1 text-sm font-medium text-white"
          >
            Spremi
          </button>
        </div>
      </form>
    </div>
  );
}
