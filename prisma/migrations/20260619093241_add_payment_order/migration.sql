-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL,
    "packageName" TEXT,
    "packageType" TEXT,
    "packageValue" INTEGER,
    "screenshot" TEXT NOT NULL,
    "recognizedText" TEXT,
    "status" TEXT NOT NULL,
    "redemptionCodeId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentOrder_redemptionCodeId_fkey" FOREIGN KEY ("redemptionCodeId") REFERENCES "RedemptionCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
