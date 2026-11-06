'use client';

import React from 'react';
import { Compass, Target, Layers, LayoutGrid } from 'lucide-react';

export type MobilePanel = 'map' | 'workflow' | 'layers' | 'analytics';

/** Bottom tab bar for phones and tablets (hidden ≥ 1024 px via .mobile-bottom-nav). */
export default function MobileBottomNav({
  active,
  onSelect,
  hasArea,
  readyLayersCount,
  hasResults,
}: {
  active: MobilePanel;
  onSelect: (panel: MobilePanel) => void;
  hasArea: boolean;
  readyLayersCount: number;
  hasResults: boolean;
}) {
  const tabs: { id: MobilePanel; label: string; Icon: typeof Compass; badge?: React.ReactNode }[] = [
    { id: 'map', label: 'Map', Icon: Compass },
    {
      id: 'workflow',
      label: 'Workflow',
      Icon: Target,
      badge: hasArea ? <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#C96B3C] ring-2 ring-[#FAF9F5]" /> : null,
    },
    {
      id: 'layers',
      label: 'Layers',
      Icon: Layers,
      badge:
        readyLayersCount > 0 ? (
          <span className="absolute -top-1 -right-2 px-1 text-[8.5px] font-bold rounded-full bg-[#C96B3C] text-white">
            {readyLayersCount}
          </span>
        ) : null,
    },
    {
      id: 'analytics',
      label: 'Results',
      Icon: LayoutGrid,
      badge: hasResults ? <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#C96B3C] ring-2 ring-[#FAF9F5]" /> : null,
    },
  ];

  return (
    <nav className="mobile-bottom-nav select-none" aria-label="Workspace panels">
      {tabs.map(({ id, label, Icon, badge }) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={on}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
              on ? 'text-[#C96B3C]' : 'text-[#69706A] hover:text-[#1A1D23]'
            }`}
          >
            <span className="relative">
              <Icon className="w-5 h-5" />
              {badge}
            </span>
            <span className={`text-[10px] tracking-tight mt-0.5 ${on ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
