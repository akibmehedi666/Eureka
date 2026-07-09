"use client";

import { useEffect } from "react";
import { updateLastActiveWorkspace } from "@/app/actions";

interface Props {
  workspaceId: string;
}

export function ActiveWorkspaceTracker({ workspaceId }: Props) {
  useEffect(() => {
    if (workspaceId) {
      updateLastActiveWorkspace(workspaceId);
    }
  }, [workspaceId]);

  return null;
}
