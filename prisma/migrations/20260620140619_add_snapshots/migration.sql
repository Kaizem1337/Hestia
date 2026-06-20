-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "capturedDate" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "totalValue" REAL NOT NULL,
    "costBasis" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_idx" ON "PortfolioSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_userId_capturedDate_key" ON "PortfolioSnapshot"("userId", "capturedDate");
