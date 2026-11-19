export interface OAuthFlowOptions {
  authorizationUrl: string;
  state: string;
  expectedOrigin: string;
  popupWidth?: number;
  popupHeight?: number;
  redirectFallback?: boolean;
}

export interface OAuthFlowResult {
  code: string;
  state: string;
}

export class OAuthFlowController {
  private cleanup: (() => void) | null = null;

  async start(options: OAuthFlowOptions): Promise<OAuthFlowResult> {
    this.doCleanup();
    const {
      authorizationUrl,
      state,
      expectedOrigin,
      popupWidth = 500,
      popupHeight = 600,
      redirectFallback = true,
    } = options;

    const left = (screen.width - popupWidth) / 2;
    const top = (screen.height - popupHeight) / 2;
    const features = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no`;

    const popup = window.open(authorizationUrl, 'oauth-popup', features);

    if (!popup) {
      if (redirectFallback) {
        sessionStorage.setItem('oauth-pending-state', state);
        sessionStorage.setItem('oauth-return-url', window.location.href);
        window.location.href = authorizationUrl;
        return new Promise(() => {});
      }
      throw new Error('popup blocked');
    }

    return new Promise<OAuthFlowResult>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        if (event.origin !== expectedOrigin) return;
        const data = event.data;
        if (data?.type !== 'oauth-callback') return;
        if (data.state !== state) return;

        this.doCleanup();
        popup.close();
        resolve({ code: data.code, state: data.state });
      };

      const pollTimer = window.setInterval(() => {
        if (popup.closed) {
          this.doCleanup();
          reject(new Error('OAuth popup closed by user'));
        }
      }, 500);

      this.cleanup = () => {
        window.removeEventListener('message', onMessage);
        window.clearInterval(pollTimer);
        this.cleanup = null;
      };

      window.addEventListener('message', onMessage);
    });
  }

  cancel(): void {
    this.doCleanup();
  }

  private doCleanup(): void {
    this.cleanup?.();
  }

  static checkRedirectReturn(): OAuthFlowResult | null {
    const state = sessionStorage.getItem('oauth-pending-state');
    if (!state) return null;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return null;

    sessionStorage.removeItem('oauth-pending-state');
    sessionStorage.removeItem('oauth-return-url');
    return { code, state };
  }
}
