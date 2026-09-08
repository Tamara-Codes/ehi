import { auth, signIn, signOut } from "@/auth";
import { submitEntryAction } from "./actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  const { saved } = await searchParams;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>Not logged in.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="rounded bg-orange-500 px-4 py-2 text-white"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dnevnik radova</h1>
          <p className="text-sm text-zinc-500">{session.user.email}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button type="submit" className="text-sm text-zinc-500 underline">
            Odjava
          </button>
        </form>
      </div>

      {saved && (
        <p className="rounded bg-green-100 px-3 py-2 text-sm text-green-800">
          Unos spremljen.
        </p>
      )}

      <form action={submitEntryAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="images" className="mb-1 block text-sm font-medium">
            Slike
          </label>
          <input
            id="images"
            name="images"
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="w-full text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">Do 6 slika, do 8MB svaka.</p>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Što ste danas radili?
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            className="w-full rounded border border-zinc-300 p-2"
          />
        </div>

        <ToggleRow name="materialOnSite" label="Je li sav materijal na gradilištu?" />
        <ToggleRow name="hasExtraPaidWork" label="Ima li dodatnih radova za naplatu?" />
        <ToggleRow name="hasProblems" label="Problemi ili zastoji?" />
        <ToggleRow name="needsOrder" label="Treba li nešto naručiti?" />

        <button
          type="submit"
          className="mt-2 rounded bg-orange-500 px-4 py-3 font-medium text-white"
        >
          Spremi
        </button>
      </form>
    </div>
  );
}

function ToggleRow({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <input type="checkbox" name={name} className="h-5 w-5" />
    </label>
  );
}
