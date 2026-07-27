import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

// Infra endpoint for uptime checks and deploy smoke tests (Doc 16 §13, Doc 14 §3) —
// not a domain/business feature, so it's in scope for scaffolding.
// @Public() — uptime monitors and Railway's own health probes can't
// authenticate; this must stay reachable even though ClerkAuthGuard is
// global by default (Doc 16 §15).
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
