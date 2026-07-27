import { PrismaClient } from '@prisma/client';

// Singleton pattern — avoids exhausting Postgres connections under Next.js/Nest
// hot-reload in dev, where a naive `new PrismaClient()` per import would create
// a fresh pool on every file change. Doc 16 §8 (connection pooling).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
