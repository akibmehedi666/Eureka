"use client";

import { useState } from "react";
import { inviteWorkspaceMember } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send } from "lucide-react";

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsPending(true);
    const formData = new FormData();
    formData.append("workspaceId", workspaceId);
    formData.append("email", email.trim().toLowerCase());
    try {
      const res = await inviteWorkspaceMember(formData);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Invite created for ${res?.email}`);
      setEmail("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <Input
          type="email"
          placeholder="teammate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          className="flex-1 h-8 rounded-none text-xs"
        />
        <Button
          type="submit"
          disabled={isPending}
          className="h-8 px-3 bg-accent-forest hover:bg-accent-forest/90 text-paper rounded-none text-xs cursor-pointer"
        >
          <Send className="h-3 w-3" />
          Invite
        </Button>
      </form>
      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-muted/70">
        They will see this in Invites after logging in or signing up with that email.
      </p>
    </div>
  );
}
