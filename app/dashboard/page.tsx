import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Sync public.User record
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata.name || user.email!.split("@")[0],
        avatarUrl: user.user_metadata.avatar_url || null,
        lastActiveAt: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: dbUser.id },
    orderBy: { joinedAt: "desc" },
    include: { workspace: true },
  });

  if (memberships.length === 0) {
    const defaultWorkspace = await prisma.workspace.create({
      data: {
        name: "Personal Workspace",
        description: "My personal research notebook and paper library",
        members: {
          create: {
            userId: dbUser.id,
            role: "OWNER",
          },
        },
      },
    });

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastActiveWorkspaceId: defaultWorkspace.id },
    });

    redirect(`/dashboard/${defaultWorkspace.id}`);
  }

  let workspaceId = memberships[0].workspaceId;

  if (dbUser.lastActiveWorkspaceId) {
    const lastMembership = memberships.find(
      (m) => m.workspaceId === dbUser.lastActiveWorkspaceId
    );
    if (lastMembership) {
      workspaceId = lastMembership.workspaceId;
    }
  }

  redirect(`/dashboard/${workspaceId}`);
}
