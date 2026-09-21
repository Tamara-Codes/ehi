import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { getAllSites } from "@/lib/repositories/sites.repo";
import { EnablePushButton } from "@/components/EnablePushButton";
import { ReportForm } from "@/components/ReportForm";

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

  // Every active worker can pick from every site — there's no per-worker
  // assignment anymore, matching how the site pills already worked in
  // practice: whichever gradilište is relevant today, pick it and go.
  const sites = await getAllSites();

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
            Još nema dodanih gradilišta. Obratite se administratoru.
          </div>
        ) : (
          <ReportForm sites={sites} />
        )}
      </main>
    </div>
  );
}
