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
                    // No `capture` attribute: with it set, some Android
                    // browsers open the camera directly and skip the
                    // option to attach an existing photo from the
                    // gallery. Omitting it lets both Android and iOS show
                    // their normal picker (camera or library).
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
              <ToggleRow
                name="materialOnSite"
                label="Je li sav materijal na gradilištu?"
                defaultChecked
                noteName="materialMissingNote"
                notePlaceholder="Što nedostaje?"
                noteWhen="unchecked"
              />
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
  defaultChecked = false,
  noteWhen = "checked",
}: {
  name: string;
  label: string;
  noteName?: string;
  notePlaceholder?: string;
  defaultChecked?: boolean;
  noteWhen?: "checked" | "unchecked";
}) {
  // Most toggles reveal their note when switched ON (e.g. "problems?" ->
  // describe the problem). materialOnSite is the opposite: its "good"
  // state is ON, so its note ("what's missing?") only makes sense when
  // it's OFF — noteWhen picks which CSS variant combination applies.
  //
  // Both branches use the same "hidden by default, reveal via variant"
  // shape rather than the mirror image ("visible by default, hide via
  // variant") — the latter rendered as a zero-height box in testing, so
  // stick with the one actually proven to work. For the "unchecked" case,
  // :not(:checked) must be scoped to input[type=checkbox] specifically —
  // scoping it to just "input" still isn't enough, because the note field
  // *itself* is an <input> and a descendant of .group, and a text input
  // trivially satisfies :not(:checked) too (that pseudo-class isn't limited
  // to checkboxes) — so :has(input:not(:checked)) matched unconditionally,
  // against itself, regardless of the toggle's real state. Scoping to the
  // checkbox's actual type excludes the note field from the match.
  const noteVisibilityClass =
    noteWhen === "checked"
      ? "hidden group-has-[:checked]:block"
      : "hidden group-has-[input[type=checkbox]:not(:checked)]:block";

  return (
    // "group" here is what lets the note input below react to this
    // toggle's checked state via group-has-[:checked]: — pure CSS, no
    // client-side JavaScript needed to show/hide it.
    <div className="group py-3 first:pt-0 last:pb-0">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-sm">{label}</span>
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-border transition-colors has-[:checked]:bg-accent">
          <input
            type="checkbox"
            name={name}
            defaultChecked={defaultChecked}
            className="peer sr-only"
          />
          <span className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
        </span>
      </label>
      {noteName && (
        <input
          type="text"
          name={noteName}
          placeholder={notePlaceholder}
          className={`field-input mt-2 ${noteVisibilityClass}`}
        />
      )}
    </div>
  );
}
