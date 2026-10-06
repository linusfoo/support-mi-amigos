import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDeleteAmigo, canEditAmigo, canSetAdmin, MAX_AMIGOS } from "@/lib/rules";
import { createAmigo, deleteAmigo, updateAmigo } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata = { title: "Amigos · Support Mi Amigos" };

type Amigo = {
  id: number;
  username: string;
  display_name: string;
  is_admin: boolean;
  is_superadmin: boolean;
  projects: number;
  pledges: number;
};

export default async function AmigosPage() {
  const viewer = await requireAdmin();
  const amigos = await db()<Amigo[]>`
    select u.id, u.username, u.display_name, u.is_admin, u.is_superadmin,
           (select count(*) from projects p where p.creator_id = u.id) as projects,
           (select count(*) from pledges pl where pl.backer_id = u.id) as pledges
    from users u
    order by u.is_superadmin desc, u.is_admin desc, u.display_name`;
  const full = amigos.length >= MAX_AMIGOS;

  return (
    <div className="grid gap-10">
      <div className="grid gap-2">
        <h1 className="text-[clamp(2rem,6vw,3rem)] font-extrabold">Amigos</h1>
        <p className="text-muted">
          {amigos.length} of {MAX_AMIGOS} spots taken. Admins can add, change or remove regular amigos. Only the superadmin can manage admins.
        </p>
      </div>

      <ul className="border-t border-rule">
        {amigos.map((a) => (
          <li key={a.id} className="grid gap-3 border-b border-rule py-5">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-xl font-bold">{a.display_name}</h2>
              <span className="text-muted">@{a.username}</span>
              {a.is_superadmin ? (
                <span className="font-bold text-blue">Superadmin</span>
              ) : (
                a.is_admin && <span className="font-bold text-blue">Admin</span>
              )}
              <span className="text-[0.95rem] text-muted">
                {a.projects} {a.projects === 1 ? "project" : "projects"}, {a.pledges}{" "}
                {a.pledges === 1 ? "pledge" : "pledges"}
              </span>
            </div>
            {canEditAmigo(viewer, a) && (
              <details>
                <summary className="cursor-pointer text-blue underline underline-offset-4">Edit {a.display_name}</summary>
                <div className="mt-4 grid gap-4">
                  <ActionForm
                    action={updateAmigo}
                    submitLabel="Save amigo"
                    pendingLabel="Saving…"
                    variant="plain"
                    className="grid max-w-md gap-4"
                  >
                    <input type="hidden" name="id" value={a.id} />
                    <label className="field">
                      <span>Display name</span>
                      <input className="input" name="displayName" defaultValue={a.display_name} maxLength={40} required />
                    </label>
                    <label className="field">
                      <span>New password</span>
                      <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} />
                      <small>Leave empty to keep their current password. Resetting signs them out.</small>
                    </label>
                    {canSetAdmin(viewer, a) && (
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="isAdmin" defaultChecked={a.is_admin} />
                        Admin (can manage regular amigos)
                      </label>
                    )}
                  </ActionForm>
                  {canDeleteAmigo(viewer, a) && (
                    <form action={deleteAmigo}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton
                        question={`Remove ${a.display_name}? Their projects and pledges are deleted too.`}
                        className="btn btn-danger"
                      >
                        Remove {a.display_name}
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>

      <section className="grid gap-4" aria-labelledby="add">
        <h2 id="add" className="text-2xl font-bold">
          Add an amigo
        </h2>
        {full ? (
          <p className="text-muted">All {MAX_AMIGOS} spots are taken. Remove someone to make room.</p>
        ) : (
          <ActionForm action={createAmigo} submitLabel="Add amigo" pendingLabel="Adding…" className="grid max-w-md gap-4">
            <label className="field">
              <span>Username</span>
              <input
                className="input"
                name="username"
                autoCapitalize="none"
                pattern="[a-z0-9_]{3,20}"
                placeholder="ana"
                required
              />
              <small>3–20 lowercase letters, numbers or underscores. They log in with this.</small>
            </label>
            <label className="field">
              <span>Display name</span>
              <input className="input" name="displayName" maxLength={40} placeholder="Ana" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required />
              <small>At least 8 characters. Share it with them privately.</small>
            </label>
            {canSetAdmin(viewer) && (
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isAdmin" />
                Make them an admin too
              </label>
            )}
          </ActionForm>
        )}
      </section>
    </div>
  );
}
