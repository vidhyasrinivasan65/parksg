import React, { useCallback, useEffect, useState } from 'react';
import { CarparkCard } from './components/CarparkCard.tsx';
import { Header } from './components/Header.tsx';
import { StateViews } from './components/StateViews.tsx';
import { ZoneSelector } from './components/ZoneSelector.tsx';
import { loadCarparks as fetchMockCarparks, ZONE_MAPPING, ZONES_LIST } from './data/mockCarparks.ts';
import { AppState, Carpark, ZoneCode, ZoneData } from './types.ts';

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
  const [fetchedAt, setFetchedAt] = useState<string>('2025-02-23T14:32:10+08:00');

  // Allow test automation or developer console to flip state and call loadCarparks
  useEffect(() => {
    (window as unknown as { appState: AppState }).appState = appState;
    (window as unknown as { setAppState: (state: AppState) => void }).setAppState = setAppState;
    (window as unknown as { loadCarparks: typeof loadCarparks }).loadCarparks = loadCarparks;
  }, [appState]);

  const fetchZoneData = useCallback(async (zone: ZoneCode) => {
    setAppState('loading');
    try {
      const data = await loadCarparks(zone);
      setFetchedAt(data.fetchedAt);
      // Sort carparks by available lots descending (highest first)
      const sorted = [...(data.carparks || [])].sort((a, b) => b.lots - a.lots);
      setCarparks(sorted);
      if (sorted.length === 0 || data.count === 0) {
        setAppState('empty');
      } else {
        setAppState('success');
      }
    } catch (err: unknown) {
      if (err && typeof (err as { status?: unknown }).status === 'number') {
        // non-2xx from my own function -> refused
        setAppState('refused');
      } else {
        // network failure -> unreachable
        setAppState('unreachable');
      }
      setCarparks([]);
    }
  }, []);

  useEffect(() => {
    fetchZoneData(selectedZone);
  }, [selectedZone, fetchZoneData]);

  const handleZoneChange = (zone: ZoneCode) => {
    setSelectedZone(zone);
  };

  const handleStateChange = (newState: AppState) => {
    setAppState(newState);
    if (newState === 'success') {
      fetchZoneData(selectedZone);
    }
  };

  const currentZoneInfo = ZONES_LIST.find((z) => z.value === selectedZone) || ZONE_MAPPING['Orchard'];
  const updatedTime = formatSingaporeTime(fetchedAt);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start sm:py-8 sm:px-4">
      {/* Phone container */}
      <div
        id="app-container"
        className="w-full max-w-md bg-white sm:rounded-3xl sm:shadow-xl sm:border sm:border-slate-200/80 min-h-screen sm:min-h-[840px] flex flex-col justify-between overflow-hidden"
      >
        <div>
          {/* Header with logo, SG Live badge, and Test State switcher */}
          <Header testState={appState} onStateChange={handleStateChange} />

          {/* Controls & Main Content Area */}
          <main className="px-5 py-4 flex flex-col">
            <ZoneSelector
              selectedZone={selectedZone}
              onSelectZone={handleZoneChange}
              updatedTime={updatedTime}
            />

            {/* Dynamic Content Area */}
            <div id="main-content" className="flex-1 flex flex-col justify-start">
              {appState !== 'success' ? (
                <StateViews state={appState} zoneLabel={currentZoneInfo.label} />
              ) : carparks.length === 0 ? (
                <StateViews state="empty" zoneLabel={currentZoneInfo.label} />
              ) : (
                <ul
                  id="carparks-list"
                  className="flex flex-col gap-2.5 pb-2"
                  role="list"
                >
                  {carparks.map((cp) => (
                    <CarparkCard key={cp.id} carpark={cp} />
                  ))}
                </ul>
              )}
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
