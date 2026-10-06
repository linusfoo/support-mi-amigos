import { dollars } from "@/lib/format";

export function Meter({ total, goal, label }: { total: number; goal: number; label: string }) {
  const pct = Math.round((total / goal) * 100);
  const width = `${Math.min(pct, 100)}%`;
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(pct, 100)}
      aria-valuetext={`${dollars(total)} of ${dollars(goal)}, ${pct}% funded`}
    >
      {pct > 0 && (
        <>
          <span className="fill-pink" style={{ width }} />
          <span className="fill-blue" style={{ width }} />
        </>
      )}
    </div>
  );
}
