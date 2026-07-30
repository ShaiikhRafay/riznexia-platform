import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MinRoleGuard } from '../guards/min-role.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

// Module M3 (DECISIONS.md D-023). Global so MinRoleGuard/PermissionsGuard
// run on every request without each feature module re-importing this one —
// same pattern as DatabaseModule/CacheModule. Registered in app.module.ts
// after AuthModule (which provides ClerkAuthGuard + RolesGuard), so the
// full chain is: ClerkAuthGuard -> RolesGuard -> MinRoleGuard ->
// PermissionsGuard (Doc 16 §15, extended for M3). Both guards no-op when
// their decorator isn't present on a route, so adding this module doesn't
// change behavior for any route that doesn't opt in.
@Global()
@Module({
  providers: [
    { provide: APP_GUARD, useClass: MinRoleGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class RbacModule {}
