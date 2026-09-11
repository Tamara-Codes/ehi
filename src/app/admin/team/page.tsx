import { requireAdmin } from "@/lib/auth-guards";
import { getWorkers, getSites } from "@/lib/services/admin.service";
import { addWorkerAction, toggleWorkerStatusAction, addSiteAction } from "../actions";

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
            <div key={worker.id} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{worker.name}</p>
                <p className="text-xs text-muted">
                  {worker.email} · <StatusBadge status={worker.status} />
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
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Gradilišta</h2>
        <p className="mb-3 text-xs text-muted">
          Svaki radnik sam bira gradilište u aplikaciji — ovdje samo upravljate popisom.
        </p>
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
