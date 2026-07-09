"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bell, Users } from "lucide-react";

interface NavbarLinksProps {
  pendingInviteCount: number;
}

export function NavbarLinks({ pendingInviteCount }: NavbarLinksProps) {
  const pathname = usePathname();

  // Detect the current workspace from the pathname.
  // Handles /dashboard/[workspaceId] routes.
  const dashboardMatch = pathname?.match(/^\/dashboard\/([^/]+)/);
  const workspaceId = dashboardMatch?.[1] ?? null;

  // Build the correct "Team" href:
  // - If inside a specific workspace's library, go straight to that workspace's team page.
  // - Otherwise, go to the general teams list.
  const teamHref = workspaceId ? `/teams/${workspaceId}` : "/teams";

  return (
    <>
      <Link
        href="/dashboard"
        className="inline-flex h-8 items-center gap-1.5 px-2.5 hover:bg-border/30 hover:text-ink"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Library
      </Link>
      <Link
        href={teamHref}
        className="inline-flex h-8 items-center gap-1.5 px-2.5 hover:bg-border/30 hover:text-ink"
      >
        <Users className="h-3.5 w-3.5" />
        Team
      </Link>
      <Link
        href="/invites"
        className="relative inline-flex h-8 items-center gap-1.5 px-2.5 hover:bg-border/30 hover:text-ink"
      >
        <Bell className="h-3.5 w-3.5" />
        Invites
        {pendingInviteCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center bg-accent px-1 font-mono text-[9px] font-bold text-paper">
            {pendingInviteCount}
          </span>
        )}
      </Link>
      <Link
        href="/profile/me"
        className="hidden h-8 items-center px-2.5 hover:bg-border/30 hover:text-ink sm:inline-flex"
      >
        Profile
      </Link>
    </>
  );
}
