// Every "who can see / change what" decision lives here, so the rule is easy to find.
import type { User } from "./auth";

export type Status = "live" | "funded" | "missed";

export type ProjectCore = {
  creator_id: number;
  goal_cents: number;
  deadline: Date;
};

export function isOpen(project: ProjectCore, now = new Date()) {
  return project.deadline.getTime() > now.getTime();
}

/** All-or-nothing: funded only if the goal was reached by the deadline. */
export function statusOf(project: ProjectCore, totalCents: number, now = new Date()): Status {
  if (isOpen(project, now)) return "live";
  return totalCents >= project.goal_cents ? "funded" : "missed";
}

/** THE rule: only the creator (or the superadmin) sees who chipped in and how much. */
export function canSeeBackers(viewer: User, project: ProjectCore) {
  return viewer.is_admin || viewer.id === project.creator_id;
}

/** You can't back your own project, and pledges close at the deadline. */
export function canPledge(viewer: User, project: ProjectCore) {
  return viewer.id !== project.creator_id && isOpen(project);
}

/** Creators can edit until the deadline; the superadmin can always edit. */
export function canEditProject(viewer: User, project: ProjectCore) {
  return viewer.is_admin || (viewer.id === project.creator_id && isOpen(project));
}

export const MAX_AMIGOS = 10;
