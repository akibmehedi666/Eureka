"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function getPostAuthPath(email: string) {
  const pendingInviteCount = await (prisma as any).workspaceInvite.count({
    where: {
      email: email.toLowerCase(),
      acceptedAt: null,
    },
  });

  return pendingInviteCount > 0 ? "/invites" : "/dashboard";
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Ensure User record exists in public.User table
  const user = data.user;
  let redirectPath = "/dashboard";

  if (user && user.email) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { lastActiveAt: new Date() },
      create: {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name || user.email.split("@")[0],
        avatarUrl: user.user_metadata.avatar_url || null,
        lastActiveAt: new Date(),
      },
    });
    redirectPath = await getPostAuthPath(user.email);
  }

  redirect(redirectPath);
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  let errorMsg: string | null = null;

  let redirectPath = "/dashboard";

  try {
    const adminClient = createAdminClient();
    
    // Create the user bypasses email confirmation using admin client
    const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split("@")[0],
      }
    });

    if (adminError) {
      return { error: adminError.message };
    }

    const user = adminData.user;
    if (user && user.email) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: { lastActiveAt: new Date() },
        create: {
          id: user.id,
          email: user.email,
          name: name || user.email.split("@")[0],
          lastActiveAt: new Date(),
        },
      });
      redirectPath = await getPostAuthPath(user.email);
    }

    // Now sign them in with password to set cookies/session
    const supabase = await createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      return { error: loginError.message };
    }
  } catch (err: any) {
    errorMsg = err.message || "An unexpected error occurred.";
  }

  if (errorMsg) {
    return { error: errorMsg };
  }

  redirect(redirectPath);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
