import type { Status } from "@/lib/rules";

const LABELS: Record<Status, string> = { live: "Live", funded: "Funded!", missed: "Missed it" };

export function Stamp({ status }: { status: Status }) {
  return <span className={`stamp stamp-${status}`}>{LABELS[status]}</span>;
}
