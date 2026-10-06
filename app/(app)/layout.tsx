import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logOut } from "@/app/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-[760px] px-4">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b-2 border-ink py-4">
        <Link href="/" className="display text-xl font-extrabold text-ink no-underline">
          Support Mi Amigos
        </Link>
        <nav className="flex items-center gap-4 text-[0.95rem]" aria-label="Account">
          <span className="text-muted">Hola, {user.display_name}</span>
          {user.is_admin && <Link href="/admin/users">Amigos</Link>}
          <form action={logOut}>
            <button className="btn btn-quiet text-[0.95rem]" type="submit">
              Log out
            </button>
          </form>
        </nav>
      </header>
      <main className="py-8 pb-24">{children}</main>
    </div>
  );
}
