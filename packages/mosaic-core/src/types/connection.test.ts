import { describe, it, expectTypeOf } from 'vitest';
import type { ServiceConnection, ServiceConnectionStatus, ConsentRequest, ProviderBrand } from './connection.js';

describe('connection types', () => {
  it('ServiceConnectionStatus is a string union', () => {
    expectTypeOf<ServiceConnectionStatus>().toEqualTypeOf<'CONNECTED' | 'PARTIAL' | 'DISCONNECTED'>();
  });

  it('ServiceConnection has required fields', () => {
    const conn: ServiceConnection = {
      provider: 'google',
      status: 'CONNECTED',
      grantedScopes: ['email', 'profile'],
      missingScopes: [],
      connectedAt: '2026-01-01T00:00:00Z',
    };
    expectTypeOf(conn.provider).toBeString();
    expectTypeOf(conn.grantedScopes).toEqualTypeOf<readonly string[]>();
  });

  it('ConsentRequest has required fields', () => {
    const req: ConsentRequest = {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
      provider: 'google',
      requestedScopes: ['calendar'],
      state: 'abc123',
    };
    expectTypeOf(req.authorizationUrl).toBeString();
  });

  it('ProviderBrand has required fields', () => {
    const brand: ProviderBrand = {
      providerId: 'google',
      displayName: 'Google',
      icon: '<svg>...</svg>',
      brandColor: '#4285F4',
    };
    expectTypeOf(brand.icon).toBeString();
  });
});
