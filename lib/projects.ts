import "server-only";
import { db } from "./db";
import type { User } from "./auth";
import { canSeeBackers, statusOf, type Status } from "./rules";

export type ProjectSummary = {
  id: number;
  title: string;
  description: string;
  goal_cents: number;
  deadline: Date;
  creator_id: number;
  creator_name: string;
  total_cents: number;
  backer_count: number;
  my_pledge_cents: number | null;
  status: Status;
};

export type Backer = { name: string; amount_cents: number; updated_at: Date };

export type ProjectDetail = ProjectSummary & {
  /** null means "you are not allowed to see this", never "no backers". */
  backers: Backer[] | null;
};

type Row = Omit<ProjectSummary, "status">;

function withStatus(row: Row): ProjectSummary {
  return { ...row, status: statusOf(row, row.total_cents) };
}

/** Totals are public; only the viewer's own pledge amount is attached. */
export async function listProjects(viewer: User): Promise<ProjectSummary[]> {
  const rows = await db()<Row[]>`
    select p.id, p.title, p.description, p.goal_cents, p.deadline, p.creator_id,
           u.display_name as creator_name,
           coalesce(sum(pl.amount_cents), 0) as total_cents,
           count(pl.id) as backer_count,
           max(pl.amount_cents) filter (where pl.backer_id = ${viewer.id}) as my_pledge_cents
    from projects p
    join users u on u.id = p.creator_id
    left join pledges pl on pl.project_id = p.id
    group by p.id, u.display_name
    order by (p.deadline > now()) desc,
             case when p.deadline > now() then p.deadline end asc,
             p.deadline desc`;
  return rows.map(withStatus);
}

export async function getProject(id: number, viewer: User): Promise<ProjectDetail | null> {
  const [row] = await db()<Row[]>`
    select p.id, p.title, p.description, p.goal_cents, p.deadline, p.creator_id,
           u.display_name as creator_name,
           coalesce(sum(pl.amount_cents), 0) as total_cents,
           count(pl.id) as backer_count,
           max(pl.amount_cents) filter (where pl.backer_id = ${viewer.id}) as my_pledge_cents
    from projects p
    join users u on u.id = p.creator_id
    left join pledges pl on pl.project_id = p.id
    where p.id = ${id}
    group by p.id, u.display_name`;
  if (!row) return null;

  const project = withStatus(row);
  // The privacy rule is applied at the query: names never leave the database
  // for anyone who isn't the creator or the superadmin.
  const backers = canSeeBackers(viewer, project)
    ? await db()<Backer[]>`
        select u.display_name as name, pl.amount_cents, pl.updated_at
        from pledges pl join users u on u.id = pl.backer_id
        where pl.project_id = ${id}
        order by pl.amount_cents desc, pl.updated_at asc`
    : null;

  return { ...project, backers };
}
