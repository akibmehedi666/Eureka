"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PaperStatus } from "@prisma/client";
import { extractMetadata, cleanFilenameTitle } from "@/lib/metadata";

export async function createPaperUploadUrl(fileName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return { error: "Storage configuration is missing." };
  }

  try {
    await adminSupabase.storage.createBucket("papers", {
      public: true,
    }).catch(() => {});

    const ext = fileName.split(".").pop() || "pdf";
    const objectPath = `${crypto.randomUUID()}.${ext}`;

    const { data, error } = await adminSupabase.storage
      .from("papers")
      .createSignedUploadUrl(objectPath, { upsert: true });

    if (error || !data) {
      return { error: error?.message || "Failed to prepare upload" };
    }

    return { success: true, path: objectPath, token: data.token, signedUrl: data.signedUrl };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function addPaper(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const sourceUrl = formData.get("sourceUrl") as string;
  const workspaceId = formData.get("workspaceId") as string;
  const pdfFile = formData.get("pdfFile") as File;
  const uploadedFileUrl = formData.get("fileUrl") as string | null;
  const uploadedFileName = formData.get("fileName") as string | null;

  let title = "Untitled Document";
  let authors = "Unknown Author";
  let year: number | null = null;
  let fileUrl: string | null = null;
  let resolvedSourceUrl = sourceUrl || null;

  const adminSupabase = createAdminClient();

  try {
    // 1. Upload PDF file to Supabase Storage if provided
    if (uploadedFileUrl) {
      fileUrl = uploadedFileUrl;
      title = cleanFilenameTitle(uploadedFileName || "Uploaded Document");
    } else if (pdfFile && pdfFile.size > 0) {
      if (!adminSupabase) {
        return { error: "Storage configuration is missing." };
      }

      // Fallback for legacy direct uploads from the server action
      await adminSupabase.storage.createBucket("papers", {
        public: true,
      }).catch(() => {});

      const fileExt = pdfFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await adminSupabase.storage
        .from("papers")
        .upload(fileName, pdfFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        return { error: `PDF Upload failed: ${uploadError.message}` };
      }

      const { data: { publicUrl } } = adminSupabase.storage
        .from("papers")
        .getPublicUrl(fileName);

      fileUrl = publicUrl;
      title = cleanFilenameTitle(pdfFile.name);
    }

    // 2. Extract metadata if URL is provided
    if (sourceUrl) {
      const meta = await extractMetadata(sourceUrl);
      if (meta) {
        title = meta.title;
        authors = meta.authors;
        year = meta.year;
        if (meta.sourceUrl) {
          resolvedSourceUrl = meta.sourceUrl;
        }
      } else {
        // Fallback for custom link
        try {
          const urlObj = new URL(sourceUrl);
          title = `Document from ${urlObj.hostname}`;
        } catch {
          title = sourceUrl;
        }
      }
    }

    // 3. Create Paper in database
    const paper = await prisma.paper.create({
      data: {
        title,
        authors,
        year,
        sourceUrl: resolvedSourceUrl,
        fileUrl,
        status: "TO_READ", // Default status is "TO_READ"
        workspaceId,
        addedById: user.id,
        assignedToId: user.id, // Defaults to self
      },
    });

    // 4. Create initial empty Note record linked to Paper
    await prisma.note.create({
      data: {
        paperId: paper.id,
        authorId: user.id,
        summary: "",
        keyFindings: "",
        openQuestions: "",
        relevance: "",
        freeform: "",
      },
    });

    // 5. Create initial activity for the paper creation
    await prisma.activity.create({
      data: {
        type: "PAPER_ADDED",
        userId: user.id,
        workspaceId,
        paperId: paper.id,
        metadata: {
          title: paper.title,
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, paperId: paper.id };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function updatePaperStatus(paperId: string, status: PaperStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const originalPaper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!originalPaper) {
      return { error: "Paper not found" };
    }

    await prisma.paper.update({
      where: { id: paperId },
      data: { status },
    });

    // Log status changed activity
    await prisma.activity.create({
      data: {
        type: "STATUS_CHANGED",
        userId: user.id,
        workspaceId: originalPaper.workspaceId,
        paperId: originalPaper.id,
        metadata: {
          title: originalPaper.title,
          oldStatus: originalPaper.status,
          newStatus: status,
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/paper/${paperId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function updatePaperDetails(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const paperId = formData.get("paperId") as string;
  const title = formData.get("title") as string;
  const authors = formData.get("authors") as string;
  const yearStr = formData.get("year") as string;
  const sourceUrl = formData.get("sourceUrl") as string;
  
  const year = yearStr ? parseInt(yearStr, 10) : null;

  try {
    const originalPaper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!originalPaper) {
      return { error: "Paper not found" };
    }

    await prisma.paper.update({
      where: { id: paperId },
      data: {
        title: title || "Untitled Document",
        authors: authors || "Unknown Author",
        year,
        sourceUrl: sourceUrl || null,
      },
    });

    // Log update activity
    await prisma.activity.create({
      data: {
        type: "PAPER_UPDATED",
        userId: user.id,
        workspaceId: originalPaper.workspaceId,
        paperId: originalPaper.id,
        metadata: {
          title: title || "Untitled Document",
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/paper/${paperId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function deletePaper(paperId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return { error: "Paper not found" };
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: paper.workspaceId,
        },
      },
    });

    if (!membership) {
      return { error: "You do not have access to this paper." };
    }

    const canDelete =
      paper.addedById === user.id || membership.role === "OWNER";

    if (!canDelete) {
      return { error: "Only the person who added this paper or a workspace owner can delete it." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.activity.deleteMany({ where: { paperId } });
      await tx.comment.deleteMany({ where: { paperId } });
      await tx.note.deleteMany({ where: { paperId } });
      await tx.paperTag.deleteMany({ where: { paperId } });
      await tx.paper.delete({ where: { id: paperId } });
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${paper.workspaceId}`);
    revalidatePath(`/teams/${paper.workspaceId}`);
    return { success: true, workspaceId: paper.workspaceId };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function saveNotes(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const paperId = formData.get("paperId") as string;
  const summary = formData.get("summary") as string;
  const keyFindings = formData.get("keyFindings") as string;
  const openQuestions = formData.get("openQuestions") as string;
  const relevance = formData.get("relevance") as string;
  const freeform = formData.get("freeform") as string;

  try {
    // Check if Note exists, if not create, if yes update
    const existingNote = await prisma.note.findFirst({
      where: { paperId, authorId: user.id },
    });

    if (existingNote) {
      await prisma.note.update({
        where: { id: existingNote.id },
        data: {
          summary,
          keyFindings,
          openQuestions,
          relevance,
          freeform,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.note.create({
        data: {
          paperId,
          authorId: user.id,
          summary,
          keyFindings,
          openQuestions,
          relevance,
          freeform,
        },
      });
    }

    // Log notes activity
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (paper) {
      await prisma.activity.create({
        data: {
          type: "NOTE_ADDED",
          userId: user.id,
          workspaceId: paper.workspaceId,
          paperId: paper.id,
          metadata: {
            title: paper.title,
          },
        },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath(`/paper/${paperId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = (formData.get("name") as string || "").trim();
  const description = (formData.get("description") as string || "").trim() || null;

  if (!name) {
    return { error: "Workspace name is required." };
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    await prisma.activity.create({
      data: {
        type: "WORKSPACE_CREATED",
        userId: user.id,
        workspaceId: workspace.id,
        metadata: {
          name: workspace.name,
          description: workspace.description,
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/teams");
    return { success: true, workspaceId: workspace.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Could not create team." };
  }
}

export async function inviteWorkspaceMember(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const workspaceId = formData.get("workspaceId") as string;
  const email = (formData.get("email") as string || "").trim().toLowerCase();

  if (!workspaceId || !email) {
    return { error: "Workspace and teammate email are required." };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
    include: { workspace: true },
  });

  if (!membership) {
    return { error: "You are not a member of this workspace." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: existingUser.id,
            workspaceId,
          },
        },
      });

      if (existingMembership) {
        return { error: "That person is already on this team." };
      }
    }

    const existingInvite = await (prisma as any).workspaceInvite.findFirst({
      where: {
        email,
        workspaceId,
        acceptedAt: null,
      },
    });

    if (existingInvite) {
      return { error: "That person already has a pending invite." };
    }

    const token = crypto.randomUUID();

    await (prisma as any).workspaceInvite.create({
      data: {
        token,
        email,
        workspaceId,
        invitedById: user.id,
      },
    });

    await prisma.activity.create({
      data: {
        type: "INVITE_CREATED",
        userId: user.id,
        workspaceId,
        metadata: {
          email,
          token,
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/teams");
    revalidatePath(`/teams/${workspaceId}`);
    revalidatePath("/invites");
    return { success: true, inviteToken: token, email, workspaceName: membership.workspace.name };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function acceptWorkspaceInvite(formData: FormData) {
  const inviteId = formData.get("inviteId") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Not authenticated" };
  }

  const invite = await (prisma as any).workspaceInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite || invite.acceptedAt) {
    return { error: "Invite not found." };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "This invite is not for your account." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: invite.workspaceId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    });

    await (tx as any).workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    await tx.activity.create({
      data: {
        type: "MEMBER_JOINED",
        userId: user.id,
        workspaceId: invite.workspaceId,
        paperId: null,
        metadata: { email: user.email },
      },
    });
  });

  revalidatePath("/invites");
  revalidatePath("/teams");
  revalidatePath(`/teams/${invite.workspaceId}`);
  redirect(`/dashboard/${invite.workspaceId}`);
}

export async function declineWorkspaceInvite(formData: FormData) {
  const inviteId = formData.get("inviteId") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Not authenticated" };
  }

  const invite = await (prisma as any).workspaceInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    return { error: "Invite not found." };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "This invite is not for your account." };
  }

  await (prisma as any).workspaceInvite.delete({
    where: { id: invite.id },
  });

  revalidatePath("/invites");
  revalidatePath("/teams");
  redirect("/invites");
}

export async function leaveWorkspace(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  if (!membership) {
    return { error: "You are not a member of this team." };
  }

  if (membership.role === "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });

    if (ownerCount <= 1) {
      return { error: "You are the only owner. Add another owner before leaving." };
    }
  }

  await prisma.workspaceMember.delete({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  await prisma.activity.create({
    data: {
      type: "MEMBER_LEFT",
      userId: user.id,
      workspaceId,
      paperId: null,
      metadata: { email: user.email },
    },
  });

  revalidatePath("/teams");
  revalidatePath(`/teams/${workspaceId}`);
  return { success: true, redirectTo: "/teams" };
}

export async function removeWorkspaceMember(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const memberUserId = formData.get("memberUserId") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const [actorMembership, targetMembership] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    }),
    prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: memberUserId,
          workspaceId,
        },
      },
      include: { user: true },
    }),
  ]);

  if (actorMembership?.role !== "OWNER") {
    return { error: "Only owners can remove members." };
  }

  if (!targetMembership) {
    return { error: "Member not found." };
  }

  if (targetMembership.role === "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });

    if (ownerCount <= 1) {
      return { error: "A team must have at least one owner." };
    }
  }

  await prisma.workspaceMember.delete({
    where: {
      userId_workspaceId: {
        userId: memberUserId,
        workspaceId,
      },
    },
  });

  await prisma.activity.create({
    data: {
      type: "MEMBER_REMOVED",
      userId: user.id,
      workspaceId,
      paperId: null,
      metadata: { removedEmail: targetMembership.user.email },
    },
  });

  revalidatePath("/teams");
  revalidatePath(`/teams/${workspaceId}`);
  return { success: true };
}

export async function deleteWorkspace(formData: FormData) {
  const workspaceId = formData.get("workspaceId") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
  });

  if (membership?.role !== "OWNER") {
    return { error: "Only owners can delete a team." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { workspaceId } });
    await tx.comment.deleteMany({ where: { paper: { workspaceId } } });
    await tx.note.deleteMany({ where: { paper: { workspaceId } } });
    await tx.paperTag.deleteMany({ where: { paper: { workspaceId } } });
    await tx.tag.deleteMany({ where: { workspaceId } });
    await tx.paper.deleteMany({ where: { workspaceId } });
    await (tx as any).workspaceInvite.deleteMany({ where: { workspaceId } });
    await tx.workspaceMember.deleteMany({ where: { workspaceId } });
    await tx.workspace.delete({ where: { id: workspaceId } });
  });

  revalidatePath("/dashboard");
  revalidatePath("/teams");
  return { success: true, redirectTo: "/teams" };
}

export async function joinWorkspaceInvite(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const invite = await (prisma as any).workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return { error: "Invite not found." };
    }

    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return { error: "This invite is not for your account." };
    }

    await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: invite.workspaceId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    });

    await (prisma as any).workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    await prisma.activity.create({
      data: {
        type: "MEMBER_JOINED",
        userId: user.id,
        workspaceId: invite.workspaceId,
        paperId: null,
        metadata: {
          email: user.email,
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, workspaceId: invite.workspaceId };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function updateLastActiveWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveWorkspaceId: workspaceId },
    });
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

