import type { Lang } from '../languages';
import { es } from './es';
import type { MessageKey } from './es';
import { en } from './en';
import { de } from './de';
import { pt } from './pt';
import { it } from './it';
import { qu } from './qu';

export { es };
export type { MessageKey };

/** Español es siempre completo; el resto puede faltar y entonces se muestra el texto en español. */
export const catalogs: Record<Lang, Partial<Record<MessageKey, string>>> = { es, en, de, pt, it, qu };
