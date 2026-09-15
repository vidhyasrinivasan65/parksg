import React from 'react';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { AppState } from '../types.ts';

interface StateViewsProps {
  state: AppState;
  zoneLabel: string;
}

export const StateViews: React.FC<StateViewsProps> = ({ state, zoneLabel }) => {
  if (state === 'loading') {
    return (
      <div
        id="state-loading-view"
        className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center"
      >
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700 max-w-xs leading-relaxed">
          Checking live lot counts…
        </p>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div
        id="state-empty-view"
        className="flex-1 flex flex-col items-center justify-center py-14 px-5 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80 my-2"
      >
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mb-3 font-mono font-bold">
          0
        </div>
        <p className="text-sm font-medium text-slate-600 max-w-xs leading-relaxed">
          {`No live counts for ${zoneLabel} at the moment. LTA carparks in this zone may not be reporting right now — try another zone.`}
        </p>
      </div>
    );
  }

  if (state === 'refused') {
    return (
      <div
        id="state-refused-view"
        className="flex-1 flex flex-col items-center justify-center py-14 px-5 text-center bg-amber-50/80 rounded-2xl border border-amber-200/80 my-2"
      >
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3 font-bold text-base">
          !
        </div>
        <p className="text-sm font-medium text-amber-900 max-w-xs leading-relaxed">
          {"LTA turned down our request. This is on our side — we're looking at it. Try again in a minute."}
        </p>
      </div>
    );
  }

  if (state === 'unreachable') {
    return (
      <div
        id="state-unreachable-view"
        className="flex-1 flex flex-col items-center justify-center py-14 px-5 text-center bg-red-50/80 rounded-2xl border border-red-200/80 my-2"
      >
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3 font-bold text-base">
          ✕
        </div>
        <p className="text-sm font-medium text-red-900 max-w-xs leading-relaxed">
          {"We can't reach LTA DataMall right now. Nothing's wrong with your connection — the feed itself is down."}
        </p>
      </div>
    );
  }

  return null;
};
