import { config } from "dotenv";

// Next.js loads .env.local automatically, so under the real app this
// import is a no-op — dotenv never overwrites a process.env value that's
// already set. It only actually does something for standalone scripts run
// via `tsx` (seed/check scripts), which don't get Next.js's env loading for
// free. One shared module instead of the same guard duplicated in every
// file that might be run standalone (db/client.ts, storage.ts, webpush.ts
// used to each carry their own copy, keyed on a different env var as their
// "have we loaded yet?" signal — consolidated here so there's one place to
// fix if the loading strategy ever needs to change).
config({ path: ".env.local" });
