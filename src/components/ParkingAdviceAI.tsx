import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, ExternalLink, Loader2, Info } from 'lucide-react';
import { Carpark } from '../types.ts';

interface ParkingAdviceAIProps {
  carpark: Carpark;
}

interface AdviceResponse {
  tip: string;
  sources: Array<{ title: string; uri: string }>;
  model: string;
  grounded: boolean;
}

export const ParkingAdviceAI: React.FC<ParkingAdviceAIProps> = ({ carpark }) => {
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const query = new URLSearchParams({
      name: carpark.name,
      zone: carpark.zone || 'Singapore',
      lots: String(carpark.lots),
      lat: String(carpark.lat || 1.3048),
      lng: String(carpark.lng || 103.8318),
    });

    fetch(`/api/insights?${query.toString()}`)
      .then((res) => res.json())
      .then((data: AdviceResponse) => {
        if (isMounted) {
          setAdvice(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAdvice({
            tip: `Access for ${carpark.name} is via the building entrance ramp. Expect standard ERP rates during peak hours.`,
            sources: [
              {
                title: 'Google Maps',
                uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(carpark.name + ' Singapore')}`,
              },
            ],
            model: 'fallback',
            grounded: false,
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [carpark.id, isOpen, carpark.name, carpark.zone, carpark.lots, carpark.lat, carpark.lng]);

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 active:text-indigo-800 transition-colors cursor-pointer py-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Parking tips & entrance guidance</span>
        </button>
      ) : (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 text-xs text-indigo-950 animate-in fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1 font-bold text-[11px] text-indigo-900">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Live Parking Insights
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Hide
            </button>
          </div>

          {loading ? (
            <div className="py-2 flex items-center gap-2 text-indigo-600 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching live Google Maps grounded info...</span>
            </div>
          ) : advice ? (
            <div className="space-y-1.5">
              <p className="leading-relaxed text-indigo-900 text-[11px]">
                {advice.tip}
              </p>

              {/* Grounding Sources */}
              {advice.sources && advice.sources.length > 0 && (
                <div className="pt-1 flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="text-indigo-500 font-medium">Sources:</span>
                  {advice.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-indigo-700 hover:underline font-semibold"
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{src.title}</span>
                      <ExternalLink className="w-2 h-2" />
                    </a>
                  ))}
                </div>
              )}

              {/* Dedicated Google Maps attribution */}
              <div className="pt-1 text-[9px] text-indigo-400 font-medium">
                Google Maps
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>Drive-in guidance currently unavailable for this carpark.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
