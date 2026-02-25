-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'expired', 'qualified', 'rejected');

-- CreateEnum
CREATE TYPE "FunnelStep" AS ENUM ('collect_name', 'collect_birth_date', 'collect_weight_loss_reason', 'qualified', 'rejected');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "funnelStep" "FunnelStep" NOT NULL DEFAULT 'collect_name',
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "name" TEXT,
    "birthDate" TIMESTAMP(3),
    "weightLossReason" TEXT,
    "qualified" BOOLEAN,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_phoneNumber_key" ON "Conversation"("phoneNumber");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
