import { Global, Module } from '@nestjs/common';
import { prisma } from '@riznexia/db';
import { PRISMA_CLIENT } from './database.constants';

// Global so every feature module can @Inject(PRISMA_CLIENT) without each
// one re-importing this module individually (Doc 16 §8).
@Global()
@Module({
  providers: [{ provide: PRISMA_CLIENT, useValue: prisma }],
  exports: [PRISMA_CLIENT],
})
export class DatabaseModule {}
