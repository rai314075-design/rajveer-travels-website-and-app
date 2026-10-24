import { PrismaClient } from "@prisma/client";

// Prevents exhausting DB connections from hot-reload creating new clients in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
