import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      const user = data.user;
      if (user.email) {
        // Synchronize authenticated user with public.User table
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
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
}
