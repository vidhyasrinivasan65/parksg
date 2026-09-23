import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { CarparkCard } from './components/CarparkCard.tsx';
import { Header } from './components/Header.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { StateViews } from './components/StateViews.tsx';
import { ZoneSelector } from './components/ZoneSelector.tsx';
import { loadCarparks as fetchMockCarparks, ZONE_MAPPING, ZONES_LIST } from './data/mockCarparks.ts';
import { AppState, Carpark, ZoneCode, ZoneData } from './types.ts';
import { STALE_THRESHOLD_MINUTES } from './utils/constants.ts';
import { recordCarparkReading, seedSimulatedTrend } from './utils/trend.ts';

/**
 * Single data-fetching function.
 */
export async function loadCarparks(zone: ZoneCode | string): Promise<ZoneData> {
  // SWAP POINT — this becomes fetch(`/api/carparks?zone=${zone}`)
  const res = await fetch(`/api/carparks?zone=${zone}`);
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    (error as unknown as { status: number }).status = res.status;
    throw error;
  }
  return res.json();
}

function formatSingaporeTime(isoString?: string): string {
  if (!isoString) return '14:32';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '14:32';
  }
}

export default function App() {
  /**
   * Single state variable flippable by hand for testing:
   * Values: 'loading' | 'empty' | 'refused' | 'unreachable' | 'success'
   */
  const [appState, setAppState] = useState<AppState>('success');
  const [selectedZone, setSelectedZone] = useState<ZoneCode>('Orchard');
  const [carparks, setCarparks] = useState<Carpark[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fetchedAt, setFetchedAt] = useState<string>(new Date().toISOString());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Live relative-time timestamp tick (refreshes labels every 30s without refetching)
  const [currentTimestampMs, setCurrentTimestampMs] = useState<number>(Date.now());

  // Cached last known data per zone to support offline/failure banners
  const lastKnownDataRef = useRef<Record<string, { carparks: Carpark[]; fetchedAt: string }>>({});

  // Banner state: "Live data unavailable – showing last known counts from [time]"
  const [liveUnavailableBanner, setLiveUnavailableBanner] = useState<{ time: string } | null>(null);

  // Periodic 30-second interval to refresh relative-time labels
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestampMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Allow test automation or developer console to flip state and call loadCarparks
  useEffect(() => {
    (window as unknown as { appState: AppState }).appState = appState;
    (window as unknown as { setAppState: (state: AppState) => void }).setAppState = setAppState;
    (window as unknown as { loadCarparks: typeof loadCarparks }).loadCarparks = loadCarparks;
  }, [appState]);

  const fetchZoneData = useCallback(async (zone: ZoneCode) => {
    const hasExistingCarparks = carparks.length > 0;
    if (hasExistingCarparks) {
      setIsRefreshing(true);
    } else {
      setAppState('loading');
    }

    try {
      const data = await loadCarparks(zone);
      const readingTimestamp = data.fetchedAt || new Date().toISOString();
      setFetchedAt(readingTimestamp);

      // Sort carparks by available lots descending (highest first)
      const sorted = [...(data.carparks || [])].sort((a, b) => b.lots - a.lots);
      setCarparks(sorted);

      // Record reading history in memory for trend detection
      const nowMs = Date.now();
      sorted.forEach((cp) => {
        recordCarparkReading(cp.id, cp.lots, nowMs);
      });

      // Save to last known cache
      lastKnownDataRef.current[zone] = {
        carparks: sorted,
        fetchedAt: readingTimestamp,
      };

      // Clear any previous unavailable banner on success
      setLiveUnavailableBanner(null);

      if (sorted.length === 0 || data.count === 0) {
        setAppState('empty');
      } else {
        setAppState('success');
      }
    } catch (err: unknown) {
      const cached = lastKnownDataRef.current[zone];

      // If we already have previous counts for this zone, don't show blank/zero.
      // Instead, show dismissible banner: "Live data unavailable – showing last known counts from [time]"
      if (cached && cached.carparks.length > 0) {
        setCarparks(cached.carparks);
        setFetchedAt(cached.fetchedAt);
        setLiveUnavailableBanner({
          time: formatSingaporeTime(cached.fetchedAt),
        });
        setAppState('success');
      } else {
        if (err && typeof (err as { status?: unknown }).status === 'number') {
          // non-2xx from our own function -> refused
          setAppState('refused');
        } else {
          // network failure -> unreachable
          setAppState('unreachable');
        }
        setCarparks([]);
        setLiveUnavailableBanner(null);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [carparks.length]);

  useEffect(() => {
    fetchZoneData(selectedZone);
  }, [selectedZone, fetchZoneData]);

  const handleZoneChange = (zone: ZoneCode) => {
    setSelectedZone(zone);
  };

  const handleStateChange = (newState: string) => {
    if (newState === 'stale') {
      // Demo: Simulate readings older than 10 minutes (STALE_THRESHOLD_MINUTES)
      const staleTime = new Date(Date.now() - (STALE_THRESHOLD_MINUTES + 4) * 60 * 1000).toISOString();
      setFetchedAt(staleTime);
      setAppState('success');
      return;
    }

    if (newState === 'trend') {
      // Demo: Simulate rapid lot drop on first carpark
      if (carparks.length > 0) {
        const targetCp = carparks[0];
        seedSimulatedTrend(targetCp.id, targetCp.lots + 40, targetCp.lots, 8);
        setCurrentTimestampMs(Date.now());
      }
      setAppState('success');
      return;
    }

    if (newState === 'cached_failure') {
      // Demo: Simulate fetch failure with cached counts banner
      setLiveUnavailableBanner({
        time: formatSingaporeTime(fetchedAt),
      });
      setAppState('success');
      return;
    }

    setAppState(newState as AppState);
    if (newState === 'success') {
      setLiveUnavailableBanner(null);
      fetchZoneData(selectedZone);
    }
  };

  const currentZoneInfo = ZONES_LIST.find((z) => z.value === selectedZone) || ZONE_MAPPING['Orchard'];
  const updatedTime = formatSingaporeTime(fetchedAt);

  // Filter carparks by name or ID
  const filteredCarparks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return carparks;
    return carparks.filter(
      (cp) =>
        cp.name.toLowerCase().includes(q) ||
        cp.id.toLowerCase().includes(q)
    );
  }, [carparks, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start sm:py-8 sm:px-4">
      {/* Phone container */}
      <div
        id="app-container"
        className="w-full max-w-md bg-white sm:rounded-3xl sm:shadow-xl sm:border sm:border-slate-200/80 min-h-screen sm:min-h-[840px] flex flex-col justify-between overflow-hidden"
      >
        <div>
          {/* Header with logo and SG Live badge */}
          <Header />

          {/* Controls & Main Content Area */}
          <main className="px-5 py-4 flex flex-col">
            {/* Live Data Unavailable Banner (Prompt 1 requirement #3) */}
            {liveUnavailableBanner && (
              <div
                id="live-unavailable-banner"
                role="alert"
                className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900 shadow-xs animate-in fade-in"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-medium text-[11px] leading-snug">
                    Live data unavailable – showing last known counts from {liveUnavailableBanner.time}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchZoneData(selectedZone)}
                    className="px-2 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveUnavailableBanner(null)}
                    className="p-1 text-amber-700 hover:text-amber-900 rounded cursor-pointer"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <ZoneSelector
              selectedZone={selectedZone}
              onSelectZone={handleZoneChange}
              updatedTime={updatedTime}
            />

            {/* Refreshing Indicator while keeping counts visible */}
            {isRefreshing && (
              <div className="mb-2 py-1 px-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-indigo-700 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Checking live lot counts…</span>
              </div>
            )}

            {/* Search bar to filter carparks by name */}
            {appState === 'success' && carparks.length > 0 && (
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder={`Search in ${currentZoneInfo.label}...`}
                totalCount={carparks.length}
                filteredCount={filteredCarparks.length}
              />
            )}

            {/* Dynamic Content Area */}
            <div id="main-content" className="flex-1 flex flex-col justify-start">
              {appState !== 'success' ? (
                <StateViews state={appState} zoneLabel={currentZoneInfo.label} />
              ) : carparks.length === 0 ? (
                <StateViews state="empty" zoneLabel={currentZoneInfo.label} />
              ) : filteredCarparks.length === 0 ? (
                <div
                  id="no-search-results"
                  className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80 my-2 animate-in fade-in duration-150"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500 mb-2.5">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    No carparks matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                    No carparks in {currentZoneInfo.label} match your search. Check for typos or try another name.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                <ul
                  id="carparks-list"
                  className="flex flex-col gap-2.5 pb-2"
                  role="list"
                >
                  {filteredCarparks.map((cp) => (
                    <CarparkCard
                      key={cp.id}
                      carpark={cp}
                      allCarparks={carparks}
                      readingTimestamp={fetchedAt}
                      currentTimestampMs={currentTimestampMs}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Demo: simulate failure states */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <label
                htmlFor="state-selector"
                className="text-[11px] text-slate-400 font-normal"
              >
                Demo: simulate failure states
              </label>
              <select
                id="state-selector"
                value={liveUnavailableBanner ? 'cached_failure' : appState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300 cursor-pointer"
              >
                <option value="success">Normal (Success)</option>
                <option value="loading">loading</option>
                <option value="empty">empty</option>
                <option value="refused">refused</option>
                <option value="unreachable">unreachable</option>
                <option value="stale">demo: stale data (&gt;10 min ago)</option>
                <option value="trend">demo: rapid drop (filling fast)</option>
                <option value="cached_failure">demo: unavailable banner</option>
              </select>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="px-5 py-4 bg-slate-50 border-t border-slate-100 text-center mt-6">
          <p className="text-xs font-medium text-slate-500">
            Data from LTA DataMall
          </p>
        </footer>
      </div>
    </div>
  );
}
