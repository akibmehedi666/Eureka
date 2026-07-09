"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { deleteWorkspace, leaveWorkspace, removeWorkspaceMember } from "@/app/actions";

type TeamActionButtonProps = {
  action: "leave" | "remove" | "delete";
  workspaceId: string;
  memberUserId?: string;
  className: string;
  children: React.ReactNode;
};

export function TeamActionButton({
  action,
  workspaceId,
  memberUserId,
  className,
  children,
}: TeamActionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (action === "delete" && !window.confirm("Delete this team and all of its papers, notes, activity, members, and invites?")) {
      return;
    }

    const formData = new FormData();
    formData.append("workspaceId", workspaceId);
    if (memberUserId) {
      formData.append("memberUserId", memberUserId);
    }

    startTransition(async () => {
      const result =
        action === "leave"
          ? await leaveWorkspace(formData)
          : action === "remove"
            ? await removeWorkspaceMember(formData)
            : await deleteWorkspace(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (action === "remove") {
        toast.success("Member removed.");
        router.refresh();
        return;
      }

      if (action === "delete") {
        toast.success("Team deleted.");
      }

      if (action === "leave") {
        toast.success("You left the team.");
      }

      if (
        result &&
        "redirectTo" in result &&
        typeof result.redirectTo === "string"
      ) {
        router.push(result.redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={className}>
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}
