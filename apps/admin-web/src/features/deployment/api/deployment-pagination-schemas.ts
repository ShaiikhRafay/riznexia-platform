import { deploymentHealthCheckSchema, websiteDeploymentSchema } from '@riznexia/shared-types';
import { z } from 'zod';

// Same local-only paginated-envelope convention as CRM's
// `crm-pagination-schemas.ts` — `packages/shared-types` exports the item
// schemas but not their `{items, nextCursor}` wrapper shapes, since those
// only exist as backend-local TypeScript interfaces
// (`PaginatedWebsiteDeployments`, `PaginatedDeploymentHealthChecks`).
export const paginatedWebsiteDeploymentsSchema = z.object({
  items: z.array(websiteDeploymentSchema),
  nextCursor: z.string().nullable(),
});

export const paginatedDeploymentHealthChecksSchema = z.object({
  items: z.array(deploymentHealthCheckSchema),
  nextCursor: z.string().nullable(),
});
