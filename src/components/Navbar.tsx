import React from 'react';
import { MapPin, Bookmark, User, Compass, RefreshCw } from 'lucide-react';
import { UserLocation } from '../types.ts';

interface NavbarProps {
  userLocation: UserLocation | null;
  locationStatus: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'timeout';
  savedCount: number;
  activeView: 'map' | 'saved';
  onFindParkingClick: () => void;
  onSavedClick: () => void;
  onProfileClick: () => void;
  onRequestGeolocation: () => void;
  onOpenLocationPicker: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userLocation,
  locationStatus,
  savedCount,
  activeView,
  onFindParkingClick,
  onSavedClick,
  onProfileClick,
  onRequestGeolocation,
  onOpenLocationPicker,
}) => {
  const isLive = locationStatus === 'granted' && userLocation?.isLive;
  const locationLabel = userLocation?.addressLabel || 'Locating SG...';

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Location */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <button
            type="button"
            onClick={onFindParkingClick}
            className="flex items-center gap-2 group cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-indigo-500 rounded-lg p-0.5"
            title="ParkSG Home"
          >
            <div
              id="app-logo-badge"
              className="w-8 h-8 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 transition-colors text-white flex items-center justify-center font-extrabold text-base shadow-sm shadow-indigo-200"
            >
              P
            </div>
            <div className="hidden xs:block">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 block leading-none">
                ParkSG
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                LIVE LOTS
              </span>
            </div>
          </button>

          {/* Current Location Badge (Replaces static "SG Live" badge) */}
          <div className="flex items-center gap-1.5 min-w-0 max-w-[210px] sm:max-w-[340px]">
            <button
              type="button"
              id="sg-live-badge"
              onClick={onOpenLocationPicker}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/70 transition-all cursor-pointer truncate max-w-full"
              title="Click to view or change your location"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isLive ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'
                }`}
              />
              <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
              <span className="truncate tracking-tight font-medium">
                {isLive ? `Live: ${locationLabel}` : locationLabel}
              </span>
            </button>

            {/* Quick Refresh / Geolocation button */}
            <button
              type="button"
              onClick={onRequestGeolocation}
              className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Update live GPS location"
              aria-label="Refresh GPS location"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Navigation Actions */}
        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Find Parking */}
          <button
            type="button"
            id="nav-find-parking-btn"
            onClick={onFindParkingClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Find Parking</span>
          </button>

          {/* Saved */}
          <button
            type="button"
            id="nav-saved-btn"
            onClick={onSavedClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
              activeView === 'saved'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Saved carparks and locations"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white ml-0.5">
                {savedCount}
              </span>
            )}
          </button>

          {/* Profile / Menu */}
          <button
            type="button"
            id="nav-profile-btn"
            onClick={onProfileClick}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/70"
            title="Profile, vehicles & settings"
            aria-label="Profile and settings"
          >
            <User className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
};
