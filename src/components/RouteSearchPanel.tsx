import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowUpDown,
  LocateFixed,
  MapPin,
  X,
  Navigation,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { UserLocation, ZoneCode } from '../types.ts';
import { ZONES_LIST } from '../data/mockCarparks.ts';

interface AutocompleteSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
  description: string;
}

interface RouteSearchPanelProps {
  userLocation: UserLocation | null;
  selectedZone: ZoneCode;
  originText: string;
  destinationText: string;
  isSearchingRoute: boolean;
  onOriginChange: (text: string) => void;
  onDestinationChange: (text: string) => void;
  onUseMyLocation: () => void;
  onSwapLocations: () => void;
  onSearchRoute: (originQuery?: string, destQuery?: string) => void;
  onSelectZone: (zone: ZoneCode) => void;
  onSelectOriginCoords?: (coords: { lat: number; lng: number; label: string }) => void;
  onSelectDestCoords?: (coords: { lat: number; lng: number; label: string }) => void;
}

export const RouteSearchPanel: React.FC<RouteSearchPanelProps> = ({
  userLocation,
  selectedZone,
  originText,
  destinationText,
  isSearchingRoute,
  onOriginChange,
  onDestinationChange,
  onUseMyLocation,
  onSwapLocations,
  onSearchRoute,
  onSelectZone,
  onSelectOriginCoords,
  onSelectDestCoords,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'dest' | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!activeDropdown) return;
    const query = activeDropdown === 'origin' ? originText : destinationText;
    if (!query || query.length < 2) {
      // Default Singapore landmarks
      fetchDefaultSuggestions(activeDropdown);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = (await res.json()) as { suggestions?: AutocompleteSuggestion[] };
          if (activeDropdown === 'origin') {
            setOriginSuggestions(data.suggestions || []);
          } else {
            setDestSuggestions(data.suggestions || []);
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [originText, destinationText, activeDropdown]);

  async function fetchDefaultSuggestions(field: 'origin' | 'dest') {
    try {
      const res = await fetch('/api/geocode');
      if (res.ok) {
        const data = (await res.json()) as { suggestions?: AutocompleteSuggestion[] };
        if (field === 'origin') {
          setOriginSuggestions(data.suggestions || []);
        } else {
          setDestSuggestions(data.suggestions || []);
        }
      }
    } catch {
      // Ignore
    }
  }

  const handleSelectSuggestion = (item: AutocompleteSuggestion, field: 'origin' | 'dest') => {
    if (field === 'origin') {
      onOriginChange(item.mainText);
      if (item.lat && item.lng && onSelectOriginCoords) {
        onSelectOriginCoords({ lat: item.lat, lng: item.lng, label: item.mainText });
      }
    } else {
      onDestinationChange(item.mainText);
      if (item.lat && item.lng && onSelectDestCoords) {
        onSelectDestCoords({ lat: item.lat, lng: item.lng, label: item.mainText });
      }
    }
    setActiveDropdown(null);
  };

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-sm mb-3.5 relative"
    >
      {/* Route Inputs Container */}
      <div className="flex items-center gap-2">
        {/* Origin & Destination Inputs Stack */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Starting Location ("From") */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
            </div>
            <input
              type="text"
              id="origin-input"
              value={originText}
              onChange={(e) => onOriginChange(e.target.value)}
              onFocus={() => {
                setActiveDropdown('origin');
                fetchDefaultSuggestions('origin');
              }}
              placeholder="From: Current location or enter start..."
              className="w-full pl-8 pr-16 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs sm:text-sm font-medium text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all"
            />
            {/* Quick Actions inside Origin Input */}
            <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
              {originText ? (
                <button
                  type="button"
                  onClick={() => onOriginChange('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                  title="Clear start location"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                id="use-my-location-btn"
                onClick={onUseMyLocation}
                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                title="Use my current GPS location"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
            </div>

            {/* Origin Autocomplete Dropdown */}
            {activeDropdown === 'origin' && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 bg-slate-50/80 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Suggested Singapore Locations</span>
                  {loadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                </div>
                {/* Option 1: Live Location */}
                {userLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      onUseMyLocation();
                      setActiveDropdown(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-indigo-50/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-indigo-900">
                        Use Current Location
                      </div>
                      <div className="text-[10px] text-indigo-600 truncate">
                        {userLocation.addressLabel}
                      </div>
                    </div>
                  </button>
                )}
                {/* Suggestions List */}
                {originSuggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    onClick={() => handleSelectSuggestion(item, 'origin')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {item.mainText}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.secondaryText}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination Input ("To") */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-100" />
            </div>
            <input
              type="text"
              id="destination-input"
              value={destinationText}
              onChange={(e) => onDestinationChange(e.target.value)}
              onFocus={() => {
                setActiveDropdown('dest');
                fetchDefaultSuggestions('dest');
              }}
              placeholder="To: Search carpark, mall, or destination..."
              className="w-full pl-8 pr-12 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs sm:text-sm font-medium text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all"
            />
            {destinationText && (
              <button
                type="button"
                onClick={() => onDestinationChange('')}
                className="absolute inset-y-0 right-2 flex items-center p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear destination"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Destination Autocomplete Dropdown */}
            {activeDropdown === 'dest' && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 bg-slate-50/80 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Popular Destinations & Carparks</span>
                  {loadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                </div>
                {destSuggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    onClick={() => handleSelectSuggestion(item, 'dest')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {item.mainText}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.secondaryText}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Swap Control */}
        <button
          type="button"
          id="swap-locations-btn"
          onClick={onSwapLocations}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all cursor-pointer shrink-0 border border-slate-200/80 shadow-xs"
          title="Swap start and destination locations"
          aria-label="Swap starting and destination locations"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        {/* Search Route Button */}
        <button
          type="button"
          id="search-route-btn"
          onClick={() => onSearchRoute()}
          disabled={isSearchingRoute}
          className="h-19 px-3.5 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shrink-0 shadow-sm shadow-indigo-200 disabled:opacity-60"
          title="Calculate driving route and find parking"
        >
          {isSearchingRoute ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span>Route</span>
        </button>
      </div>

      {/* Quick Zone Chips for Instant Zone Switching */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Zones:
        </span>
        {ZONES_LIST.map((zone) => {
          const isSelected = zone.value === selectedZone;
          return (
            <button
              key={zone.value}
              type="button"
              onClick={() => onSelectZone(zone.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
              }`}
            >
              {zone.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
