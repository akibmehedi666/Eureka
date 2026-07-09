import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/app/login/actions";
import { NavbarLinks } from "@/components/navbar-links";

export async function AppNavbar() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user.email?.toLowerCase();
  const pendingInviteCount = email
    ? await (prisma as any).workspaceInvite.count({
        where: {
          email,
          acceptedAt: null,
        },
      })
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center bg-accent-forest font-mono text-sm font-bold text-paper">
            E!
          </span>
          <span className="font-serif text-xl font-bold tracking-tight text-ink">Eureka!</span>
        </Link>

        <nav className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          {session ? (
            <>
              <NavbarLinks pendingInviteCount={pendingInviteCount} />
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 px-2.5 hover:bg-border/30 hover:text-ink"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/" className="inline-flex h-8 items-center px-2.5 hover:bg-border/30 hover:text-ink">
                Home
              </Link>
              <Link href="/login" className="inline-flex h-8 items-center px-2.5 hover:bg-border/30 hover:text-ink">
                Log In
              </Link>
              <Link
                href="/login?mode=signup"
                className="inline-flex h-8 items-center bg-ink px-3 font-serif text-sm normal-case tracking-normal text-paper hover:bg-ink-muted"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
