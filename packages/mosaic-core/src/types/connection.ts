export type ServiceConnectionStatus = 'CONNECTED' | 'PARTIAL' | 'DISCONNECTED';

export interface ServiceConnection {
  readonly provider: string;
  readonly status: ServiceConnectionStatus;
  readonly grantedScopes: readonly string[];
  readonly missingScopes: readonly string[];
  readonly connectedAt: string | null;
}

export interface ConsentRequest {
  readonly authorizationUrl: string;
  readonly provider: string;
  readonly requestedScopes: readonly string[];
  readonly state: string;
}

export interface ProviderBrand {
  readonly providerId: string;
  readonly displayName: string;
  readonly icon: string;
  readonly brandColor: string;
}
