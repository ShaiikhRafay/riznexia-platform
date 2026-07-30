import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './soft-delete.extension';

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  // Cast: `$extends` returns a structurally-compatible-but-nominally-distinct
  // client type. Every call site types its injected client as `PrismaClient`
  // (apps/api/src/**/*.service.ts via the PRISMA_CLIENT DI token), so the
  // extended client is handed back through that same, already-established
  // type rather than leaking Prisma's extension-client type repo-wide.
  return client.$extends(softDeleteExtension) as unknown as PrismaClient;
}

// Singleton pattern — avoids exhausting Postgres connections under Next.js/Nest
// hot-reload in dev, where a naive `new PrismaClient()` per import would create
// a fresh pool on every file change. Doc 16 §8 (connection pooling).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
