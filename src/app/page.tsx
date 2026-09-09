import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { submitEntryAction } from "./actions";
import { getSitesForUser } from "@/lib/repositories/sites.repo";
import { EnablePushButton } from "@/components/EnablePushButton";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  const { saved } = await searchParams;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-muted uppercase">
            EHI Babić
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Dnevnik radova</h1>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button type="submit" className="btn-primary">
            Prijava putem Googlea
          </button>
        </form>
      </div>
    );
  }

  const sites = await getSitesForUser(session.user.id);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              EHI Babić
            </p>
            <h1 className="text-base font-semibold">Dnevnik radova</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            {session.user.role === "admin" && (
              <Link href="/admin" className="font-medium text-foreground hover:text-brand">
                Admin
              </Link>
            )}
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button type="submit" className="hover:text-foreground">
                Odjava
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
        {saved && (
          <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
            ✓ Unos spremljen.
          </div>
        )}

        <EnablePushButton />

        {sites.length === 0 ? (
          <div className="card text-sm text-muted">
            Nemate dodijeljeno gradilište. Obratite se administratoru.
          </div>
        ) : (
          <form action={submitEntryAction} className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {sites.map((site, i) => (
                <label
                  key={site.id}
                  className="pill has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-white"
                >
                  <input
                    type="radio"
                    name="siteId"
                    value={site.id}
                    defaultChecked={i === 0}
                    required
                    className="sr-only"
                  />
                  {site.name}
                </label>
              ))}
            </div>

            <div className="card flex flex-col gap-4">
              <div>
                <label htmlFor="images" className="field-label">
                  Slike
                </label>
                <div className="rounded-xl border-2 border-dashed border-border p-4 text-center transition-colors has-[:hover]:border-brand">
                  <input
                    id="images"
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border"
                  />
                  <p className="mt-2 text-xs text-muted">Do 6 slika, do 8MB svaka.</p>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="field-label">
                  Što ste danas radili?
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={5}
                  className="field-input resize-none"
                />
              </div>
            </div>

            <div className="card flex flex-col divide-y divide-border">
              <ToggleRow name="materialOnSite" label="Je li sav materijal na gradilištu?" />
              <ToggleRow
                name="hasExtraPaidWork"
                label="Ima li dodatnih radova za naplatu?"
                noteName="extraPaidWorkNote"
                notePlaceholder="Koji dodatni radovi?"
              />
              <ToggleRow
                name="hasProblems"
                label="Problemi ili zastoji?"
                noteName="problemsNote"
                notePlaceholder="Kakav problem?"
              />
              <ToggleRow
                name="needsOrder"
                label="Treba li nešto naručiti?"
                noteName="orderNote"
                notePlaceholder="Što treba naručiti?"
              />
            </div>

            <button type="submit" className="btn-primary">
              Spremi
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function ToggleRow({
  name,
  label,
  noteName,
  notePlaceholder,
}: {
  name: string;
  label: string;
  noteName?: string;
  notePlaceholder?: string;
}) {
  return (
    // "group" here is what lets the note textarea below react to this
    // toggle's checked state via group-has-[:checked]: — pure CSS, no
    // client-side JavaScript needed to show/hide it.
    <div className="group py-3 first:pt-0 last:pb-0">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-sm">{label}</span>
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-border transition-colors has-[:checked]:bg-accent">
          <input type="checkbox" name={name} className="peer sr-only" />
          <span className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
        </span>
      </label>
      {noteName && (
        <input
          type="text"
          name={noteName}
          placeholder={notePlaceholder}
          className="field-input mt-2 hidden group-has-[:checked]:block"
        />
      )}
    </div>
  );
}
