import { redirect } from "next/navigation";
import { joinWorkspaceInvite } from "@/app/actions";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const res = await joinWorkspaceInvite(token);

  if (!res) {
    return <div className="p-8">Invalid invite response.</div>;
  }

  if (res.error) {
    // If not authenticated, redirect to login preserving return path
    if (res.error === "Not authenticated") {
      redirect(`/login?next=/invite/${token}`);
    }
    return <div className="p-8">Invite error: {res.error}</div>;
  }

  if ((res as any).success && (res as any).workspaceId) {
    redirect(`/dashboard/${(res as any).workspaceId}`);
  }

  return <div className="p-8">Processing invite…</div>;
}
