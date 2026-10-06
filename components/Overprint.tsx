/** Words printed twice in pink and blue, slightly off-register, like a riso flyer. */
export function Overprint({
  as: Tag = "span",
  className = "",
  children,
}: {
  as?: "h1" | "h2" | "span";
  className?: string;
  children: string;
}) {
  return (
    <Tag className={`overprint ${className}`}>
      <span className="ink-pink" aria-hidden="true">
        {children}
      </span>
      <span className="ink-blue">{children}</span>
    </Tag>
  );
}
