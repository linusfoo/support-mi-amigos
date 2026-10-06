"use client";

/** A submit button that asks before doing something that can't be undone. */
export function ConfirmButton({
  question,
  children,
  className = "btn btn-danger",
}: {
  question: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(question)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
