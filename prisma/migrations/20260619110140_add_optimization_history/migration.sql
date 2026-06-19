-- CreateTable
CREATE TABLE "OptimizationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobDescription" TEXT,
    "originalText" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "OptimizationHistory_userId_idx" ON "OptimizationHistory"("userId");

-- CreateIndex
CREATE INDEX "OptimizationHistory_createdAt_idx" ON "OptimizationHistory"("createdAt");
