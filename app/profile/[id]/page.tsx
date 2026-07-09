import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeammateProfile({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  const [dbUser, papers, activities] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.paper.findMany({
      where: { OR: [{ addedById: id }, { assignedToId: id }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.activity.findMany({
      where: { userId: id },
      include: { paper: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  if (!dbUser) return notFound();

  return (
    <div className="min-h-screen w-full bg-paper text-ink selection:bg-accent/35 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-sm text-ink-muted">Back</Link>
          <h1 className="font-serif text-2xl font-bold">{dbUser.name}</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 border border-border bg-paper p-4">
            <div className="space-y-3">
              <div className="h-24 w-24 bg-accent/10 border border-border flex items-center justify-center">{dbUser.avatarUrl ? <img src={dbUser.avatarUrl} alt={dbUser.name} /> : dbUser.name?.[0]}</div>
              <div>
                <div className="font-mono text-xs text-ink-muted uppercase">Focus</div>
                <div className="text-sm">{dbUser.focusArea || '—'}</div>
              </div>
              <div>
                <div className="font-mono text-xs text-ink-muted uppercase">Bio</div>
                <div className="text-sm">{dbUser.bio || 'No biography provided.'}</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="border border-border bg-paper p-4">
              <h2 className="font-serif text-lg font-bold">Recent Papers</h2>
              <div className="mt-3 space-y-2">
                {papers.map(p => (
                  <div key={p.id} className="py-2 border-b border-border">
                    <Link href={`/paper/${p.id}`} className="font-semibold">{p.title}</Link>
                    <div className="text-xs text-ink-muted">{p.authors}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border bg-paper p-4">
              <h2 className="font-serif text-lg font-bold">Recent Activity</h2>
              <div className="mt-3 space-y-2 text-sm text-ink-muted">
                {activities.map(a => (
                  <div key={a.id} className="py-2 border-b border-border">
                    <div>{a.type.replace(/_/g, ' ')}</div>
                    {a.paper ? <Link href={`/paper/${a.paper.id}`} className="font-semibold">{a.paper.title}</Link> : null}
                    <div className="text-xs">{new Intl.DateTimeFormat('en-US',{dateStyle:'short', timeStyle:'short'}).format(new Date(a.createdAt))}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
