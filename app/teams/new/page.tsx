"use client";

import { useTransition } from "react";
import { createWorkspace } from "@/app/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewTeamPage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createWorkspace(formData);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      if (res?.workspaceId) {
        router.push(`/dashboard/${res.workspaceId}`);
      }
    });
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent/35">
      <div className="fixed left-0 top-0 bottom-0 w-3 bg-accent-forest/10 border-r border-border z-10" />

      <div className="max-w-xl mx-auto px-6 pl-10 py-12">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-muted uppercase tracking-wider hover:text-ink mb-8 group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
          Back to Teams
        </Link>

        <h1 className="font-serif text-4xl font-bold tracking-tight text-ink mb-2">New Team</h1>
        <p className="font-mono text-xs text-ink-muted uppercase tracking-wider mb-10">
          Create a shared workspace for your research group
        </p>

        <div className="w-full h-px bg-border mb-8" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-mono text-xs text-ink-muted uppercase">Team Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. ML Reading Group"
              disabled={isPending}
              className="h-11 rounded-none border-border bg-paper font-sans text-sm placeholder:text-ink-muted/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="font-mono text-xs text-ink-muted uppercase">Description <span className="text-ink-muted/50">(optional)</span></Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="What is this team working on?"
              disabled={isPending}
              className="rounded-none border-border bg-paper font-sans text-sm placeholder:text-ink-muted/40 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-ink hover:bg-ink-muted text-paper rounded-none font-serif text-base h-12 cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Team"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
