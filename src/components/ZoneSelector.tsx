import React from 'react';
import { ZONES_LIST } from '../data/mockCarparks.ts';
import { ZoneCode } from '../types.ts';

interface ZoneSelectorProps {
  selectedZone: ZoneCode;
  onSelectZone: (zone: ZoneCode) => void;
  updatedTime: string;
}

export const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  selectedZone,
  onSelectZone,
  updatedTime,
}) => {
  const currentZoneInfo = ZONES_LIST.find((z) => z.value === selectedZone) || ZONES_LIST[0];

  return (
    <section aria-label="Parking Zones" className="mb-3">
      <div className="grid grid-cols-2 gap-2" id="zone-buttons-container">
        {ZONES_LIST.map((zone) => {
          const isSelected = zone.value === selectedZone;
          return (
            <button
              key={zone.value}
              id={`zone-btn-${zone.value}`}
              type="button"
              onClick={() => onSelectZone(zone.value)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center text-center transition-all cursor-pointer select-none active:scale-[0.98] ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
              }`}
            >
              {zone.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-3 pb-1 border-b border-slate-100 font-medium">
        <span id="updated-timestamp">Updated {updatedTime} · from LTA DataMall</span>
        <span id="active-zone-badge" className="text-[11px] font-semibold text-slate-400">
          Zone: {currentZoneInfo.label}
        </span>
      </div>
    </section>
  );
};
