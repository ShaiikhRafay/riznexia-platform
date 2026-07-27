import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

export interface ClerkJwtPayload {
  sub: string; // Clerk user id
}

// Thin adapter over @clerk/backend — the only place in the codebase that
// calls Clerk's token-verification API directly (Doc 12 §2: external I/O
// goes through a dedicated provider class, never called ad hoc elsewhere).
@Injectable()
export class ClerkService {
  constructor(private readonly config: ConfigService) {}

  async verifyToken(token: string): Promise<ClerkJwtPayload> {
    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    const payload = await verifyToken(token, { secretKey });
    return { sub: payload.sub };
  }
}
