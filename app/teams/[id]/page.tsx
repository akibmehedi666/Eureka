import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Crown, BookOpen, PenLine, Eye, Clock, Users, Trash2, UserMinus, LogOut } from "lucide-react";
import { InviteForm } from "./invite-form";
import { TeamActionButton } from "./team-action-button";
import { ActiveWorkspaceTracker } from "@/components/active-workspace-tracker";

export const metadata = {
  title: "Team Details — Eureka!",
};

interface Props {
  params: Promise<{ id: string }>;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [membership, workspace] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: id } },
    }),
    prisma.workspace.findUnique({ where: { id } }),
  ]);

  if (!membership) redirect("/teams");
  if (!workspace) return notFound();

  const [members, papers, activities, invites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.paper.findMany({
      where: { workspaceId: id },
      include: {
        addedBy: true,
        notes: { include: { author: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { workspaceId: id },
      include: { user: true, paper: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    (prisma as any).workspaceInvite.findMany({
      where: { workspaceId: id, acceptedAt: null },
      include: { invitedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isOwner = membership.role === "OWNER";

  // Build per-member stats
  const memberStats = members.map(({ user: member, role, joinedAt }) => {
    const papersAdded = papers.filter((p) => p.addedById === member.id);
    const currentlyReading = papersAdded.filter((p) => p.status === "READING");
    const done = papersAdded.filter((p) => p.status === "DONE");
    const notesWritten = papers.reduce((acc, paper) => {
      return acc + paper.notes.filter((n) => n.authorId === member.id && (n.summary || n.keyFindings || n.freeform)).length;
    }, 0);
    const lastActivity = activities.find((a) => a.userId === member.id);

    return { member, role, joinedAt, papersAdded, currentlyReading, done, notesWritten, lastActivity };
  });

  // Recent activity feed (last 20, formatted)
  const recentFeed = activities.slice(0, 20).map((a) => {
    let label = "";
    const meta = a.metadata as any;
    switch (a.type) {
      case "PAPER_ADDED": label = `added "${meta?.title || "a paper"}"`;  break;
      case "NOTE_ADDED": label = `wrote notes on "${meta?.title || "a paper"}"`;  break;
      case "STATUS_CHANGED": label = `marked "${meta?.title || "a paper"}" as ${(meta?.newStatus || "").replace("_", " ").toLowerCase()}`; break;
      case "PAPER_UPDATED": label = `updated "${meta?.title || "a paper"}"`; break;
      case "INVITE_CREATED": label = `invited ${meta?.email || "someone"}`; break;
      case "MEMBER_JOINED": label = "joined the team"; break;
      default: label = a.type.toLowerCase().replace("_", " ");
    }
    return { ...a, label };
  });

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent/35">
      <ActiveWorkspaceTracker workspaceId={id} />
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border z-10" />

      <div className="max-w-4xl mx-auto px-6 pl-10 py-12">
        {/* Back */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-muted uppercase tracking-wider hover:text-ink mb-8 group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
          All Teams
        </Link>

        {/* Header */}
        <div className="mb-10 pb-8 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">{workspace.name}</h1>
              {workspace.description && (
                <p className="font-sans text-sm text-ink-muted mt-2 max-w-xl">{workspace.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-muted">
                  <Users className="h-3 w-3" />
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-muted">
                  <BookOpen className="h-3 w-3" />
                  {papers.length} paper{papers.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Link
              href={`/dashboard/${id}`}
              className="shrink-0 inline-flex items-center gap-1.5 border border-border hover:bg-border/20 text-ink font-mono text-[10px] uppercase tracking-wider h-8 px-3 transition-all"
            >
              <BookOpen className="h-3 w-3" />
              Open Library
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Members + their work */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="font-serif text-xl font-bold text-ink">Team Members</h2>

            {memberStats.map(({ member, role, joinedAt, papersAdded, currentlyReading, done, notesWritten, lastActivity }) => {
              const isMe = member.id === user.id;
              const isThisOwner = role === "OWNER";

              return (
                <div key={member.id} className="border border-border bg-paper p-5 space-y-4 relative overflow-hidden group/card">
                  {/* Clickable overlay link to teammate profile */}
                  <Link
                    href={`/teams/${id}/members/${member.id}`}
                    className="absolute inset-0 z-[1]"
                    aria-label={`View ${member.name}'s profile`}
                  />
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isThisOwner ? "bg-accent/60" : "bg-border"}`} />

                  {/* Member header */}
                  <div className="pl-3 flex items-center justify-between gap-3 relative z-[2]">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 border border-border bg-accent-forest/10 flex items-center justify-center font-mono text-base font-bold text-accent-forest uppercase shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {isThisOwner && <Crown className="h-3 w-3 text-accent" />}
                          <span className="font-serif text-base font-bold text-ink">
                            {member.name}{isMe ? " (you)" : ""}
                          </span>
                          <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${isThisOwner ? "border-accent/40 text-accent bg-accent/10" : "border-border text-ink-muted bg-border/20"}`}>
                            {isThisOwner ? "Owner" : "Member"}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-ink-muted/70 block mt-0.5">
                          {member.email} · joined {timeAgo(joinedAt)}
                        </span>
                      </div>
                    </div>
                    {lastActivity && (
                      <span className="flex items-center gap-1 font-mono text-[9px] text-ink-muted/70 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(lastActivity.createdAt)}
                      </span>
                    )}
                    {isOwner && !isMe && (
                      <TeamActionButton
                        action="remove"
                        workspaceId={id}
                        memberUserId={member.id}
                        className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-destructive hover:text-destructive/80 disabled:opacity-60"
                      >
                        <UserMinus className="h-3 w-3" />
                        Remove member
                      </TeamActionButton>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="pl-3 grid grid-cols-4 gap-3 relative z-[2]">
                    {[
                      { label: "Added", value: papersAdded.length, icon: BookOpen },
                      { label: "Reading", value: currentlyReading.length, icon: Eye },
                      { label: "Done", value: done.length, icon: null },
                      { label: "Notes", value: notesWritten, icon: PenLine },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="border border-border/60 p-2 text-center">
                        <span className="font-serif text-xl font-bold text-ink block">{value}</span>
                        <span className="font-mono text-[9px] text-ink-muted uppercase">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Currently reading */}
                  {currentlyReading.length > 0 && (
                    <div className="pl-3 space-y-1.5 relative z-[2]">
                      <span className="font-mono text-[9px] uppercase text-ink-muted tracking-wider block">Currently Reading</span>
                      {currentlyReading.slice(0, 2).map((paper) => (
                        <Link
                          key={paper.id}
                          href={`/paper/${paper.id}`}
                          className="flex items-center gap-2 group hover:text-accent-forest transition-colors"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          <span className="font-sans text-xs text-ink truncate group-hover:text-accent-forest">{paper.title}</span>
                        </Link>
                      ))}
                      {currentlyReading.length > 2 && (
                        <span className="font-mono text-[9px] text-ink-muted/70">+{currentlyReading.length - 2} more</span>
                      )}
                    </div>
                  )}

                  {/* Recently added papers */}
                  {papersAdded.length > 0 && (
                    <div className="pl-3 space-y-1.5 relative z-[2]">
                      <span className="font-mono text-[9px] uppercase text-ink-muted tracking-wider block">Recently Added</span>
                      {papersAdded.slice(0, 2).map((paper) => (
                        <Link
                          key={paper.id}
                          href={`/paper/${paper.id}`}
                          className="flex items-center gap-2 group"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-accent-forest/60 shrink-0" />
                          <span className="font-sans text-xs text-ink-muted truncate group-hover:text-ink">{paper.title}</span>
                          <span className={`ml-auto shrink-0 font-mono text-[8px] px-1 py-0.5 uppercase ${
                            paper.status === "READING" ? "text-accent bg-accent/10 border border-accent/30" :
                            paper.status === "DONE" ? "text-accent-forest bg-accent-forest/10 border border-accent-forest/30" :
                            "text-ink-muted bg-border/30 border border-border"
                          }`}>
                            {paper.status.replace("_", " ")}
                          </span>
                        </Link>
                      ))}
                      {papersAdded.length > 2 && (
                        <span className="font-mono text-[9px] text-ink-muted/70">+{papersAdded.length - 2} more</span>
                      )}
                    </div>
                  )}

                  {papersAdded.length === 0 && (
                    <div className="pl-3 relative z-[2]">
                      <span className="font-mono text-[9px] text-ink-muted/50 italic">No papers added yet.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT: Activity feed + Invite */}
          <div className="space-y-6">
            <div className="border border-border p-4 space-y-3">
              <h3 className="font-serif text-base font-bold text-ink">Invite Teammate</h3>
              <InviteForm workspaceId={id} />
              {invites.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-border">
                  <span className="font-mono text-[9px] uppercase text-ink-muted tracking-wider block">Pending Invites</span>
                  {invites.map((inv: any) => (
                    <div key={inv.id} className="text-xs border border-border/40 p-2 bg-border/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-sans text-ink-muted truncate">{inv.email}</span>
                        <span className="font-mono text-[8px] text-accent uppercase">Pending</span>
                      </div>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-ink-muted/60">
                        Invited by {inv.invitedBy?.name || "a team member"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-border p-4 space-y-3">
              <h3 className="font-serif text-base font-bold text-ink">Team Settings</h3>
              <TeamActionButton
                action="leave"
                workspaceId={id}
                className="flex w-full items-center justify-center gap-1.5 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:bg-border/20 hover:text-ink disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
                Leave team
              </TeamActionButton>

              {isOwner && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs leading-relaxed text-ink-muted">
                    Deleting this team removes its papers, notes, activity, members, and pending invites.
                  </p>
                  <TeamActionButton
                    action="delete"
                    workspaceId={id}
                    className="flex w-full items-center justify-center gap-1.5 bg-destructive/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete team
                  </TeamActionButton>
                </div>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="border border-border p-4 space-y-3">
              <h3 className="font-serif text-sm font-bold text-ink">Recent Activity</h3>
              {recentFeed.length === 0 ? (
                <p className="font-mono text-[10px] text-ink-muted/70">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentFeed.map((item) => (
                    <div key={item.id} className="flex gap-2.5 items-start">
                      <div className="h-5 w-5 border border-border bg-accent-forest/10 flex items-center justify-center font-mono text-[8px] font-bold text-accent-forest uppercase shrink-0 mt-0.5">
                        {item.user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-xs text-ink leading-snug">
                          <span className="font-semibold">{item.user.name}</span>{" "}
                          <span className="text-ink-muted">{item.label}</span>
                        </p>
                        <span className="font-mono text-[9px] text-ink-muted/60">{timeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
