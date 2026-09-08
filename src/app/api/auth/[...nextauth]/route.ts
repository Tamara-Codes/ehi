import { handlers } from "@/auth";

// Auth.js needs to handle several URLs under /api/auth/* (sign in, sign out,
// callback, session check, etc). Exporting these two lets Next.js route all
// of them to Auth.js automatically, for both GET and POST requests.
export const { GET, POST } = handlers;
