-- CreateEnum
CREATE TYPE "AuthoringModule" AS ENUM ('past', 'future', 'faults', 'virtues');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OceanResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OceanResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthoringDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" "AuthoringModule" NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthoringDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OceanResult_userId_idx" ON "OceanResult"("userId");

-- CreateIndex
CREATE INDEX "AuthoringDocument_userId_idx" ON "AuthoringDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthoringDocument_userId_module_key" ON "AuthoringDocument"("userId", "module");

-- AddForeignKey
ALTER TABLE "OceanResult" ADD CONSTRAINT "OceanResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthoringDocument" ADD CONSTRAINT "AuthoringDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
