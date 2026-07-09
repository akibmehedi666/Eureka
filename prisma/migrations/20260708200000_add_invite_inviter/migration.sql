-- Track who sent each workspace invite so pending invite cards can explain context.
ALTER TABLE "WorkspaceInvite" ADD COLUMN "invitedById" TEXT;

CREATE INDEX "WorkspaceInvite_invitedById_idx" ON "WorkspaceInvite"("invitedById");

ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
