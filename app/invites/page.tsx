import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Inbox, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { acceptWorkspaceInvite, declineWorkspaceInvite } from "@/app/actions";

export const metadata = {
  title: "Invites — Eureka!",
};

export default async function InvitesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const invites = await (prisma as any).workspaceInvite.findMany({
    where: {
      email: user.email.toLowerCase(),
      acceptedAt: null,
    },
    include: {
      workspace: true,
      invitedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  async function acceptInvite(formData: FormData) {
    "use server";
    await acceptWorkspaceInvite(formData);
  }

  async function declineInvite(formData: FormData) {
    "use server";
    await declineWorkspaceInvite(formData);
  }

  return (
    <main className="min-h-screen bg-paper text-ink selection:bg-accent/35">
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border z-10" />

      <div className="mx-auto max-w-3xl px-6 py-12 pl-10">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
            <Inbox className="h-4 w-4" />
            Pending invites
          </div>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">Invites</h1>
          <p className="mt-2 max-w-xl text-base text-ink-muted">
            Teams that invited your email address appear here. Accept to join immediately, or decline to remove the invite.
          </p>
        </div>

        <div className="h-px w-full bg-border mb-8" />

        {invites.length === 0 ? (
          <div className="border border-border bg-paper p-10 text-center">
            <UserPlus className="mx-auto mb-3 h-9 w-9 text-ink-muted/35" />
            <p className="font-serif text-xl font-bold text-ink">No pending invites</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-muted">
              You are all caught up.
            </p>
            <Link
              href="/teams"
              className="mt-6 inline-flex items-center gap-1.5 bg-ink px-4 py-2 font-serif text-sm text-paper hover:bg-ink-muted"
            >
              Go to Teams
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite: any) => (
              <div key={invite.id} className="border border-border bg-paper p-5 border-l-4 border-l-accent-forest">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-ink">{invite.workspace.name}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Invited by {invite.invitedBy?.name || "a team member"}
                    </p>
                    {invite.workspace.description && (
                      <p className="mt-2 max-w-lg text-sm text-ink-muted/90">{invite.workspace.description}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <form action={declineInvite}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="h-9 border border-border px-3 font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:bg-border/20 hover:text-ink"
                      >
                        Decline
                      </button>
                    </form>
                    <form action={acceptInvite}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="h-9 bg-accent-forest px-4 font-serif text-sm text-paper hover:bg-accent-forest/90"
                      >
                        Accept
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
