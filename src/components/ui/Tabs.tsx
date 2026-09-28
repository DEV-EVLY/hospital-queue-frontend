import React from 'react';
import { clsx } from 'clsx';

interface Tab {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, active, onChange, className }: TabsProps) => (
  <div className={clsx('flex gap-1 bg-surface-100 p-1 rounded-xl', className)}>
    {tabs.map(tab => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none flex-1 justify-center',
          active === tab.key
            ? 'bg-white text-surface-900 shadow-card'
            : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50',
        )}
      >
        {tab.icon && <span className="shrink-0">{tab.icon}</span>}
        <span>{tab.label}</span>
        {tab.count !== undefined && (
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded-full font-semibold',
            active === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-surface-200 text-surface-500',
          )}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

interface SideTabsProps extends TabsProps {
  vertical?: boolean;
}

export const SideTabs = ({ tabs, active, onChange, className }: SideTabsProps) => (
  <div className={clsx('flex flex-col gap-0.5', className)}>
    {tabs.map(tab => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left w-full',
          active === tab.key
            ? 'bg-primary-50 text-primary-800 font-semibold'
            : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
        )}
      >
        {tab.icon && (
          <span className={clsx('shrink-0', active === tab.key ? 'text-primary-600' : 'text-surface-400')}>
            {tab.icon}
          </span>
        )}
        <span className="flex-1">{tab.label}</span>
        {tab.count !== undefined && (
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded-full',
            active === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-500',
          )}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);
