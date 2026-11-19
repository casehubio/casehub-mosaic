export const ConnectionManagerTopics = {
  CONNECT: 'connection.connect',
  DISCONNECT: 'connection.disconnect',
  CONSENT: 'connection.consent',
  OAUTH_COMPLETE: 'oauth.complete',
  OAUTH_ERROR: 'oauth.error',
  PASSKEY_REGISTER_REQUEST: 'passkey.register-request',
  PASSKEY_REGISTERED: 'passkey.registered',
  PASSKEY_REGISTER_ERROR: 'passkey.register-error',
  PASSKEY_AUTHENTICATE_REQUEST: 'passkey.authenticate-request',
  PASSKEY_AUTHENTICATED: 'passkey.authenticated',
  PASSKEY_AUTHENTICATE_ERROR: 'passkey.authenticate-error',
  PASSKEY_REVOKE: 'passkey.revoke',
} as const;
