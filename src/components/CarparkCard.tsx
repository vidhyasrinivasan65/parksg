import React from 'react';
import { Carpark } from '../types.ts';

interface CarparkCardProps {
  carpark: Carpark;
}

export const CarparkCard: React.FC<CarparkCardProps> = ({ carpark }) => {
  const isFull = carpark.lots === 0;
  const isGreen = carpark.lots > 50;
  const isAmber = carpark.lots >= 1 && carpark.lots <= 50;

  const lotBadgeClasses = isGreen
    ? 'lot-badge-green font-bold'
    : isAmber
    ? 'lot-badge-amber font-bold'
    : 'lot-badge-red font-extrabold tracking-wide';

  const unmapped = carpark.lat === null || carpark.lng === null;

  return (
    <li
      id={`carpark-${carpark.id}`}
      className="min-h-[64px] py-3 px-3.5 bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
            {carpark.agency}
          </span>
          <span className="text-[11px] text-slate-400 font-mono tracking-tight">
            {carpark.id}
          </span>
        </div>

        <h2 className="text-sm font-semibold text-slate-900 truncate leading-snug">
          {carpark.name}
        </h2>

        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
          <span>Agency: {carpark.agency}</span>
          {unmapped && (
            <>
              <span>·</span>
              <span className="text-slate-400">Coord unmapped</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        <span
          id={`lot-badge-${carpark.id}`}
          className={`inline-flex items-center justify-center min-w-[58px] min-h-[36px] px-2.5 py-1 rounded-xl text-xs ${lotBadgeClasses}`}
        >
          {isFull ? 'FULL' : carpark.lots}
        </span>
      </div>
    </li>
  );
};
