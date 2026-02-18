-- CreateTable
CREATE TABLE "Fan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "residenceArea" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "fanId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "venueArea" TEXT NOT NULL,
    "attendCount" INTEGER NOT NULL DEFAULT 1,
    "merchAmountJPY" INTEGER NOT NULL DEFAULT 0,
    "superchatAmountJPY" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventLog_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Fan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AreaMultiplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromArea" TEXT NOT NULL,
    "toArea" TEXT NOT NULL,
    "multiplier" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Fan_displayName_idx" ON "Fan"("displayName");

-- CreateIndex
CREATE INDEX "Fan_residenceArea_idx" ON "Fan"("residenceArea");

-- CreateIndex
CREATE INDEX "EventLog_date_idx" ON "EventLog"("date");

-- CreateIndex
CREATE INDEX "EventLog_fanId_date_idx" ON "EventLog"("fanId", "date");

-- CreateIndex
CREATE INDEX "EventLog_eventType_date_idx" ON "EventLog"("eventType", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE INDEX "AreaMultiplier_fromArea_toArea_idx" ON "AreaMultiplier"("fromArea", "toArea");

-- CreateIndex
CREATE UNIQUE INDEX "AreaMultiplier_fromArea_toArea_key" ON "AreaMultiplier"("fromArea", "toArea");
