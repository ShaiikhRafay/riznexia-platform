import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Redis } from '@upstash/redis';
import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService', () => {
  let client: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    incrbyfloat: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let service: RedisCacheService;

  beforeEach(() => {
    client = {
      get: vi.fn(),
      set: vi.fn(),
      incrbyfloat: vi.fn(),
      ttl: vi.fn(),
      expire: vi.fn(),
      del: vi.fn(),
    };
    service = new RedisCacheService(client as unknown as Redis);
  });

  describe('getJson / setJson', () => {
    it('returns null on a cache miss', async () => {
      client.get.mockResolvedValue(null);
      await expect(service.getJson('k')).resolves.toBeNull();
    });

    it('returns the cached value on a hit', async () => {
      client.get.mockResolvedValue({ a: 1 });
      await expect(service.getJson('k')).resolves.toEqual({ a: 1 });
    });

    it('sets with an expiry when ttlSeconds is provided', async () => {
      await service.setJson('k', { a: 1 }, 60);
      expect(client.set).toHaveBeenCalledWith('k', { a: 1 }, { ex: 60 });
    });

    it('sets without an expiry when ttlSeconds is omitted', async () => {
      await service.setJson('k', { a: 1 });
      expect(client.set).toHaveBeenCalledWith('k', { a: 1 });
    });
  });

  describe('getOrSetJson', () => {
    it('returns the cached value without calling compute on a hit', async () => {
      client.get.mockResolvedValue('cached');
      const compute = vi.fn();
      await expect(service.getOrSetJson('k', 60, compute)).resolves.toBe('cached');
      expect(compute).not.toHaveBeenCalled();
    });

    it('computes and caches on a miss', async () => {
      client.get.mockResolvedValue(null);
      const compute = vi.fn().mockResolvedValue('fresh');
      await expect(service.getOrSetJson('k', 60, compute)).resolves.toBe('fresh');
      expect(client.set).toHaveBeenCalledWith('k', 'fresh', { ex: 60 });
    });
  });

  describe('incrementCounter', () => {
    it('sets an expiry when the key has none (ttl === -1)', async () => {
      client.incrbyfloat.mockResolvedValue(5);
      client.ttl.mockResolvedValue(-1);
      const result = await service.incrementCounter('k', 5, 3600);
      expect(result).toBe(5);
      expect(client.expire).toHaveBeenCalledWith('k', 3600);
    });

    it('does not re-set an expiry when the key already has one', async () => {
      client.incrbyfloat.mockResolvedValue(10);
      client.ttl.mockResolvedValue(1800);
      await service.incrementCounter('k', 5, 3600);
      expect(client.expire).not.toHaveBeenCalled();
    });
  });

  describe('getCounter', () => {
    it('returns 0 when the key does not exist', async () => {
      client.get.mockResolvedValue(null);
      await expect(service.getCounter('k')).resolves.toBe(0);
    });

    it('returns the stored value when present', async () => {
      client.get.mockResolvedValue(42);
      await expect(service.getCounter('k')).resolves.toBe(42);
    });
  });

  describe('delete', () => {
    it('delegates to the client', async () => {
      await service.delete('k');
      expect(client.del).toHaveBeenCalledWith('k');
    });
  });
});
