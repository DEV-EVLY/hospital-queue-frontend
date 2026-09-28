import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectGroup {
  group: string;
  options: SelectOption[];
}

type SelectItems = SelectOption[] | SelectGroup[];

function isGrouped(items: SelectItems): items is SelectGroup[] {
  return items.length > 0 && 'group' in items[0];
}

interface SelectProps {
  options: SelectItems;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm:  'px-3 py-1.5 text-xs rounded-lg',
  md:  'px-3 py-2.5 text-sm rounded-lg',
  lg:  'px-4 py-3 text-base rounded-xl',
};

const dropdownItemSize = {
  sm:  'px-3 py-1.5 text-xs',
  md:  'px-3 py-2.5 text-sm',
  lg:  'px-4 py-3 text-sm',
};

export const Select = ({
  options, value, onChange, label, placeholder = 'Seleccionar...',
  error, hint, fullWidth, disabled, size = 'md', className,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  // Find selected label across flat and grouped options
  const selectedLabel = (() => {
    if (isGrouped(options)) {
      for (const g of options) {
        const found = g.options.find(o => o.value === value);
        if (found) return found.label;
      }
    } else {
      return (options as SelectOption[]).find(o => o.value === value)?.label;
    }
  })();

  // Flatten options for keyboard navigation
  const flat: SelectOption[] = isGrouped(options)
    ? (options as SelectGroup[]).flatMap(g => g.options.filter(o => !o.disabled))
    : (options as SelectOption[]).filter(o => !o.disabled);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) { setOpen(true); setActiveIndex(flat.findIndex(o => o.value === value)); }
      else if (activeIndex >= 0) { onChange(flat[activeIndex].value); setOpen(false); }
    }
    if (e.key === 'Escape') { setOpen(false); }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActiveIndex(i => Math.min(i + 1, flat.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    }
  };

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const renderOptions = (opts: SelectOption[]) =>
    opts.map((opt, i) => (
      <motion.button
        key={opt.value}
        type="button"
        disabled={opt.disabled}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.02 }}
        onClick={() => handleSelect(opt)}
        className={clsx(
          'w-full text-left flex items-center justify-between gap-3 transition-colors duration-100',
          dropdownItemSize[size],
          opt.disabled
            ? 'opacity-40 cursor-not-allowed text-surface-400'
            : 'hover:bg-primary-50 hover:text-primary-800 cursor-pointer',
          opt.value === value && 'text-primary-700 font-medium',
          opt.value === value && 'bg-primary-50/60',
          i === activeIndex && 'bg-surface-100',
        )}
      >
        <span className="flex flex-col gap-0.5">
          <span>{opt.label}</span>
          {opt.description && (
            <span className="text-xs text-surface-400 font-normal">{opt.description}</span>
          )}
        </span>
        {opt.value === value && <Check size={14} className="shrink-0 text-primary-600" />}
      </motion.button>
    ));

  return (
    <div
      ref={containerRef}
      className={clsx('flex flex-col gap-1 relative', fullWidth && 'w-full', className)}
    >
      {label && (
        <label id={labelId} className="text-sm font-medium text-surface-700 select-none">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        aria-labelledby={label ? labelId : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={clsx(
          'flex items-center justify-between gap-2 w-full bg-white border text-left transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          sizeClasses[size],
          error
            ? 'border-red-400'
            : open
              ? 'border-primary-500 ring-2 ring-primary-500/20'
              : 'border-surface-200 hover:border-surface-300',
          disabled && 'bg-surface-50 text-surface-400 cursor-not-allowed opacity-60',
          !disabled && 'cursor-pointer',
        )}
      >
        <span className={clsx('truncate', !selectedLabel && 'text-surface-400')}>
          {selectedLabel ?? placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="shrink-0 text-surface-400"
        >
          <ChevronDown size={15} />
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top' }}
            className="absolute z-50 w-full top-full mt-1.5 bg-white rounded-xl border border-surface-200 shadow-card-lg overflow-hidden"
            role="listbox"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {isGrouped(options)
                ? (options as SelectGroup[]).map(group => (
                    <div key={group.group}>
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-surface-400 bg-surface-50 border-b border-surface-100">
                        {group.group}
                      </p>
                      {renderOptions(group.options)}
                    </div>
                  ))
                : renderOptions(options as SelectOption[])
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="text-xs text-surface-500">{hint}</p>}
    </div>
  );
};
