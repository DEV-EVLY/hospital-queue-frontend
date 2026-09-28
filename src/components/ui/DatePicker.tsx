import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

const DAYS   = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const cells: (Date | null)[] = [];

  // Leading days from previous month
  for (let i = first - 1; i >= 0; i--)
    cells.push(new Date(year, month - 1, daysInPrev - i));

  // Current month days
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(year, month, d));

  // Trailing days from next month
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++)
    cells.push(new Date(year, month + 1, d));

  return cells;
}

interface DatePickerProps {
  value: string;           // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  min?: string;
  max?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DatePicker = ({
  value, onChange, label, placeholder = 'dd/mm/aaaa',
  error, hint, min, max, fullWidth, disabled, className,
}: DatePickerProps) => {
  const selected = parseDate(value);
  const today    = new Date();
  const labelId  = useId();

  const [open, setOpen]     = useState(false);
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [view, setView]     = useState<{ year: number; month: number }>({
    year:  selected?.getFullYear()  ?? today.getFullYear(),
    month: selected?.getMonth()     ?? today.getMonth(),
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goMonth = (dir: 1 | -1) => {
    setNavDir(dir);
    setView(v => {
      let m = v.month + dir;
      let y = v.year;
      if (m > 11) { m = 0; y++; }
      if (m < 0)  { m = 11; y--; }
      return { year: y, month: m };
    });
  };

  const handleSelectDay = (day: Date) => {
    const iso = toISO(day);
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange(iso);
    setOpen(false);
  };

  const days = buildCalendarDays(view.year, view.month);

  const isDisabledDay = (day: Date): boolean => {
    const iso = toISO(day);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const isCurrentMonth = (day: Date) => day.getMonth() === view.month;

  return (
    <div ref={containerRef} className={clsx('flex flex-col gap-1 relative', fullWidth && 'w-full', className)}>
      {label && (
        <label id={labelId} className="text-sm font-medium text-surface-700 select-none">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={clsx(
          'flex items-center justify-between gap-2 w-full bg-white border text-left transition-all duration-150',
          'px-3 py-2.5 text-sm rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          error
            ? 'border-red-400'
            : open
              ? 'border-primary-500 ring-2 ring-primary-500/20'
              : 'border-surface-200 hover:border-surface-300',
          disabled && 'bg-surface-50 text-surface-400 cursor-not-allowed opacity-60',
          !disabled && 'cursor-pointer',
        )}
      >
        <span className={clsx(!selected && 'text-surface-400')}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <Calendar size={15} className="shrink-0 text-surface-400" />
      </button>

      {/* Calendar panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 top-full mt-1.5 bg-white rounded-xl border border-surface-200 shadow-card-lg overflow-hidden w-72"
          >
            {/* Month/Year navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-900 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>

              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${view.year}-${view.month}`}
                  initial={{ opacity: 0, x: navDir * 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: navDir * -20 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-semibold text-surface-900 select-none"
                >
                  {MONTHS[view.month]} {view.year}
                </motion.span>
              </AnimatePresence>

              <button
                type="button"
                onClick={() => goMonth(1)}
                className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-900 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 px-3 pt-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-surface-400 uppercase py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${view.year}-${view.month}-grid`}
                initial={{ opacity: 0, x: navDir * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: navDir * -24 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-7 px-3 pb-3 gap-y-0.5"
              >
                {days.map((day, i) => {
                  if (!day) return <span key={i} />;
                  const isSelected  = selected && sameDay(day, selected);
                  const isToday     = sameDay(day, today);
                  const isCurrent   = isCurrentMonth(day);
                  const isOff       = isDisabledDay(day);

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isOff}
                      onClick={() => handleSelectDay(day)}
                      className={clsx(
                        'relative mx-auto flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-100',
                        isSelected
                          ? 'bg-primary-700 text-white font-bold shadow-sm'
                          : isToday
                            ? 'ring-2 ring-primary-400 ring-offset-1 text-primary-700 font-semibold'
                            : isCurrent
                              ? 'text-surface-800 hover:bg-primary-50 hover:text-primary-700'
                              : 'text-surface-300',
                        isOff && 'opacity-30 cursor-not-allowed pointer-events-none',
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Quick actions */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-surface-100 bg-surface-50">
              <button
                type="button"
                onClick={() => handleSelectDay(today)}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
              >
                Hoy
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="text-xs text-surface-400 hover:text-red-500 font-medium transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="text-xs text-surface-500">{hint}</p>}
    </div>
  );
};
