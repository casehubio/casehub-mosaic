import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OAuthFlowController } from './oauth-flow-controller.js';

describe('OAuthFlowController', () => {
  let controller: OAuthFlowController;
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    controller = new OAuthFlowController();
    openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
  });

  afterEach(() => {
    controller.cancel();
    vi.restoreAllMocks();
  });

  it('opens popup with authorization URL', async () => {
    const fakePopup = { closed: false, close: vi.fn() } as unknown as Window;
    openSpy.mockReturnValue(fakePopup);

    const promise = controller.start({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?state=abc',
      state: 'abc',
      expectedOrigin: 'http://localhost:8080',
    });

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'oauth-callback', code: 'auth-code-123', state: 'abc' },
      origin: 'http://localhost:8080',
    }));

    const result = await promise;
    expect(result.code).toBe('auth-code-123');
    expect(result.state).toBe('abc');
    expect(openSpy).toHaveBeenCalled();
  });

  it('rejects messages from wrong origin', async () => {
    const fakePopup = { closed: false, close: vi.fn() } as unknown as Window;
    openSpy.mockReturnValue(fakePopup);

    const promise = controller.start({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?state=abc',
      state: 'abc',
      expectedOrigin: 'http://localhost:8080',
    });

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'oauth-callback', code: 'stolen', state: 'abc' },
      origin: 'https://evil.com',
    }));

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'oauth-callback', code: 'real-code', state: 'abc' },
      origin: 'http://localhost:8080',
    }));

    const result = await promise;
    expect(result.code).toBe('real-code');
  });

  it('ignores messages with wrong state', async () => {
    const fakePopup = { closed: false, close: vi.fn() } as unknown as Window;
    openSpy.mockReturnValue(fakePopup);

    const promise = controller.start({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?state=abc',
      state: 'abc',
      expectedOrigin: 'http://localhost:8080',
    });

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'oauth-callback', code: 'code', state: 'wrong-state' },
      origin: 'http://localhost:8080',
    }));

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'oauth-callback', code: 'code', state: 'abc' },
      origin: 'http://localhost:8080',
    }));

    const result = await promise;
    expect(result.state).toBe('abc');
  });

  it('throws when popup blocked and no redirect fallback', async () => {
    openSpy.mockReturnValue(null);
    await expect(controller.start({
      authorizationUrl: 'https://example.com',
      state: 'abc',
      expectedOrigin: 'http://localhost:8080',
      redirectFallback: false,
    })).rejects.toThrow('popup blocked');
  });

  it('checkRedirectReturn returns null when no pending state', () => {
    expect(OAuthFlowController.checkRedirectReturn()).toBeNull();
  });

  it('cleans up previous flow when start() called twice', async () => {
    const fakePopup1 = { closed: false, close: vi.fn() } as unknown as Window;
    const fakePopup2 = { closed: false, close: vi.fn() } as unknown as Window;
    openSpy.mockReturnValueOnce(fakePopup1).mockReturnValueOnce(fakePopup2);

    const promise1 = controller.start({
      authorizationUrl: 'https://example.com?state=first',
      state: 'first',
      expectedOrigin: 'http://localhost:8080',
    });

    const promise2 = controller.start({
      authorizationUrl: 'https://example.com?state=second',
      state: 'second',
      expectedOrigin: 'http://localhost:8080',
    });

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'oauth-callback', code: 'code2', state: 'second' },
      origin: 'http://localhost:8080',
    }));

    const result = await promise2;
    expect(result.code).toBe('code2');
    expect(result.state).toBe('second');
  });

  it('rejects when popup is closed by user', async () => {
    vi.useFakeTimers();
    const fakePopup = { closed: false, close: vi.fn() } as unknown as Window & { closed: boolean };
    openSpy.mockReturnValue(fakePopup);

    const promise = controller.start({
      authorizationUrl: 'https://example.com?state=abc',
      state: 'abc',
      expectedOrigin: 'http://localhost:8080',
    });

    (fakePopup as { closed: boolean }).closed = true;
    vi.advanceTimersByTime(600);

    await expect(promise).rejects.toThrow('OAuth popup closed by user');
    vi.useRealTimers();
  });
});
