CREATE TABLE "MobileAuthCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAuthCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileAuthCode_codeHash_key" ON "MobileAuthCode"("codeHash");
CREATE INDEX "MobileAuthCode_expiresAt_idx" ON "MobileAuthCode"("expiresAt");
CREATE INDEX "MobileAuthCode_userId_idx" ON "MobileAuthCode"("userId");

ALTER TABLE "MobileAuthCode"
ADD CONSTRAINT "MobileAuthCode_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
