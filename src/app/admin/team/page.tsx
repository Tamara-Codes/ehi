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
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-4 text-lg font-semibold">Radnici</h1>

        <form action={addWorkerAction} className="card mb-4 flex flex-wrap gap-2 sm:flex-nowrap">
          <input name="name" placeholder="Ime" required className="field-input sm:w-40" />
          <input
            name="email"
            type="email"
            placeholder="Gmail adresa"
            required
            className="field-input flex-1"
          />
          <button type="submit" className="btn-secondary shrink-0 bg-brand text-white hover:bg-brand-hover">
            Dodaj
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {workers.length === 0 && (
            <p className="text-sm text-muted">Još nema dodanih radnika.</p>
          )}
          {workers.map((worker) => (
            <div key={worker.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{worker.name}</p>
                  <p className="text-xs text-muted">
                    {worker.email} ·{" "}
                    <StatusBadge status={worker.status} />
                  </p>
                </div>
                <form action={toggleWorkerStatusAction}>
                  <input type="hidden" name="userId" value={worker.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={worker.status === "active" ? "inactive" : "active"}
                  />
                  <button type="submit" className="btn-secondary">
                    {worker.status === "active" ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                </form>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {worker.sites.map((s) => (
                  <span key={s.siteId} className="tag flex items-center gap-1.5">
                    {s.siteName}
                    <form action={unassignSiteAction} className="inline">
                      <input type="hidden" name="userId" value={worker.id} />
                      <input type="hidden" name="siteId" value={s.siteId} />
                      <button
                        type="submit"
                        aria-label="Ukloni"
                        className="text-muted hover:text-foreground"
                      >
                        ×
                      </button>
                    </form>
                  </span>
                ))}

                <form action={assignSiteAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="userId" value={worker.id} />
                  <select name="siteId" required className="field-select-sm">
                    <option value="">+ gradilište</option>
                    {sites
                      .filter((s) => !worker.sites.some((ws) => ws.siteId === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                  <button type="submit" className="text-xs font-medium text-brand hover:text-brand-hover">
                    Dodaj
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Gradilišta</h2>
        <form action={addSiteAction} className="card mb-4 flex gap-2">
          <input
            name="name"
            placeholder="Naziv gradilišta"
            required
            className="field-input flex-1"
          />
          <button type="submit" className="btn-secondary shrink-0 bg-brand text-white hover:bg-brand-hover">
            Dodaj
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {sites.map((s) => (
            <span key={s.id} className="tag">
              {s.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    active: "aktivan",
    invited: "pozvan",
    inactive: "neaktivan",
  };
  return <span>{labels[status] ?? status}</span>;
}
