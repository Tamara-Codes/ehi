import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Redundant with the check in each page below, deliberately — the docs'
  // own guidance is that a layout check alone isn't sufficient (it doesn't
  // re-run on client-side navigation between sibling pages), so each page
  // still checks independently. This one just avoids rendering the nav
  // shell at all for a non-admin who lands here directly.
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              EHI Babić
            </p>
            <h1 className="text-base font-semibold">Admin</h1>
          </div>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Natrag na aplikaciju
          </Link>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-6">
          <AdminNavLink href="/admin">Unosi</AdminNavLink>
          <AdminNavLink href="/admin/team">Radnici i gradilišta</AdminNavLink>
          <AdminNavLink href="/admin/settings">Postavke</AdminNavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}

function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-foreground"
    >
      {children}
    </Link>
  );
}
