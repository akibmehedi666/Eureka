-- CreateIndex
CREATE INDEX "Activity_workspaceId_idx" ON "Activity"("workspaceId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_paperId_idx" ON "Activity"("paperId");

-- CreateIndex
CREATE INDEX "Comment_paperId_idx" ON "Comment"("paperId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Note_paperId_idx" ON "Note"("paperId");

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

-- CreateIndex
CREATE INDEX "Paper_workspaceId_idx" ON "Paper"("workspaceId");

-- CreateIndex
CREATE INDEX "Paper_addedById_idx" ON "Paper"("addedById");

-- CreateIndex
CREATE INDEX "Paper_status_idx" ON "Paper"("status");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "WorkspaceInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_email_idx" ON "WorkspaceInvite"("email");
