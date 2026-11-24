import React from 'react';
import { Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { LANGUAGES, tr, useLang, type Lang } from '../../i18n';
import { Select } from './Select';

interface LanguageSelectorProps {
  /** `compact`: desplegable del design system con ícono (barras superiores). `pills`: botones grandes (kiosko, táctil). */
  variant?: 'compact' | 'pills';
  className?: string;
}

const OPTIONS = LANGUAGES.map(l => ({ value: l.code, label: l.label }));

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
    <Select<Lang>
      size="sm"
      options={OPTIONS}
      value={lang}
      onChange={setLang}
      icon={<Globe size={14} />}
      ariaLabel={tr('ui.language')}
      className={clsx('w-auto min-w-[8.5rem]', className)}
    />
  );
};
