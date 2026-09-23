import React, { useState } from 'react';
import { MapPin, Search, X, Check, Save } from 'lucide-react';
import { GeolocationStatus } from '../types.ts';

interface GeolocationBannerProps {
  status: GeolocationStatus;
  manualAddress: string;
  onSetManualAddress: (address: string, savePermanently: boolean) => void;
  onDismiss: () => void;
  onRequestGeolocation: () => void;
}

export const GeolocationBanner: React.FC<GeolocationBannerProps> = ({
  status,
  manualAddress,
  onSetManualAddress,
  onDismiss,
  onRequestGeolocation,
}) => {
  const [inputVal, setInputVal] = useState(manualAddress || '');
  const [savePermanently, setSavePermanently] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Only show if status is denied, unavailable, or timeout
  if (status !== 'denied' && status !== 'unavailable' && status !== 'timeout') {
    return null;
  }

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSetManualAddress(inputVal.trim(), savePermanently);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onDismiss();
    }, 1200);
  };

  const quickAddresses = [
    'Orchard Road',
    'Marina Bay Sands',
    'VivoCity (HarbourFront)',
    'Jem (Jurong East)',
  ];

  return (
    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 mb-3.5 shadow-xs transition-all animate-in fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-300/80 text-amber-800 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-amber-950">
              {status === 'denied'
                ? 'Location permission is off'
                : 'Could not access GPS location'}
            </h4>
            <p className="text-[11px] text-amber-800/90 leading-snug mt-0.5">
              Enter your current address or starting landmark to find parking and calculate driving routes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-800 p-1 rounded-lg cursor-pointer"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Manual Address Input Form */}
      <form onSubmit={handleApply} className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              id="manual-address-input"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. Orchard Road, Raffles Place, Jurong..."
              className="w-full pl-8 pr-3 py-1.5 bg-white text-xs sm:text-sm text-slate-800 rounded-xl border border-amber-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : (
              <span>Set Location</span>
            )}
          </button>
        </div>

        {/* Checkbox to explicitly choose to save location */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <label className="flex items-center gap-1.5 text-[11px] text-amber-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={savePermanently}
              onChange={(e) => setSavePermanently(e.target.checked)}
              className="rounded-sm border-amber-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1">
              <Save className="w-3 h-3 text-amber-700" />
              Save this address as my preferred default
            </span>
          </label>

          <button
            type="button"
            onClick={onRequestGeolocation}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
          >
            Try GPS Again
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-amber-800/70 shrink-0">
            Quick:
          </span>
          {quickAddresses.map((addr) => (
            <button
              key={addr}
              type="button"
              onClick={() => {
                setInputVal(addr);
                onSetManualAddress(addr, false);
              }}
              className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-200/80 text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
            >
              {addr}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};
