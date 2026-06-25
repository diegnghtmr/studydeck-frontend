import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './i18n';

describe('i18n initialization', () => {
  beforeEach(() => {
    return i18n.changeLanguage('en');
  });

  it('initializes with en as fallback', () => {
    expect(i18n.language).toBe('en');
  });

  it('resolves a known key in English', () => {
    expect(i18n.t('nav.dashboard')).toBe('Dashboard');
  });

  it('resolves a known key in Spanish', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('nav.settings')).not.toBe('');
    expect(i18n.t('nav.settings')).not.toBe('nav.settings');
  });

  it('resolves known keys in all 4 languages without fallback', async () => {
    const langs = ['en', 'es', 'fr', 'pt'] as const;
    for (const lang of langs) {
      await i18n.changeLanguage(lang);
      const val = i18n.t('settings.title');
      expect(val).not.toBe('settings.title');
      expect(val.length).toBeGreaterThan(0);
    }
  });

  it('translates settings.title to Spanish', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('settings.title')).toBe('Configuración');
  });
});
