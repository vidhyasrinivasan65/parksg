import React from 'react';
import {
  X,
  Navigation,
  Clock,
  MapPin,
  CornerUpRight,
  CornerUpLeft,
  MoveUp,
  ExternalLink,
} from 'lucide-react';
import { RouteInfo } from '../types.ts';

interface RouteDetailsModalProps {
  route: RouteInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchExternalNav: () => void;
}

export const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({
  route,
  isOpen,
  onClose,
  onLaunchExternalNav,
}) => {
  if (!isOpen || !route) return null;

  const getStepIcon = (turnType?: string) => {
    switch (turnType) {
      case 'left':
      case 'slight-left':
        return <CornerUpLeft className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'right':
      case 'slight-right':
        return <CornerUpRight className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'destination':
        return <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />;
      default:
        return <MoveUp className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-details-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shadow-xs">
              <Navigation className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 id="route-details-title" className="text-base font-bold text-slate-900 leading-tight">
                Route Guidance
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                To {route.destination.label}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close directions"
            aria-label="Close directions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Route Stats Summary */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/70 border-b border-slate-100">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/70 flex items-center gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">
                Drive Time
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {route.durationText}
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/70 flex items-center gap-3 shadow-xs">
            <Navigation className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">
                Distance
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {route.distanceText}
              </div>
            </div>
          </div>
        </div>

        {/* Turn-by-Turn Steps List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Step-by-step navigation
          </div>
          {route.steps.map((step, idx) => (
            <div key={idx} className="py-2.5 flex items-start gap-3">
              <div className="mt-0.5 p-1 rounded-lg bg-slate-100 shrink-0">
                {getStepIcon(step.turnType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
                  {step.instruction}
                </p>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{step.distanceText}</span>
                  {step.durationText && (
                    <>
                      <span>·</span>
                      <span>{step.durationText}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA & Attribution */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            onClick={onLaunchExternalNav}
            className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-200"
          >
            <Navigation className="w-4 h-4" />
            <span>Start Live GPS Navigation</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          {/* Mandatory Google Maps Attribution line */}
          <div className="text-center pt-1">
            <span className="text-[10px] text-slate-400 font-medium block">
              Google Maps
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
