export type AuthenticatorTransport = 'usb' | 'ble' | 'nfc' | 'internal' | 'hybrid';

export interface WebAuthnCredential {
  readonly credentialId: string;
  readonly displayName: string;
  readonly transports: readonly AuthenticatorTransport[];
  readonly discoverable: boolean;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
}
