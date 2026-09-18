"use client";

import { useFormStatus } from "react-dom";

// useFormStatus only reports the status of the nearest parent <form>, so
// this must be rendered as a descendant of the form it submits — it can't
// read that status from the page component itself (a Server Component).
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
