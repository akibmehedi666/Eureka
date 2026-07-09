import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import LibraryView from "../../library-view";
import { ActiveWorkspaceTracker } from "@/components/active-workspace-tracker";

interface Props {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deferred: activities are loaded by a separate async server component so the
// paper list renders immediately without waiting for the activity JOIN query.
// ─────────────────────────────────────────────────────────────────────────────
async function ActivityFeedLoader({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: (
    activities: {
      id: string;
      type: string;
      createdAt: Date;
      metadata: Record<string, unknown> | null;
      user: { id: string; name: string };
      paper: { id: string; title: string } | null;
    }[]
  ) => React.ReactNode;
}) {
  const activities = await prisma.activity.findMany({
    where: { workspaceId },
    select: {
      id: true,
      type: true,
      createdAt: true,
      metadata: true,
      user: { select: { id: true, name: true } },
      paper: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const shaped = activities.map((a) => ({
    id: a.id,
    type: a.type,
    createdAt: a.createdAt,
    metadata: (a.metadata as Record<string, unknown>) ?? null,
    user: { id: a.user.id, name: a.user.name },
    paper: a.paper ? { id: a.paper.id, title: a.paper.title } : null,
  }));

  return <>{children(shaped)}</>;
}

// Inline skeleton that matches the existing activity feed design
function ActivitySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="h-6 w-6 rounded-full bg-border/50 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-border/50 w-3/4 rounded" />
            <div className="h-2.5 bg-border/40 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function WorkspaceDashboard({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // ── Critical path: workspace + membership checks ─────────────────────────
  const [workspace, membership] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id },
      select: { id: true, name: true, description: true },
    }),
    prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspaceId: id },
      select: { role: true },
    }),
  ]);

  if (!workspace) return notFound();
  if (!membership) redirect("/dashboard");

  // ── Parallelised queries — only fields actually rendered ──────────────────
  const [papers, members, invites, userMemberships] = await Promise.all([
    // Papers: notes only needs id (to show the "has notes" indicator dot)
    prisma.paper.findMany({
      where: { workspaceId: id },
      select: {
        id: true,
        title: true,
        authors: true,
        year: true,
        sourceUrl: true,
        fileUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
        addedById: true,
        assignedToId: true,
        addedBy: { select: { id: true, name: true, avatarUrl: true } },
        notes: { select: { id: true }, take: 1 }, // only need to know if notes exist
      },
      orderBy: { createdAt: "desc" },
    }),

    // Members: only the 3 fields shown in the UI
    prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      select: {
        role: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),

    // Invites: only the 4 fields shown in the UI
    (prisma as any).workspaceInvite.findMany({
      where: { workspaceId: id },
      select: { id: true, email: true, token: true, acceptedAt: true },
      orderBy: { createdAt: "desc" },
    }),

    // Workspace sidebar list: only id + name + description
    prisma.workspaceMember.findMany({
      where: { userId: user.id },
      select: {
        workspace: { select: { id: true, name: true, description: true } },
      },
    }),
  ]);

  const workspaces = userMemberships.map((m: any) => m.workspace);
  const shapedMembers = members.map((m: any) => ({
    id: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
  }));
  const shapedInvites = invites.map((i: any) => ({
    id: i.id,
    email: i.email,
    token: i.token,
    acceptedAt: i.acceptedAt,
  }));

  return (
    <>
      <ActiveWorkspaceTracker workspaceId={workspace.id} />

      {/*
        Suspense boundary: LibraryView renders immediately with papers/members.
        The activity feed streams in separately via ActivityFeedLoader once the
        JOIN query completes — it no longer blocks first paint.
      */}
      <Suspense fallback={null}>
        <ActivityFeedLoader workspaceId={id}>
          {(activities) => (
            <LibraryView
              initialPapers={papers as any}
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              workspaceDescription={workspace.description ?? null}
              currentUserId={user.id}
              members={shapedMembers}
              invites={shapedInvites}
              activities={activities}
              workspaces={workspaces}
              user={{
                id: user.id,
                name:
                  user.user_metadata.name ||
                  user.email!.split("@")[0],
                avatarUrl: user.user_metadata.avatar_url || null,
              }}
            />
          )}
        </ActivityFeedLoader>
      </Suspense>
    </>
  );
}
