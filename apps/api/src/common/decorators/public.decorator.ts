import { SetMetadata } from '@nestjs/common';

// Marks a route as exempt from ClerkAuthGuard — the escape hatch for the
// signature-verified webhook routes (docs/19-api-architecture.md §Webhooks).
// Every other route is authenticated by default; this must be opted into
// explicitly, never the other way around (Doc 16 §15).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
