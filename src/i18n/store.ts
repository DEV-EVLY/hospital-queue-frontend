import { DEFAULT_LANG, LANGUAGES, isLang, type Lang } from './languages';

/**
 * Idioma actual (fuera de React para poder usarlo también en servicios, p. ej. los mensajes de error).
 * Orden de resolución: ?lang= en la URL (se guarda en el equipo) → idioma guardado → español.
 * La cartelera, al ser una pantalla pública, fija su idioma así (parámetro de la URL / configuración del equipo).
 */
const STORAGE_KEY = 'hospital.lang';

const detect = (): Lang => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromUrl)) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch { /* localStorage no disponible: se usa el idioma por defecto */ }
  return DEFAULT_LANG;
};

const applyDocumentLang = (lang: Lang) => {
  document.documentElement.lang = lang;
};

let current: Lang = detect();
applyDocumentLang(current);

const listeners = new Set<() => void>();

export const getLang = (): Lang => current;

export const getLocale = (): string =>
  LANGUAGES.find(l => l.code === current)?.locale ?? 'es-PE';

export const getSpeechLang = (): string =>
  LANGUAGES.find(l => l.code === current)?.speech ?? 'es-ES';

export const setLang = (lang: Lang): void => {
  if (lang === current) return;
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignorar */ }
  applyDocumentLang(lang);
  listeners.forEach(l => l());
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
