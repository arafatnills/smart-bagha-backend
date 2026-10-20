/*
  Warnings:

  - Changed the type of `bloodGroup` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "bloodGroup",
ADD COLUMN     "bloodGroup" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "donars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "laseDonateDate" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "donars_email_key" ON "donars"("email");

-- CreateIndex
CREATE UNIQUE INDEX "donars_userId_key" ON "donars"("userId");

-- CreateIndex
CREATE INDEX "idx_patient_email" ON "donars"("email");

-- AddForeignKey
ALTER TABLE "donars" ADD CONSTRAINT "donars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
