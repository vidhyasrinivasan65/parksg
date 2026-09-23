import React from 'react';
import { ExternalLink, MapPin, Navigation, X } from 'lucide-react';

interface NavigationModalProps {
  isOpen: boolean;
  carparkName: string;
  lat: number | null;
  lng: number | null;
  onClose: () => void;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  carparkName,
  lat,
  lng,
  onClose,
}) => {
  if (!isOpen || lat === null || lng === null) return null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  const handleOpenApp = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 id="nav-modal-title" className="text-sm font-bold text-slate-900 leading-snug">
                Navigate to Carpark
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                {carparkName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mb-4 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span>Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
        </p>

        <div className="flex flex-col gap-2">
          {/* Google Maps Option */}
          <button
            type="button"
            onClick={() => handleOpenApp(googleMapsUrl)}
            className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold flex items-center justify-between transition-colors shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center font-bold text-[10px]">
                G
              </span>
              <span>Google Maps</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
          </button>

          {/* Waze Option */}
          <button
            type="button"
            onClick={() => handleOpenApp(wazeUrl)}
            className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center justify-between transition-colors shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center font-bold text-[10px]">
                W
              </span>
              <span>Waze</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
