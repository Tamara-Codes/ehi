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
    <div className="mx-auto max-w-3xl p-6">
      <nav className="mb-6 flex gap-4 border-b border-zinc-200 pb-3 text-sm font-medium">
        <Link href="/admin">Unosi</Link>
        <Link href="/admin/team">Radnici i gradilišta</Link>
        <Link href="/admin/settings">Postavke</Link>
        <Link href="/" className="ml-auto text-zinc-500">
          Natrag na aplikaciju
        </Link>
      </nav>
      {children}
    </div>
  );
}
