import { auth, signIn, signOut } from "@/auth";

// Temporary test page — just to prove Google login + our allowlist logic
// work end-to-end before we build the real worker/admin UI.
export default async function Home() {
  const session = await auth();

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p>Logged in as {session.user.email}</p>
      <p>Role: {session.user.role}</p>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button
          type="submit"
          className="rounded border px-4 py-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
