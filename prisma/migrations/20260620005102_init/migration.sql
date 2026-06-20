-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "priceInterval" TEXT NOT NULL DEFAULT 'MANUAL',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrokerConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'LIVE',
    "encryptedToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" DATETIME,
    "lastSyncMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrokerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "yahooSymbol" TEXT NOT NULL,
    "name" TEXT,
    "exchange" TEXT,
    "isin" TEXT,
    "currency" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "avgCost" REAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "brokerConnectionId" TEXT,
    "accountName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Holding_brokerConnectionId_fkey" FOREIGN KEY ("brokerConnectionId") REFERENCES "BrokerConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Watchlist',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchlistId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "yahooSymbol" TEXT NOT NULL,
    "name" TEXT,
    "exchange" TEXT,
    "currency" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "yahooSymbol" TEXT NOT NULL,
    "currency" TEXT,
    "price" REAL,
    "previousClose" REAL,
    "change" REAL,
    "changePercent" REAL,
    "marketState" TEXT,
    "shortName" TEXT,
    "exchange" TEXT,
    "asOf" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stale" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "asOf" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "fileName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "brokerConnectionId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "itemsSynced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SyncLog_brokerConnectionId_fkey" FOREIGN KEY ("brokerConnectionId") REFERENCES "BrokerConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "BrokerConnection_userId_idx" ON "BrokerConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerConnection_userId_provider_environment_key" ON "BrokerConnection"("userId", "provider", "environment");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_yahooSymbol_source_key" ON "Holding"("userId", "yahooSymbol", "source");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_watchlistId_idx" ON "WatchlistItem"("watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_watchlistId_yahooSymbol_key" ON "WatchlistItem"("watchlistId", "yahooSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "PriceQuote_yahooSymbol_key" ON "PriceQuote"("yahooSymbol");

-- CreateIndex
CREATE INDEX "PriceQuote_yahooSymbol_idx" ON "PriceQuote"("yahooSymbol");

-- CreateIndex
CREATE INDEX "FxRate_base_quote_idx" ON "FxRate"("base", "quote");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_base_quote_key" ON "FxRate"("base", "quote");

-- CreateIndex
CREATE INDEX "ImportJob_userId_idx" ON "ImportJob"("userId");

-- CreateIndex
CREATE INDEX "SyncLog_userId_idx" ON "SyncLog"("userId");
