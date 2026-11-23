/** Idiomas soportados. `locale` se usa para fechas/números (Intl) y `speech` para la síntesis de voz. */
export const LANGUAGES = [
  { code: 'es', label: 'Español',   locale: 'es-PE', speech: 'es-ES' },
  { code: 'en', label: 'English',   locale: 'en-US', speech: 'en-US' },
  { code: 'de', label: 'Deutsch',   locale: 'de-DE', speech: 'de-DE' },
  { code: 'pt', label: 'Português', locale: 'pt-BR', speech: 'pt-BR' },
  { code: 'it', label: 'Italiano',  locale: 'it-IT', speech: 'it-IT' },
  // Runasimi (quechua): sin soporte Intl ni voz propia → fechas y voz en español
  { code: 'qu', label: 'Runasimi',  locale: 'es-PE', speech: 'es-ES' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANG: Lang = 'es';

export const isLang = (value: unknown): value is Lang =>
  LANGUAGES.some(l => l.code === value);
