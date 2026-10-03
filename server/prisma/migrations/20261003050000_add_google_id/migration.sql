ALTER TABLE "Admin" ADD COLUMN "googleId" TEXT;

CREATE UNIQUE INDEX "Admin_googleId_key" ON "Admin"("googleId");
