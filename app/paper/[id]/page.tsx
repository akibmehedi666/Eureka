import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import PaperDetailView from "./paper-detail-view";

interface PaperPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaperPage({ params }: PaperPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Parallel: fetch paper (with explicit field selection) + user profile
  const [paper, dbUser] = await Promise.all([
    prisma.paper.findUnique({
      where: { id },
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
        // Notes: full content needed here (this is the detail view)
        notes: {
          select: {
            id: true,
            summary: true,
            keyFindings: true,
            openQuestions: true,
            relevance: true,
            freeform: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1, // only the most-recent note is displayed
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, avatarUrl: true }, // skip bio, focusArea, etc.
    }),
  ]);

  if (!paper) {
    notFound();
  }

  // Membership check (needs paper.workspaceId, so must come after paper fetch)
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: paper.workspaceId },
    select: { role: true },
  });

  if (!membership) {
    redirect("/dashboard");
  }

  const canDelete =
    paper.addedById === user.id || membership.role === "OWNER";

  return (
    <PaperDetailView
      paper={paper as any}
      user={{
        id: user.id,
        name: dbUser?.name || user.email!.split("@")[0],
        avatarUrl: dbUser?.avatarUrl || null,
      }}
      canDelete={canDelete}
    />
  );
}
