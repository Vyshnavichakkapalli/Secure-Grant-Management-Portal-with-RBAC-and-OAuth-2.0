const { serializeUser, serializeGrant, serializeApplication } = require('../../src/views/serializers');
const { getCache, fallbackCache } = require('../../src/db/redis');

describe('Serializers & Cache Unit Tests', () => {
  test('serializers return null when input is null/undefined', () => {
    expect(serializeUser(null)).toBeNull();
    expect(serializeGrant(null)).toBeNull();
    expect(serializeApplication(null)).toBeNull();
  });

  test('serializeUser formats fields and defaults roles to empty array', () => {
    const user = {
      id: 'u-1',
      name: 'Test',
      email: 't@example.com'
    };
    const res = serializeUser(user);
    expect(res.roles).toEqual([]);
    expect(res.oauthProvider).toBeNull();
  });

  test('fallbackCache handles set, get, del, flushAll, ping, quit with TTL', async () => {
    const cache = fallbackCache;
    await cache.flushAll();

    expect(await cache.ping()).toBe('PONG');
    expect(await cache.quit()).toBe('OK');

    await cache.set('key1', 'val1');
    expect(await cache.get('key1')).toBe('val1');

    await cache.del('key1');
    expect(await cache.get('key1')).toBeNull();

    // With expiry
    await cache.set('expiringKey', 'val', { EX: 1 });
    expect(await cache.get('expiringKey')).toBe('val');

    expect(getCache()).toBeDefined();
  });
});
