import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './i18n';
import en from './locales/en/common.json';
import es from './locales/es/common.json';
import fr from './locales/fr/common.json';
import pt from './locales/pt/common.json';

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

// ---- B-6: aiProviders copy correctness across all 4 locales -----------------

describe('i18n aiProviders keys — honest security copy (B-6)', () => {
  const locales = [
    { name: 'en', data: en },
    { name: 'es', data: es },
    { name: 'fr', data: fr },
    { name: 'pt', data: pt },
  ] as const;

  const requiredKeys = [
    'presetSectionLabel',
    'customManual',
    'removeDialogDescription',
    'migrationBannerTitle',
    'migrationBannerBody',
    'migrationBannerDismiss',
    'apiKeyPlaceholder',
    'saveButton',
  ] as const;

  for (const { name, data } of locales) {
    it(`${name}: has all required aiProviders keys`, () => {
      const keys = data.settings.aiProviders as Record<string, string>;
      for (const key of requiredKeys) {
        expect(keys, `${name} missing key: ${key}`).toHaveProperty(key);
        expect(keys[key], `${name}.${key} must not be empty`).toBeTruthy();
      }
    });
  }

  it('en: removeDialogDescription does not reference browser', () => {
    expect(en.settings.aiProviders.removeDialogDescription.toLowerCase()).not.toContain(
      'from your browser',
    );
    expect(en.settings.aiProviders.removeDialogDescription.toLowerCase()).toContain('server');
  });

  it('es: removeDialogDescription does not reference browser', () => {
    expect(es.settings.aiProviders.removeDialogDescription.toLowerCase()).not.toContain(
      'de tu navegador',
    );
    expect(es.settings.aiProviders.removeDialogDescription.toLowerCase()).toContain('servidor');
  });

  it('fr: removeDialogDescription does not reference browser', () => {
    expect(fr.settings.aiProviders.removeDialogDescription.toLowerCase()).not.toContain(
      'de votre navigateur',
    );
    expect(fr.settings.aiProviders.removeDialogDescription.toLowerCase()).toContain('serveur');
  });

  it('pt: removeDialogDescription does not reference browser', () => {
    expect(pt.settings.aiProviders.removeDialogDescription.toLowerCase()).not.toContain(
      'do seu navegador',
    );
    expect(pt.settings.aiProviders.removeDialogDescription.toLowerCase()).toContain('servidor');
  });
});
