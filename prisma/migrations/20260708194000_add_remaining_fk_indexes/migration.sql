-- Add remaining foreign-key indexes used by hot route queries.
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

CREATE INDEX "Paper_assignedToId_idx" ON "Paper"("assignedToId");

CREATE INDEX "Tag_workspaceId_idx" ON "Tag"("workspaceId");

CREATE INDEX "PaperTag_tagId_idx" ON "PaperTag"("tagId");
