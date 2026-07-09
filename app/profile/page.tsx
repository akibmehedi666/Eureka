import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./profile-form";
import Link from "next/link";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch or create public.User record corresponding to auth.user
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata.name || user.email!.split("@")[0],
        lastActiveAt: new Date(),
      },
    });
  } else {
    // Touch lastActiveAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
  }

  const [papersReadingCount, notesCount, totalPapersCount] = await Promise.all([
    prisma.paper.count({
      where: {
        assignedToId: user.id,
        status: "READING",
      },
    }),
    prisma.note.count({
      where: { authorId: user.id },
    }),
    prisma.paper.count({
      where: {
        OR: [
          { addedById: user.id },
          { assignedToId: user.id },
        ],
      },
    }),
  ]);

  const formattedLastActive = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dbUser.lastActiveAt);

  return (
    <div className="min-h-screen w-full bg-paper text-ink selection:bg-accent/35 flex flex-col">
      {/* Header Navbar */}
      <header className="border-b border-border py-4 px-6 md:px-8 bg-paper flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/profile/me"
            className="p-1.5 hover:bg-border/20 border border-transparent hover:border-border transition-all flex items-center justify-center text-ink rounded-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-serif text-lg font-bold tracking-tight">Eureka!</span>
          <span className="text-border">|</span>
          <span className="font-mono text-xs uppercase text-ink-muted">My Profile</span>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Stats & Details Notebook Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="border border-border bg-paper p-6 relative overflow-hidden shadow-[0_4px_16px_rgba(28,31,38,0.02)]">
            {/* Margins/Lined Journal cover details */}
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-accent/40" />
            <h2 className="font-serif text-xl font-bold mb-4 pl-2 text-ink">Your Stats</h2>
            
            <div className="space-y-4 pl-2">
              {/* Stat Item: Papers Reading */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 text-ink-muted">
                  <BookOpen className="h-4 w-4 text-accent-forest" />
                  <span className="font-mono text-xs uppercase">Currently Reading</span>
                </div>
                <span className="font-mono text-sm font-semibold">{papersReadingCount} papers</span>
              </div>

              {/* Stat Item: Total Notes */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 text-ink-muted">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="font-mono text-xs uppercase">Notes Written</span>
                </div>
                <span className="font-mono text-sm font-semibold">{notesCount} notes</span>
              </div>

              {/* Stat Item: Total Papers Library */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 text-ink-muted">
                  <FileText className="h-4 w-4 text-ink-muted" />
                  <span className="font-mono text-xs uppercase">Library Papers</span>
                </div>
                <span className="font-mono text-sm font-semibold">{totalPapersCount} papers</span>
              </div>

              {/* Stat Item: Last Active */}
              <div className="space-y-1 pt-1">
                <span className="font-mono text-[10px] text-ink-muted uppercase block">Last active</span>
                <span className="font-mono text-xs text-ink-muted/90 block leading-tight">{formattedLastActive}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Details form */}
        <div className="md:col-span-2 border border-border bg-paper p-6 md:p-8 relative shadow-[0_4px_16px_rgba(28,31,38,0.02)]">
          {/* Lined notebook side column effect */}
          <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-accent-forest/15 border-r border-border/50" />
          
          <div className="pl-6 space-y-6">
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-ink">My Profile</h1>
              <p className="font-mono text-xs text-ink-muted uppercase mt-1">Update your name, photo, and bio</p>
            </div>
            
            <ProfileForm user={{
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              bio: dbUser.bio,
              focusArea: dbUser.focusArea,
              avatarUrl: dbUser.avatarUrl
            }} />
          </div>
        </div>

      </div>
    </div>
  );
}
