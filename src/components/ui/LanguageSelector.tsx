import React from 'react';
import { Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { LANGUAGES, isLang, tr, useLang } from '../../i18n';

interface LanguageSelectorProps {
  /** `compact`: lista desplegable con ícono (barras superiores). `pills`: botones grandes (kiosko, táctil). */
  variant?: 'compact' | 'pills';
  className?: string;
}

/** Selector de idioma siempre visible. Cambia el idioma de toda la aplicación y lo recuerda en el equipo. */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'compact', className }) => {
  const [lang, setLang] = useLang();

  if (variant === 'pills') {
    return (
      <div role="group" aria-label={tr('ui.language')}
        className={clsx('flex flex-wrap items-center gap-1 p-1 rounded-xl bg-surface-100 border border-surface-200', className)}>
        {LANGUAGES.map(l => (
          <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={l.code === lang}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors select-none',
              l.code === lang ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-600 hover:bg-white',
            )}>
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className={clsx(
      'flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-surface-50 border border-surface-200 text-surface-600',
      'hover:bg-surface-100 focus-within:ring-2 focus-within:ring-primary-300 transition-colors', className)}>
      <Globe size={14} className="shrink-0" aria-hidden />
      <span className="sr-only">{tr('ui.language')}</span>
      <select value={lang} onChange={e => { if (isLang(e.target.value)) setLang(e.target.value); }}
        aria-label={tr('ui.language')}
        className="bg-transparent text-xs font-semibold text-surface-700 outline-none cursor-pointer pr-1">
        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
};
