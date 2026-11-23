import { catalogs, es } from './messages';
import type { MessageKey } from './messages';
import { getLang, getLocale } from './store';

/** Todas las claves existentes (el catálogo en español es la fuente de verdad). */
export type { MessageKey };
export type Params = Record<string, string | number>;

/** Claves base de los plurales: `x.one` / `x.other` → `x`. */
export type PluralKey = Extract<MessageKey, `${string}.other`> extends infer K
  ? K extends `${infer B}.other` ? B : never
  : never;

const interpolate = (text: string, params?: Params): string =>
  params ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`)) : text;

/**
 * Traduce una clave al idioma actual. Si el idioma no tiene la traducción (p. ej. quechua en el panel de
 * administración) se usa el español.
 */
export function tr(key: MessageKey, params?: Params): string {
  const text = catalogs[getLang()][key] ?? es[key];
  return interpolate(text, params);
}

/** Plural según el idioma actual: usa las claves `base.one` y `base.other`. El parámetro `{n}` se rellena solo. */
export function trp(base: PluralKey, n: number, params?: Params): string {
  const form = new Intl.PluralRules(getLocale()).select(n) === 'one' ? 'one' : 'other';
  return tr(`${base}.${form}` as MessageKey, { n, ...params });
}
