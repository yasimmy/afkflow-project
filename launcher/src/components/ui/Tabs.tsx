import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div
      role="tablist"
      className={[
        'flex items-center gap-0.5 bg-bg-primary rounded-lg p-1 border border-[rgba(255,255,255,0.06)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={[
              'relative flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent',
              isActive
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isActive && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-0 bg-bg-card rounded-md shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
