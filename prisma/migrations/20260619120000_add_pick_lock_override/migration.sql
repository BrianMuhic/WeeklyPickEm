-- CreateEnum
CREATE TYPE "PickLockOverride" AS ENUM ('AUTO', 'LOCKED', 'UNLOCKED');

-- AlterTable
ALTER TABLE "PickDeadline" ADD COLUMN "lockOverride" "PickLockOverride" NOT NULL DEFAULT 'AUTO';
