import { describe, expect, it } from 'vitest';
import { createDomainSchema, domainSchema, hostnameSchema } from './domain';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('hostnameSchema', () => {
  it('accepts a plain domain', () => {
    expect(hostnameSchema.safeParse('example.com').success).toBe(true);
  });

  it('accepts a subdomain', () => {
    expect(hostnameSchema.safeParse('shop.example.com').success).toBe(true);
  });

  it('lowercases mixed-case input', () => {
    const result = hostnameSchema.safeParse('Example.COM');
    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe('example.com');
  });

  it('rejects a bare word with no TLD', () => {
    expect(hostnameSchema.safeParse('localhost').success).toBe(false);
  });

  it('rejects a string with spaces', () => {
    expect(hostnameSchema.safeParse('not a domain.com').success).toBe(false);
  });
});

describe('domainSchema', () => {
  it('accepts a fully-verified domain with active SSL', () => {
    expect(
      domainSchema.safeParse({
        id: UUID_A,
        businessId: UUID_A,
        hostname: 'example.com',
        type: 'custom',
        provider: 'vercel',
        verificationStatus: 'verified',
        verificationRecord: { type: 'TXT', name: '_riznexia-verify', value: 'abc123' },
        sslStatus: 'active',
        currentDeploymentId: UUID_A,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('accepts a pending, not-yet-attached domain', () => {
    expect(
      domainSchema.safeParse({
        id: UUID_A,
        businessId: UUID_A,
        hostname: 'example.com',
        type: 'subdomain',
        provider: 'vercel',
        verificationStatus: 'pending',
        verificationRecord: null,
        sslStatus: 'pending',
        currentDeploymentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});

describe('createDomainSchema', () => {
  it('accepts a valid custom domain request', () => {
    expect(createDomainSchema.safeParse({ hostname: 'example.com', type: 'custom' }).success).toBe(
      true,
    );
  });

  it('rejects an invalid hostname', () => {
    expect(createDomainSchema.safeParse({ hostname: 'not a domain', type: 'custom' }).success).toBe(
      false,
    );
  });

  it('has no provider field — the service derives it from whichever DEPLOYMENT_PROVIDER is wired up, never a client choice', () => {
    const result = createDomainSchema.safeParse({
      hostname: 'example.com',
      type: 'custom',
      provider: 'heroku',
    });
    expect(result.success).toBe(true);
    expect(result.success && 'provider' in result.data).toBe(false);
  });
});
