import { z } from 'zod';
import { domainSchema } from './domain';
import { websiteDeploymentSchema } from './website-deployment';

// Module M11 — the "DeploymentStatus" output from the founder's brief is
// not a stored table: it's a computed rollup over the latest
// WebsiteDeployment and its Domain, same "compute fresh, nothing new
// stored" pattern as WebsiteGenerationStatus (DECISIONS.md D-088).
export const deploymentStatusSchema = z.object({
  generatedAt: z.string().datetime(),
  leadId: z.string().uuid(),
  latestDeployment: websiteDeploymentSchema.nullable(),
  domain: domainSchema.nullable(),
  // `status === 'completed' && healthStatus === 'healthy'` on
  // latestDeployment — precomputed here so a client never has to
  // re-derive the same two-field rule the API itself invented.
  productionReady: z.boolean(),
});
export type DeploymentStatusSnapshot = z.infer<typeof deploymentStatusSchema>;
