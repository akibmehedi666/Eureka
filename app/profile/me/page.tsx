import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, PenLine, Clock, User } from "lucide-react";
import { signOut } from "@/app/login/actions";

export const metadata = {
  title: "My Work — Eureka!",
};

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

export default async function MyWorkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });
  if (!dbUser) redirect("/dashboard");

  const [myPapers, myNotes, recentActivity] = await Promise.all([
    prisma.paper.findMany({
      where: { addedById: user.id },
      include: { workspace: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.note.findMany({
      where: {
        authorId: user.id,
        OR: [
          { summary: { not: "" } },
          { keyFindings: { not: "" } },
          { freeform: { not: "" } },
        ],
      },
      include: {
        paper: { include: { workspace: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.activity.findMany({
      where: { userId: user.id },
      include: { paper: true, workspace: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const readingNow = myPapers.filter((p) => p.status === "READING");
  const done = myPapers.filter((p) => p.status === "DONE");

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent/35">
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border z-10" />

      <div className="max-w-4xl mx-auto px-6 pl-10 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-muted uppercase tracking-wider hover:text-ink mb-8 group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
          Back to Library
        </Link>

        {/* Profile header */}
        <div className="mb-10 pb-8 border-b border-border flex items-start gap-5">
          <div className="h-16 w-16 border border-border bg-accent-forest/10 flex items-center justify-center font-serif text-3xl font-bold text-accent-forest uppercase shrink-0">
            {dbUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dbUser.avatarUrl} alt={dbUser.name} className="h-full w-full object-cover" />
            ) : (
              dbUser.name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">{dbUser.name}</h1>
            <p className="font-mono text-xs text-ink-muted mt-1">{dbUser.email}</p>
            {dbUser.focusArea && (
              <p className="font-sans text-sm text-ink-muted/90 mt-1">{dbUser.focusArea}</p>
            )}
            {dbUser.bio && (
              <p className="font-sans text-sm text-ink-muted mt-2 max-w-xl leading-relaxed">{dbUser.bio}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-ink-muted hover:text-ink tracking-wider group"
              >
                <User className="h-2.5 w-2.5" />
                Edit profile
              </Link>
              <span className="text-border">|</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 font-mono text-[9px] uppercase text-destructive hover:text-destructive/80 tracking-wider cursor-pointer"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            {[
              { label: "Papers", value: myPapers.length },
              { label: "Reading", value: readingNow.length },
              { label: "Notes", value: myNotes.length },
            ].map(({ label, value }) => (
              <div key={label} className="border border-border p-3 text-center min-w-[64px]">
                <span className="font-serif text-2xl font-bold text-ink block">{value}</span>
                <span className="font-mono text-[8px] text-ink-muted uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main: Papers */}
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
                          <p className="font-mono text-[9px] text-ink-muted mt-0.5">{paper.workspace.name}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-ink-muted/40 shrink-0 mt-0.5 group-hover:text-accent-forest group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* All Papers */}
            <section className="space-y-3">
              <h2 className="font-serif text-lg font-bold text-ink">All Papers I&apos;ve Added</h2>
              {myPapers.length === 0 ? (
                <div className="py-10 text-center border border-border">
                  <BookOpen className="h-8 w-8 text-ink-muted/30 mx-auto mb-2" />
                  <p className="font-mono text-xs text-ink-muted/70">You haven&apos;t added any papers yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 border border-border">
                  {myPapers.map((paper) => (
                    <Link
                      key={paper.id}
                      href={`/paper/${paper.id}`}
                      className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-border/10 transition-all"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-serif text-sm font-bold text-ink truncate group-hover:text-accent-forest">{paper.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-ink-muted/70">{paper.workspace.name}</span>
                          <span className="text-ink-muted/30">·</span>
                          <span className="font-mono text-[9px] text-ink-muted/70">{timeAgo(paper.createdAt)}</span>
                        </div>
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
            {myNotes.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-ink">My Notes</h2>
                <div className="divide-y divide-border/60 border border-border">
                  {myNotes.map((note) => (
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
                        <span className="font-mono text-[9px] text-ink-muted/60 mt-0.5 block">updated {timeAgo(note.updatedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Recent Activity */}
          <div>
            <div className="border border-border p-4 space-y-3 sticky top-8">
              <h3 className="font-serif text-sm font-bold text-ink">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <p className="font-mono text-[10px] text-ink-muted/70">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a) => {
                    const meta = a.metadata as any;
                    let label = "";
                    switch (a.type) {
                      case "PAPER_ADDED": label = `added "${meta?.title || "a paper"}"`; break;
                      case "NOTE_ADDED": label = `wrote notes on "${meta?.title || "a paper"}"`; break;
                      case "STATUS_CHANGED": label = `marked "${meta?.title || "a paper"}" as ${(meta?.newStatus || "").replace("_", " ").toLowerCase()}`; break;
                      default: label = a.type.toLowerCase().replace(/_/g, " ");
                    }
                    return (
                      <div key={a.id} className="space-y-0.5">
                        <p className="font-sans text-xs text-ink-muted leading-snug">{label}</p>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-2.5 w-2.5 text-ink-muted/50" />
                          <span className="font-mono text-[9px] text-ink-muted/60">{timeAgo(a.createdAt)}</span>
                          {a.workspace && (
                            <>
                              <span className="text-ink-muted/30">·</span>
                              <span className="font-mono text-[9px] text-ink-muted/60 truncate">{a.workspace.name}</span>
                            </>
                          )}
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
