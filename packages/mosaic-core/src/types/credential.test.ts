import { describe, it, expectTypeOf } from 'vitest';
import type { WebAuthnCredential, AuthenticatorTransport } from './credential.js';

describe('credential types', () => {
  it('AuthenticatorTransport is a string union', () => {
    expectTypeOf<AuthenticatorTransport>().toEqualTypeOf<'usb' | 'ble' | 'nfc' | 'internal' | 'hybrid'>();
  });

  it('WebAuthnCredential has required fields', () => {
    const cred: WebAuthnCredential = {
      credentialId: 'cred-1',
      displayName: 'MacBook Pro Touch ID',
      transports: ['internal'],
      discoverable: true,
      createdAt: '2026-01-01T00:00:00Z',
      lastUsedAt: null,
    };
    expectTypeOf(cred.transports).toEqualTypeOf<readonly AuthenticatorTransport[]>();
    expectTypeOf(cred.lastUsedAt).toEqualTypeOf<string | null>();
  });
});
