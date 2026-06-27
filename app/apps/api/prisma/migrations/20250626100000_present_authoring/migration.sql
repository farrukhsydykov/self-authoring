-- AlterEnum
ALTER TYPE "AuthoringModule" ADD VALUE 'present';

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "presentOverview" JSONB;
