import { useSyncExternalStore } from 'react';
import { getLang, setLang, subscribe } from './store';
import type { Lang } from './languages';

/**
 * Suscribe un componente al idioma actual. Basta con llamarlo en <App />: al cambiar el idioma se vuelve a
 * renderizar todo el árbol sin perder el estado (a diferencia de remontar con `key`).
 */
export function useLang(): [Lang, (lang: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return [lang, setLang];
}
