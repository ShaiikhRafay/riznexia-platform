import { Controller, Get } from '@nestjs/common';

// Infra endpoint for uptime checks and deploy smoke tests (Doc 16 §13, Doc 14 §3) —
// not a domain/business feature, so it's in scope for scaffolding.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
