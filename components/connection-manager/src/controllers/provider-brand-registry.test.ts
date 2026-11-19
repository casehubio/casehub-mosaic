import { describe, it, expect } from 'vitest';
import { ProviderBrandRegistry, defaultBrandRegistry } from './provider-brand-registry.js';

describe('ProviderBrandRegistry', () => {
  it('defaultBrandRegistry has google', () => {
    const brand = defaultBrandRegistry.get('google');
    expect(brand).not.toBeNull();
    expect(brand!.displayName).toBe('Google');
    expect(brand!.brandColor).toMatch(/^#/);
    expect(brand!.icon).toContain('<svg');
  });

  it('defaultBrandRegistry has github', () => {
    expect(defaultBrandRegistry.has('github')).toBe(true);
  });

  it('defaultBrandRegistry has slack', () => {
    expect(defaultBrandRegistry.has('slack')).toBe(true);
  });

  it('defaultBrandRegistry has discord', () => {
    expect(defaultBrandRegistry.has('discord')).toBe(true);
  });

  it('returns null for unknown provider', () => {
    expect(defaultBrandRegistry.get('unknown')).toBeNull();
  });

  it('custom instance allows registration', () => {
    const registry = new ProviderBrandRegistry();
    registry.register('custom', {
      providerId: 'custom',
      displayName: 'Custom',
      icon: '<svg></svg>',
      brandColor: '#000',
    });
    expect(registry.get('custom')).not.toBeNull();
    expect(registry.get('custom')!.displayName).toBe('Custom');
  });

  it('custom registration overrides built-in', () => {
    const registry = new ProviderBrandRegistry();
    registry.register('google', {
      providerId: 'google',
      displayName: 'Custom Google',
      icon: '<svg>custom</svg>',
      brandColor: '#000',
    });
    expect(registry.get('google')!.displayName).toBe('Custom Google');
  });
});
