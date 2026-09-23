import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Navigation,
  TrendingDown,
  Bookmark,
  Sparkles,
  Route as RouteIcon,
} from 'lucide-react';
import { Carpark } from '../types.ts';
import { ALMOST_FULL_LOTS_THRESHOLD } from '../utils/constants.ts';
import { findNearbyAlternative } from '../utils/distance.ts';
import { getFreshnessInfo } from '../utils/freshness.ts';
import { analyzeCarparkTrend } from '../utils/trend.ts';
import { NavigationModal } from './NavigationModal.tsx';
import { ParkingAdviceAI } from './ParkingAdviceAI.tsx';

interface CarparkCardProps {
  carpark: Carpark;
  allCarparks: Carpark[];
  isSelected?: boolean;
  isSaved?: boolean;
  readingTimestamp?: string | number;
  currentTimestampMs: number;
  onSelect?: () => void;
  onToggleSave?: () => void;
  onRequestRoute?: () => void;
}

export const CarparkCard: React.FC<CarparkCardProps> = ({
  carpark,
  allCarparks,
  isSelected = false,
  isSaved = false,
  readingTimestamp,
  currentTimestampMs,
  onSelect,
  onToggleSave,
  onRequestRoute,
}) => {
  const [navModalOpen, setNavModalOpen] = useState(false);

  // Freshness calculation
  const effectiveTimestamp = carpark.fetchedAt || readingTimestamp;
  const freshness = getFreshnessInfo(effectiveTimestamp, currentTimestampMs);

  const isFull = carpark.lots === 0;
  const isAlmostFull = carpark.lots > 0 && carpark.lots <= ALMOST_FULL_LOTS_THRESHOLD;
  const isGreen = carpark.lots > 50;
  const isAmber = carpark.lots >= 1 && carpark.lots <= 50;

  // Lot badge styling: If stale, grey out the lot count
  let lotBadgeClasses = '';
  if (freshness.isStale) {
    lotBadgeClasses = 'bg-slate-100 text-slate-400 border border-slate-200 font-semibold';
  } else if (isGreen) {
    lotBadgeClasses = 'lot-badge-green font-bold';
  } else if (isAmber) {
    lotBadgeClasses = 'lot-badge-amber font-bold';
  } else {
    lotBadgeClasses = 'lot-badge-red font-extrabold tracking-wide';
  }

  // Trend analysis (filling fast)
  const trend = analyzeCarparkTrend(carpark.id, carpark.lots, currentTimestampMs);

  // Alternative carpark recommendation if full or almost full
  const alternative =
    isFull || isAlmostFull || trend.isFillingFast
      ? findNearbyAlternative(carpark, allCarparks)
      : null;

  const unmapped = carpark.lat === null || carpark.lng === null;

  const handleNavigateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unmapped || carpark.lat === null || carpark.lng === null) return;

    // Detect mobile touch device
    const isMobile =
      typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
        (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches));

    if (isMobile) {
      setNavModalOpen(true);
    } else {
      // Desktop: Open Google Maps in a new tab
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${carpark.lat},${carpark.lng}`;
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRouteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRequestRoute) {
      onRequestRoute();
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSave) {
      onToggleSave();
    }
  };

  return (
    <>
      <li
        id={`carpark-${carpark.id}`}
        onClick={onSelect}
        className={`min-h-[64px] py-3.5 px-3.5 sm:px-4 bg-white hover:bg-slate-50/80 rounded-2xl flex flex-col gap-2.5 transition-all shadow-xs cursor-pointer border ${
          isSelected
            ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/30'
            : 'border-slate-200/80'
        }`}
      >
        {/* Main Row */}
        <div className="flex items-start justify-between gap-3">
          {/* Carpark Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                {carpark.agency}
              </span>
              <span className="text-[11px] text-slate-400 font-mono tracking-tight">
                {carpark.id}
              </span>
              {/* Distance badge if computed */}
              {carpark.distanceFormatted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  {carpark.distanceFormatted}
                </span>
              )}
            </div>

            <h2 className="text-sm font-bold text-slate-900 truncate leading-snug">
              {carpark.name}
            </h2>

            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Agency: {carpark.agency}</span>
              <span>·</span>
              {unmapped ? (
                <span className="text-slate-400 italic">No GPS coords</span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRouteClick}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    title="Calculate driving route"
                  >
                    <RouteIcon className="w-3 h-3 text-indigo-600" />
                    <span>Route</span>
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleNavigateClick}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-700 active:text-indigo-800 cursor-pointer"
                    title="Navigate with Google Maps or Waze"
                  >
                    <Navigation className="w-3 h-3 text-slate-500" />
                    <span>Navigate</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Lots & Bookmark */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              {/* Bookmark Toggle */}
              {onToggleSave && (
                <button
                  type="button"
                  onClick={handleSaveClick}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isSaved
                      ? 'text-indigo-600 bg-indigo-50 border border-indigo-200'
                      : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                  }`}
                  title={isSaved ? 'Remove from saved' : 'Save carpark'}
                  aria-label={isSaved ? 'Remove bookmark' : 'Bookmark carpark'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-indigo-600' : ''}`} />
                </button>
              )}

              {/* Lot Badge */}
              <span
                id={`lot-badge-${carpark.id}`}
                className={`inline-flex items-center justify-center min-w-[58px] min-h-[36px] px-2.5 py-1 rounded-xl text-xs transition-colors ${lotBadgeClasses}`}
              >
                {isFull ? 'FULL' : carpark.lots}
              </span>
            </div>

            {/* Small relative-time label */}
            <span
              className={`text-[10px] tracking-tight leading-tight text-right ${
                freshness.isStale
                  ? 'text-amber-700 font-medium'
                  : 'text-slate-400 font-normal'
              }`}
            >
              {freshness.label}
            </span>
          </div>
        </div>

        {/* Warning Banners: Trend (Filling fast) and Nearby Alternatives */}
        {trend.isFillingFast && trend.warningMessage && (
          <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-1.5 font-medium animate-in fade-in">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{trend.warningMessage}</span>
          </div>
        )}

        {/* Nearby Alternative for Full or Almost Full carparks */}
        {isFull && alternative && (
          <div className="px-2.5 py-1.5 rounded-xl bg-red-50 border border-red-200/80 text-red-900 text-xs flex items-center gap-1.5 font-medium animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="leading-snug">
              Full – <span className="font-semibold">{alternative.name}</span> is{' '}
              {alternative.distanceFormatted} away with {alternative.lots} lots
            </span>
          </div>
        )}

        {isAlmostFull && alternative && !isFull && (
          <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-1.5 font-medium animate-in fade-in">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="leading-snug">
              Almost full – <span className="font-semibold">{alternative.name}</span> is{' '}
              {alternative.distanceFormatted} away with {alternative.lots} lots
            </span>
          </div>
        )}

        {/* AI Parking Advice with Google Maps Grounding */}
        <ParkingAdviceAI carpark={carpark} />
      </li>

      {/* Navigation App Picker Modal (Mobile) */}
      <NavigationModal
        isOpen={navModalOpen}
        carparkName={carpark.name}
        lat={carpark.lat}
        lng={carpark.lng}
        onClose={() => setNavModalOpen(false)}
      />
    </>
  );
};
