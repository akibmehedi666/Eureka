"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const focusArea = formData.get("focusArea") as string;
  const avatarFile = formData.get("avatarFile") as File;
  
  let avatarUrl = formData.get("avatarUrl") as string || null;

  try {
    // 1. Upload avatar to Supabase Storage if file is provided
    if (avatarFile && avatarFile.size > 0) {
      // Ensure avatars bucket exists (ignore errors if it already exists or permissions don't allow creation)
      await supabase.storage.createBucket("avatars", {
        public: true,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
      }).catch(() => {});

      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        return { error: `Avatar upload failed: ${uploadError.message}` };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      avatarUrl = publicUrl;
    }

    // 2. Update user profile in Prisma PostgreSQL
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.email?.split("@")[0] || "User",
        bio: bio || null,
        focusArea: focusArea || null,
        avatarUrl,
        lastActiveAt: new Date(),
      },
    });

    revalidatePath("/profile");
    revalidatePath("/");
    
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}
