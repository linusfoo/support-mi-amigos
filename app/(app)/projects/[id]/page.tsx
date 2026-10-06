import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { canEditProject, canPledge, isOpen } from "@/lib/rules";
import { dollars, shortDate, timeLeft } from "@/lib/format";
import { pledge, withdrawPledge } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Meter } from "@/components/Meter";
import { Overprint } from "@/components/Overprint";
import { Stamp } from "@/components/Stamp";

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const viewer = await requireUser();
  const project = Number.isInteger(Number(id)) ? await getProject(Number(id), viewer) : null;
  if (!project) notFound();

  const mine = project.creator_id === viewer.id;
  const pct = Math.round((project.total_cents / project.goal_cents) * 100);
  const creatorName = mine ? "you" : project.creator_name;

  return (
    <article className="grid gap-10">
      <header className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted">
            <Link href="/">All projects</Link>
          </p>
          <Stamp status={project.status} />
        </div>
        <Overprint as="h1" className="text-[clamp(2.25rem,8vw,4rem)]">
          {project.title}
        </Overprint>
        <p className="text-muted">
          Started by {creatorName}. {isOpen(project) ? "Pledges close" : "Pledges closed"} {shortDate(project.deadline)}.
        </p>
      </header>

      <div className="grid gap-10 md:grid-cols-[1fr_260px]">
        <section className="grid content-start gap-6">
          <div className="grid gap-3">
            <p>
              <strong className="display text-[2.5rem] font-extrabold">{dollars(project.total_cents)}</strong>{" "}
              <span className="text-muted">of {dollars(project.goal_cents)} goal</span>
            </p>
            <Meter total={project.total_cents} goal={project.goal_cents} label="Funding progress" />
            <p className="flex flex-wrap gap-x-5 text-[0.95rem]">
              <span>{pct}% funded</span>
              <span>{project.backer_count === 1 ? "1 amigo chipped in" : `${project.backer_count} amigos chipped in`}</span>
              <span>{timeLeft(project.deadline)}</span>
            </p>
          </div>
          {project.description && <p className="max-w-[62ch] whitespace-pre-line">{project.description}</p>}
          {canEditProject(viewer, project) && (
            <p>
              <Link href={`/projects/${project.id}/edit`} className="btn">
                Edit project
              </Link>
            </p>
          )}
        </section>

        <aside className="grid content-start gap-4 border-t-2 border-ink pt-4 md:border-t-0 md:border-l-2 md:pt-0 md:pl-6">
          {mine ? (
            <p>
              This is your project. You can&apos;t back it yourself, but you&apos;re the only one who can see who did.
            </p>
          ) : canPledge(viewer, project) ? (
            <>
              <h2 className="text-xl font-bold">
                {project.my_pledge_cents != null ? `You're in for ${dollars(project.my_pledge_cents)}` : "Chip in"}
              </h2>
              <ActionForm
                action={pledge}
                submitLabel={project.my_pledge_cents != null ? "Change my pledge" : "Chip in"}
                pendingLabel="Saving…"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <label className="field">
                  <span>Amount in dollars</span>
                  <input
                    key={project.my_pledge_cents ?? "none"}
                    className="input"
                    name="amount"
                    inputMode="decimal"
                    defaultValue={project.my_pledge_cents != null ? project.my_pledge_cents / 100 : ""}
                    placeholder="25"
                    required
                  />
                  <small>Only {creatorName} sees your name and amount. Nobody pays until it&apos;s funded.</small>
                </label>
              </ActionForm>
              {project.my_pledge_cents != null && (
                <ActionForm
                  action={withdrawPledge}
                  submitLabel="Take back my pledge"
                  pendingLabel="Taking it back…"
                  variant="quiet"
                >
                  <input type="hidden" name="projectId" value={project.id} />
                </ActionForm>
              )}
            </>
          ) : (
            <p>
              Pledges closed on {shortDate(project.deadline)}.
              {project.my_pledge_cents != null && ` You chipped in ${dollars(project.my_pledge_cents)}.`}
            </p>
          )}
        </aside>
      </div>

      <section className="grid gap-3 border-t border-rule pt-6" aria-labelledby="backers">
        <h2 id="backers" className="text-2xl font-bold">
          Who chipped in
        </h2>
        {project.backers === null ? (
          <p className="text-muted">
            <span aria-hidden="true">🔒 </span>
            Only {project.creator_name} can see who chipped in and how much.
          </p>
        ) : project.backers.length === 0 ? (
          <p className="text-muted">No pledges yet. Share the link in the group chat.</p>
        ) : (
          <>
            <p className="text-[0.95rem] text-muted">
              {mine ? "Only you" : `Only ${project.creator_name} and the superadmin`} can see this list.
            </p>
            <table className="w-full max-w-md text-left">
              <thead className="text-[0.95rem] text-muted">
                <tr>
                  <th className="py-1 font-normal">Amigo</th>
                  <th className="py-1 text-right font-normal">Pledge</th>
                </tr>
              </thead>
              <tbody>
                {project.backers.map((b) => (
                  <tr key={b.name} className="border-t border-rule">
                    <td className="py-2 font-bold">{b.name}</td>
                    <td className="py-2 text-right tabular-nums">{dollars(b.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </article>
  );
}
