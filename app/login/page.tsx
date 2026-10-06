import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logIn } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Overprint } from "@/components/Overprint";

export const metadata = { title: "Log in · Support Mi Amigos" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="mx-auto grid min-h-dvh max-w-[720px] content-center gap-10 px-4 py-12">
      <div className="grid gap-4">
        <Overprint as="h1" className="text-[clamp(3rem,13vw,6.5rem)]">
          Support Mi Amigos
        </Overprint>
        <p className="max-w-[46ch] text-lg text-muted">
          A tiny Kickstarter for ten friends. Pitch something the group wants, chip in what you can, and see who gets
          there by the deadline.
        </p>
      </div>

      <ActionForm action={logIn} submitLabel="Log in" pendingLabel="Checking…" className="grid max-w-sm gap-4">
        <label className="field">
          <span>Username</span>
          <input className="input" name="username" autoComplete="username" autoCapitalize="none" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" name="password" type="password" autoComplete="current-password" required />
          <small>No account? Your group&apos;s admin creates them.</small>
        </label>
      </ActionForm>
    </main>
  );
}
