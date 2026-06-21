-- AlterTable
ALTER TABLE "Holding" ADD COLUMN "logoUrl" TEXT;

-- CreateTable
CREATE TABLE "LogoCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "LogoCache_key_key" ON "LogoCache"("key");
