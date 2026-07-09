import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Users, Crown, BookOpen, Plus } from "lucide-react";

export const metadata = {
  title: "Teams — Eureka!",
  description: "All workspaces and teams you belong to.",
};

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "desc" },
    include: {
      workspace: {
        include: {
          members: { include: { user: true } },
          papers: { select: { id: true } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent/35">
      {/* Spine */}
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border z-10" />

      <div className="max-w-3xl mx-auto px-6 pl-10 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-muted uppercase tracking-wider hover:text-ink mb-6 group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
            Back to Library
          </Link>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">Teams</h1>
              <p className="font-mono text-xs text-ink-muted uppercase tracking-wider mt-2">
                {memberships.length} workspace{memberships.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/teams/new"
              className="inline-flex items-center gap-1.5 bg-ink text-paper font-serif text-sm h-9 px-4 hover:bg-ink-muted transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Team
            </Link>
          </div>
        </div>

        <div className="w-full h-px bg-border mb-8" />

        {/* Team cards */}
        {memberships.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="h-10 w-10 text-ink-muted/30 mx-auto mb-3" />
            <p className="font-serif text-lg font-bold text-ink-muted">No teams yet</p>
            <p className="font-mono text-xs text-ink-muted/70 mt-1">Create a team to collaborate with others.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memberships.map(({ workspace, role }) => {
              const memberCount = workspace.members.length;
              const paperCount = workspace.papers.length;
              const isOwner = role === "OWNER";

              return (
                <Link
                  key={workspace.id}
                  href={`/teams/${workspace.id}`}
                  className="group block border border-border bg-paper hover:bg-border/10 hover:border-accent-forest/40 transition-all border-l-4 border-l-transparent hover:border-l-accent-forest"
                >
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {isOwner && (
                          <Crown className="h-3 w-3 text-accent shrink-0" />
                        )}
                        <h2 className="font-serif text-xl font-bold text-ink group-hover:text-accent-forest transition-colors truncate">
                          {workspace.name}
                        </h2>
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${isOwner ? "border-accent/40 text-accent bg-accent/10" : "border-border text-ink-muted bg-border/20"}`}>
                          {isOwner ? "Owner" : "Member"}
                        </span>
                      </div>

                      {workspace.description && (
                        <p className="font-sans text-sm text-ink-muted truncate">{workspace.description}</p>
                      )}

                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-muted">
                          <Users className="h-3 w-3" />
                          {memberCount} member{memberCount !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-muted">
                          <BookOpen className="h-3 w-3" />
                          {paperCount} paper{paperCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Member avatars */}
                    <div className="flex items-center gap-1 shrink-0">
                      {workspace.members.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          title={m.user.name}
                          className="h-7 w-7 border border-border bg-accent-forest/10 flex items-center justify-center font-mono text-[10px] font-bold text-accent-forest uppercase"
                        >
                          {m.user.name.charAt(0)}
                        </div>
                      ))}
                      {memberCount > 4 && (
                        <div className="h-7 w-7 border border-border bg-border/20 flex items-center justify-center font-mono text-[9px] text-ink-muted">
                          +{memberCount - 4}
                        </div>
                      )}
                      <ArrowRight className="h-4 w-4 text-ink-muted/40 ml-2 group-hover:text-accent-forest group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
