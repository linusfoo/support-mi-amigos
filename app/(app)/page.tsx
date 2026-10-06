import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { dollars, timeLeft } from "@/lib/format";
import { Meter } from "@/components/Meter";
import { Stamp } from "@/components/Stamp";

export default async function Home() {
  const viewer = await requireUser();
  const projects = await listProjects(viewer);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(2rem,6vw,3rem)] font-extrabold">What we&apos;re chipping in for</h1>
        <Link href="/projects/new" className="btn btn-primary">
          Start a project
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-lg text-muted">
          Nothing to fund yet. <Link href="/projects/new">Start the first project</Link>.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {projects.map((p) => {
            const pct = Math.round((p.total_cents / p.goal_cents) * 100);
            return (
              <li key={p.id} className="grid gap-3 border-b border-rule py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <h2 className="text-2xl font-bold">
                      <Link href={`/projects/${p.id}`} className="text-ink underline-offset-4 hover:underline">
                        {p.title}
                      </Link>
                    </h2>
                    <p className="text-[0.95rem] text-muted">
                      by {p.creator_id === viewer.id ? "you" : p.creator_name}
                    </p>
                  </div>
                  <Stamp status={p.status} />
                </div>
                <Meter total={p.total_cents} goal={p.goal_cents} label={`${p.title} funding`} />
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem]">
                  <span>
                    <strong className="display text-lg">{dollars(p.total_cents)}</strong> of {dollars(p.goal_cents)} (
                    {pct}%)
                  </span>
                  <span>{p.backer_count === 1 ? "1 amigo" : `${p.backer_count} amigos`}</span>
                  <span>{timeLeft(p.deadline)}</span>
                  {p.my_pledge_cents != null && (
                    <span className="font-bold text-blue">You chipped in {dollars(p.my_pledge_cents)}</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
