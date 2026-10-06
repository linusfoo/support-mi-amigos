import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signUp } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { Overprint } from "@/components/Overprint";

export const metadata = { title: "Sign up · Support Mi Amigos" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="mx-auto grid min-h-dvh max-w-[720px] content-center gap-10 px-4 py-12">
      <div className="grid gap-4">
        <Overprint as="h1" className="text-[clamp(3rem,13vw,6.5rem)]">
          Join the amigos
        </Overprint>
        <p className="max-w-[46ch] text-lg text-muted">
          There&apos;s room for ten. Pick a username your friends will recognise.
        </p>
      </div>

      <ActionForm action={signUp} submitLabel="Sign up" pendingLabel="Creating…" className="grid max-w-sm gap-4">
        <label className="field">
          <span>Username</span>
          <input
            className="input"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            pattern="[A-Za-z0-9_]{3,20}"
            title="3–20 letters, numbers or underscores"
            required
          />
          <small>3–20 letters, numbers or underscores. Saved in lowercase.</small>
        </label>
        <label className="field">
          <span>Display name</span>
          <input className="input" name="displayName" maxLength={40} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <small>
            At least 8 characters. Already have an account? <Link href="/login">Log in</Link>
          </small>
        </label>
      </ActionForm>
    </main>
  );
}
