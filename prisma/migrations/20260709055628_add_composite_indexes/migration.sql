-- CreateIndex
CREATE INDEX "Activity_workspaceId_createdAt_idx" ON "Activity"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Paper_workspaceId_status_idx" ON "Paper"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Paper_workspaceId_createdAt_idx" ON "Paper"("workspaceId", "createdAt");
