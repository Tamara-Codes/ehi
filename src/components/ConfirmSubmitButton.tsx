"use client";

// A plain <button type="submit"> can't ask "are you sure?" first — that
// needs a client-side confirm(), which is why this one small piece needs
// "use client" while the form/action around it stays a normal server
// action. Used for destructive, irreversible actions (delete, not
// deactivate/toggle, which are safely reversible without this).
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { confirmMessage: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
