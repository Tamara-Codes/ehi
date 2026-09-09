import { requireAdmin } from "@/lib/auth-guards";
import { getWorkers, getSites } from "@/lib/services/admin.service";
import {
  addWorkerAction,
  toggleWorkerStatusAction,
  addSiteAction,
  assignSiteAction,
  unassignSiteAction,
} from "../actions";

export default async function TeamPage() {
  await requireAdmin();
  const [workers, sites] = await Promise.all([getWorkers(), getSites()]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-3 text-lg font-semibold">Radnici</h1>

        <form action={addWorkerAction} className="mb-4 flex gap-2">
          <input
            name="name"
            placeholder="Ime"
            required
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Gmail adresa"
            required
            className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-3 py-1 text-sm font-medium text-white"
          >
            Dodaj
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {workers.map((worker) => (
            <div key={worker.id} className="rounded border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{worker.name}</p>
                  <p className="text-xs text-zinc-500">
                    {worker.email} · {worker.status}
                  </p>
                </div>
                <form action={toggleWorkerStatusAction}>
                  <input type="hidden" name="userId" value={worker.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={worker.status === "active" ? "inactive" : "active"}
                  />
                  <button type="submit" className="text-xs text-zinc-500 underline">
                    {worker.status === "active" ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                </form>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {worker.sites.map((s) => (
                  <span
                    key={s.siteId}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs"
                  >
                    {s.siteName}
                    <form action={unassignSiteAction}>
                      <input type="hidden" name="userId" value={worker.id} />
                      <input type="hidden" name="siteId" value={s.siteId} />
                      <button type="submit" aria-label="Ukloni">
                        ×
                      </button>
                    </form>
                  </span>
                ))}

                <form action={assignSiteAction} className="flex items-center gap-1">
                  <input type="hidden" name="userId" value={worker.id} />
                  <select name="siteId" required className="rounded border border-zinc-300 text-xs">
                    <option value="">+ gradilište</option>
                    {sites
                      .filter((s) => !worker.sites.some((ws) => ws.siteId === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                  <button type="submit" className="text-xs text-zinc-500 underline">
                    Dodaj
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Gradilišta</h2>
        <form action={addSiteAction} className="mb-3 flex gap-2">
          <input
            name="name"
            placeholder="Naziv gradilišta"
            required
            className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-orange-500 px-3 py-1 text-sm font-medium text-white"
          >
            Dodaj
          </button>
        </form>
        <ul className="text-sm text-zinc-700">
          {sites.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
