import React, { useEffect, useId, useRef } from 'react';
import { clsx } from 'clsx';
import { Check, Minus } from 'lucide-react';

type Variant = 'plain' | 'card';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  /** Texto de apoyo bajo la etiqueta */
  description?: string;
  /**
   * `plain`: casilla + texto en línea (formularios).
   * `card`: casilla dentro de un recuadro que se resalta al marcarse (listas de opciones; usar con `checked`).
   */
  variant?: Variant;
  /** Estado mixto ("seleccionar todos" con selección parcial). No cambia `checked`. */
  indeterminate?: boolean;
  error?: string;
}

/**
 * Casilla de verificación del design system.
 * El `<input>` nativo se conserva (oculto visualmente) para teclado, lectores de pantalla y formularios;
 * la casilla visible es un `<span>` que reacciona a su estado con `peer-*`.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, variant = 'plain', indeterminate = false, error, className, id, disabled, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const innerRef = useRef<HTMLInputElement | null>(null);

    // `indeterminate` solo existe como propiedad del DOM, no como atributo
    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    const checked = rest.checked === true;
    const filled = checked || indeterminate;

    return (
      <div className={clsx('flex flex-col gap-1', className)}>
        <label
          htmlFor={inputId}
          className={clsx(
            'flex items-start gap-2.5 text-sm select-none',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            variant === 'card' && [
              'px-3 py-2 rounded-lg border transition-colors',
              filled
                ? 'border-primary-300 bg-primary-50 text-primary-800'
                : 'border-surface-200 text-surface-700 hover:bg-surface-50',
            ],
            variant === 'plain' && 'text-surface-800',
          )}
        >
          <input
            {...rest}
            ref={setRefs}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-checked={indeterminate ? 'mixed' : undefined}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={clsx(
              'mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border bg-white text-white transition-colors',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
              'peer-checked:border-primary-600 peer-checked:bg-primary-600',
              'peer-checked:[&_svg]:opacity-100',
              error ? 'border-red-400' : 'border-surface-300 hover:border-primary-400',
              indeterminate && 'border-primary-600 bg-primary-600',
            )}
          >
            {indeterminate
              ? <Minus size={12} strokeWidth={3} />
              : <Check size={12} strokeWidth={3} className="opacity-0 transition-opacity" />}
          </span>
          {(label || description) && (
            <span className="flex flex-col">
              {label && <span className="leading-snug">{label}</span>}
              {description && <span className="text-xs text-surface-500 leading-snug">{description}</span>}
            </span>
          )}
        </label>
        {error && <p className="text-xs text-red-600 pl-7">{error}</p>}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';
