import React from 'react';
import { X, Bookmark, MapPin, Navigation, Trash2 } from 'lucide-react';
import { Carpark, SavedCarpark, SavedLocation } from '../types.ts';

interface SavedModalProps {
  isOpen: boolean;
  savedCarparks: SavedCarpark[];
  savedLocations: SavedLocation[];
  allCarparks: Carpark[];
  onClose: () => void;
  onSelectCarpark: (carpark: Carpark) => void;
  onSelectLocation: (loc: SavedLocation) => void;
  onRemoveSavedCarpark: (id: string) => void;
  onRemoveSavedLocation: (id: string) => void;
}

export const SavedModal: React.FC<SavedModalProps> = ({
  isOpen,
  savedCarparks,
  savedLocations,
  allCarparks,
  onClose,
  onSelectCarpark,
  onSelectLocation,
  onRemoveSavedCarpark,
  onRemoveSavedLocation,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
              <Bookmark className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 id="saved-modal-title" className="text-base font-bold text-slate-900">
              Saved Places & Carparks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close saved modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {/* Section 1: Saved Carparks */}
          <div className="pb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Bookmarked Carparks</span>
              <span className="text-[11px] font-semibold text-indigo-600">
                {savedCarparks.length}
              </span>
            </h3>

            {savedCarparks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No saved carparks yet. Click the star/bookmark icon on any carpark card.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {savedCarparks.map((saved) => {
                  const liveCarpark = allCarparks.find((c) => c.id === saved.id);
                  return (
                    <div
                      key={saved.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-2 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (liveCarpark) {
                            onSelectCarpark(liveCarpark);
                            onClose();
                          }
                        }}
                        className="flex-1 text-left min-w-0 cursor-pointer"
                      >
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {saved.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          {liveCarpark ? (
                            <span
                              className={`font-semibold ${
                                liveCarpark.lots > 50
                                  ? 'text-emerald-600'
                                  : liveCarpark.lots > 0
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {liveCarpark.lots === 0 ? 'FULL' : `${liveCarpark.lots} lots available`}
                            </span>
                          ) : (
                            <span>Saved carpark</span>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        {liveCarpark && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCarpark(liveCarpark);
                              onClose();
                            }}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-white cursor-pointer"
                            title="View on map"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveSavedCarpark(saved.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white cursor-pointer"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Saved Locations */}
          <div className="pt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Saved Starting Addresses</span>
              <span className="text-[11px] font-semibold text-indigo-600">
                {savedLocations.length}
              </span>
            </h3>

            {savedLocations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No saved starting addresses yet. When setting a manual address, check &quot;Save this address&quot;.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {savedLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-2 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLocation(loc);
                        onClose();
                      }}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{loc.name || loc.address}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 pl-5">
                        {loc.address}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveSavedLocation(loc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white cursor-pointer"
                      title="Remove saved address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
