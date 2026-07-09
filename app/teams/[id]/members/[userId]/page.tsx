import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BookOpen, PenLine, Crown, Eye, Clock } from "lucide-react";

interface Props {
  params: Promise<{ id: string; userId: string }>;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusColors: Record<string, string> = {
  TO_READ: "text-ink-muted bg-border/30 border-border",
  READING: "text-accent bg-accent/10 border-accent/30",
  DONE: "text-accent-forest bg-accent-forest/10 border-accent-forest/30",
  REFERENCE: "text-ink-muted/80 bg-border/40 border-border/60",
};

export async function generateMetadata({ params }: Props) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return { title: user ? `${user.name} — Eureka!` : "Teammate Profile — Eureka!" };
}

export default async function TeammateProfilePage({ params }: Props) {
  const { id: workspaceId, userId } = await params;

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect("/login");

  // Verify the current user is a member of this workspace
  const [currentMembership, workspace] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: currentUser.id, workspaceId } },
    }),
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
  ]);

  if (!currentMembership) redirect("/teams");
  if (!workspace) return notFound();

  // Load the profile user and their membership in this workspace
  const [profileUser, profileMembership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    }),
  ]);

  if (!profileUser || !profileMembership) return notFound();

  // Load papers this user added in this workspace, and their notes/activities here
  const [papersAdded, notes, activities] = await Promise.all([
    prisma.paper.findMany({
      where: { workspaceId, addedById: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.note.findMany({
      where: {
        authorId: userId,
        paper: { workspaceId },
        OR: [
          { summary: { not: "" } },
          { keyFindings: { not: "" } },
          { freeform: { not: "" } },
        ],
      },
      include: { paper: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { userId, workspaceId },
      include: { paper: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const isMe = profileUser.id === currentUser.id;
  const isOwner = profileMembership.role === "OWNER";
  const readingNow = papersAdded.filter((p) => p.status === "READING");
  const done = papersAdded.filter((p) => p.status === "DONE");

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent/35">
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border z-10" />

      <div className="max-w-4xl mx-auto px-6 pl-10 py-12">
        {/* Back to team */}
        <Link
          href={`/teams/${workspaceId}`}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-muted uppercase tracking-wider hover:text-ink mb-8 group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
          Back to {workspace.name}
        </Link>

        {/* Profile header */}
        <div className="mb-10 pb-8 border-b border-border">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 border border-border bg-accent-forest/10 flex items-center justify-center font-serif text-3xl font-bold text-accent-forest uppercase shrink-0 overflow-hidden">
              {profileUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileUser.avatarUrl} alt={profileUser.name} className="h-full w-full object-cover" />
              ) : (
                profileUser.name.charAt(0)
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isOwner && <Crown className="h-4 w-4 text-accent shrink-0" />}
                <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
                  {profileUser.name}
                  {isMe && <span className="font-mono text-sm text-ink-muted ml-2">(you)</span>}
                </h1>
                <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${isOwner ? "border-accent/40 text-accent bg-accent/10" : "border-border text-ink-muted bg-border/20"}`}>
                  {isOwner ? "Owner" : "Member"}
                </span>
              </div>

              <p className="font-mono text-xs text-ink-muted mt-1">
                {profileUser.email} · joined {timeAgo(profileMembership.joinedAt)}
              </p>

              {profileUser.focusArea && (
                <p className="font-sans text-sm text-ink-muted/90 mt-2">{profileUser.focusArea}</p>
              )}
              {profileUser.bio && (
                <p className="font-sans text-sm text-ink-muted mt-2 max-w-xl leading-relaxed">{profileUser.bio}</p>
              )}
              {!profileUser.focusArea && !profileUser.bio && (
                <p className="font-mono text-xs text-ink-muted/50 mt-2 italic">No bio provided.</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              {[
                { label: "Added", value: papersAdded.length },
                { label: "Reading", value: readingNow.length },
                { label: "Done", value: done.length },
              ].map(({ label, value }) => (
                <div key={label} className="border border-border p-3 text-center min-w-[64px]">
                  <span className="font-serif text-2xl font-bold text-ink block">{value}</span>
                  <span className="font-mono text-[8px] text-ink-muted uppercase">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main: All papers in this team */}
          <div className="lg:col-span-2 space-y-8">
            {/* Currently Reading */}
            {readingNow.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  <h2 className="font-serif text-lg font-bold text-ink">Currently Reading</h2>
                </div>
                <div className="space-y-2">
                  {readingNow.map((paper) => (
                    <Link
                      key={paper.id}
                      href={`/paper/${paper.id}`}
                      className="group block border border-accent/30 bg-accent/5 hover:bg-accent/10 p-3 transition-all border-l-4 border-l-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-serif text-sm font-bold text-ink truncate group-hover:text-accent-forest">{paper.title}</p>
                          <p className="font-mono text-[9px] text-ink-muted mt-0.5">{paper.authors}</p>
                        </div>
                        <Eye className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* All papers added in this team */}
            <section className="space-y-3">
              <h2 className="font-serif text-lg font-bold text-ink">
                All Papers Added
                <span className="ml-2 font-mono text-xs text-ink-muted font-normal">in {workspace.name}</span>
              </h2>
              {papersAdded.length === 0 ? (
                <div className="py-10 text-center border border-border">
                  <BookOpen className="h-8 w-8 text-ink-muted/30 mx-auto mb-2" />
                  <p className="font-mono text-xs text-ink-muted/70">No papers added to this team yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 border border-border">
                  {papersAdded.map((paper) => (
                    <Link
                      key={paper.id}
                      href={`/paper/${paper.id}`}
                      className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-border/10 transition-all"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-serif text-sm font-bold text-ink truncate group-hover:text-accent-forest">{paper.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-ink-muted/70 truncate">{paper.authors}</span>
                          {paper.year && (
                            <>
                              <span className="text-ink-muted/30">·</span>
                              <span className="font-mono text-[9px] text-ink-muted/70 shrink-0">{paper.year}</span>
                            </>
                          )}
                        </div>
                        <span className="font-mono text-[9px] text-ink-muted/60 block">{timeAgo(paper.createdAt)}</span>
                      </div>
                      <span className={`font-mono text-[8px] px-1.5 py-0.5 border uppercase shrink-0 ${statusColors[paper.status]}`}>
                        {paper.status.replace("_", " ")}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Notes */}
            {notes.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-ink">
                  Notes Written
                  <span className="ml-2 font-mono text-xs text-ink-muted font-normal">in {workspace.name}</span>
                </h2>
                <div className="divide-y divide-border/60 border border-border">
                  {notes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/paper/${note.paperId}`}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-border/10 transition-all"
                    >
                      <PenLine className="h-3.5 w-3.5 text-ink-muted/50 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-bold text-ink truncate group-hover:text-accent-forest">{note.paper.title}</p>
                        {note.summary && (
                          <p className="font-sans text-xs text-ink-muted line-clamp-1 mt-0.5">{note.summary}</p>
                        )}
                        <span className="font-mono text-[9px] text-ink-muted/60 mt-0.5 block">
                          updated {timeAgo(note.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Activity feed */}
          <div>
            <div className="border border-border p-4 space-y-3 sticky top-8">
              <h3 className="font-serif text-sm font-bold text-ink">Activity in {workspace.name}</h3>
              {activities.length === 0 ? (
                <p className="font-mono text-[10px] text-ink-muted/70">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => {
                    const meta = a.metadata as any;
                    let label = "";
                    switch (a.type) {
                      case "PAPER_ADDED": label = `added "${meta?.title || "a paper"}`; break;
                      case "NOTE_ADDED": label = `wrote notes on "${meta?.title || "a paper"}"`; break;
                      case "STATUS_CHANGED":
                        label = `marked "${meta?.title || "a paper"}" as ${(meta?.newStatus || "").replace("_", " ").toLowerCase()}`;
                        break;
                      case "PAPER_UPDATED": label = `updated "${meta?.title || "a paper"}"`; break;
                      default: label = a.type.toLowerCase().replace(/_/g, " ");
                    }
                    return (
                      <div key={a.id} className="flex gap-2.5 items-start">
                        <Clock className="h-3 w-3 text-ink-muted/50 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-xs text-ink-muted leading-snug">{label}</p>
                          {a.paper && (
                            <Link
                              href={`/paper/${a.paper.id}`}
                              className="font-mono text-[9px] text-accent-forest hover:underline block truncate"
                            >
                              {a.paper.title}
                            </Link>
                          )}
                          <span className="font-mono text-[9px] text-ink-muted/60">{timeAgo(a.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
