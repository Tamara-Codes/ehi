import { requireAdmin } from "@/lib/auth-guards";
import { getWorkers, getSites } from "@/lib/services/admin.service";
import {
  addWorkerAction,
  toggleWorkerStatusAction,
  deleteWorkerAction,
  addSiteAction,
  deleteSiteAction,
} from "../actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [workers, sites] = await Promise.all([getWorkers(), getSites()]);
  const { error } = await searchParams;

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
            <div
              key={worker.id}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium">{worker.name}</p>
                <p className="text-xs text-muted break-all">{worker.email}</p>
                <StatusBadge status={worker.status} />
              </div>
              <div className="flex items-center gap-3">
                <form action={deleteWorkerAction}>
                  <input type="hidden" name="userId" value={worker.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Obrisati radnika ${worker.name}? Ova radnja se ne može poništiti.`}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Ukloni
                  </ConfirmSubmitButton>
                </form>
                <form action={toggleWorkerStatusAction}>
                  <input type="hidden" name="userId" value={worker.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={worker.status === "active" ? "inactive" : "active"}
                  />
                  <button type="submit" className="btn-secondary w-full sm:w-auto">
                    {worker.status === "active" ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Gradilišta</h2>
        <p className="mb-3 text-xs text-muted">
          Svaki radnik sam bira gradilište u aplikaciji — ovdje samo upravljate popisom.
        </p>

        {error && (
          <div className="mb-3 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

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

        <div className="card flex flex-col divide-y divide-border">
          {sites.length === 0 && (
            <p className="text-sm text-muted">Još nema dodanih gradilišta.</p>
          )}
          {sites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-sm">{site.name}</span>
              <form action={deleteSiteAction}>
                <input type="hidden" name="siteId" value={site.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Obrisati gradilište "${site.name}"?`}
                  className="text-xs text-muted hover:text-foreground"
                  aria-label={`Ukloni ${site.name}`}
                >
                  Ukloni
                </ConfirmSubmitButton>
              </form>
            </div>
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
  const className =
    status === "active"
      ? "w-fit rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
      : status === "inactive"
        ? "tag-warn w-fit"
        : "tag w-fit";
  return <span className={className}>{labels[status] ?? status}</span>;
}
