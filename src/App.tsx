import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  ChevronUp,
  ChevronDown,
  Navigation,
  Layers,
  MapPin,
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { RouteSearchPanel } from './components/RouteSearchPanel.tsx';
import { GoogleMapView } from './components/GoogleMapView.tsx';
import { CarparkCard } from './components/CarparkCard.tsx';
import { RouteDetailsModal } from './components/RouteDetailsModal.tsx';
import { GeolocationBanner } from './components/GeolocationBanner.tsx';
import { SavedModal } from './components/SavedModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { StateViews } from './components/StateViews.tsx';
import { ZONE_MAPPING, ZONES_LIST } from './data/mockCarparks.ts';
import {
  AppState,
  Carpark,
  GeolocationStatus,
  RouteInfo,
  SavedCarpark,
  SavedLocation,
  TestState,
  UserLocation,
  ZoneCode,
  ZoneData,
} from './types.ts';
import { STALE_THRESHOLD_MINUTES } from './utils/constants.ts';
import { calculateDistanceMeters, formatDistance } from './utils/distance.ts';
import { recordCarparkReading, seedSimulatedTrend } from './utils/trend.ts';

export async function loadCarparks(
  zoneOrQuery: string,
  coords?: { lat: number; lng: number }
): Promise<ZoneData> {
  let url = `/api/carparks?zone=${encodeURIComponent(zoneOrQuery)}`;
  if (coords) {
    url = `/api/carparks?lat=${coords.lat}&lng=${coords.lng}&radius=3.5`;
  }
  const res = await fetch(url);
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
  const [appState, setAppState] = useState<AppState>('success');
  const [selectedZone, setSelectedZone] = useState<ZoneCode>('Orchard');
  const [carparks, setCarparks] = useState<Carpark[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string>(new Date().toISOString());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedCarparkId, setSelectedCarparkId] = useState<string | null>(null);

  // Time tick for relative freshness
  const [currentTimestampMs, setCurrentTimestampMs] = useState<number>(Date.now());

  // Geolocation & user position
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geolocationStatus, setGeolocationStatus] = useState<GeolocationStatus>('prompt');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [geoBannerDismissed, setGeoBannerDismissed] = useState<boolean>(false);

  // Map viewport
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: ZONE_MAPPING.Orchard.center.lat,
    lng: ZONE_MAPPING.Orchard.center.lng,
  });
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Route search inputs & state
  const [originText, setOriginText] = useState<string>('');
  const [destinationText, setDestinationText] = useState<string>('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [isSearchingRoute, setIsSearchingRoute] = useState<boolean>(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeModalOpen, setRouteModalOpen] = useState<boolean>(false);

  // Mobile Bottom Sheet state: 'collapsed' (peek), 'half', 'full'
  const [mobileSheetSnap, setMobileSheetSnap] = useState<'collapsed' | 'half' | 'full'>('half');

  // Modals & Navigation
  const [activeNavView, setActiveNavView] = useState<'map' | 'saved'>('map');
  const [savedModalOpen, setSavedModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);

  // Saved items
  const [savedCarparks, setSavedCarparks] = useState<SavedCarpark[]>(() => {
    try {
      const stored = localStorage.getItem('parksg_saved_carparks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    try {
      const stored = localStorage.getItem('parksg_saved_locations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Cached last known data
  const lastKnownDataRef = useRef<Record<string, { carparks: Carpark[]; fetchedAt: string }>>({});
  const [liveUnavailableBanner, setLiveUnavailableBanner] = useState<{ time: string } | null>(null);

  // Test state simulation
  const [testState, setTestState] = useState<TestState>('success');

  // Watch position reference
  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('parksg_saved_carparks', JSON.stringify(savedCarparks));
    } catch {
      // Ignore
    }
  }, [savedCarparks]);

  useEffect(() => {
    try {
      localStorage.setItem('parksg_saved_locations', JSON.stringify(savedLocations));
    } catch {
      // Ignore
    }
  }, [savedLocations]);

  // Periodic 30s tick for freshness
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestampMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Expose test controls for automated evaluation
  useEffect(() => {
    (window as unknown as { appState: AppState }).appState = appState;
    (window as unknown as { setAppState: (state: AppState) => void }).setAppState = setAppState;
    (window as unknown as { loadCarparks: typeof loadCarparks }).loadCarparks = loadCarparks;
  }, [appState]);

  // Fetch zone or nearby carparks
  const fetchCarparkData = useCallback(
    async (zone: ZoneCode, coords?: { lat: number; lng: number }) => {
      const hasExisting = carparks.length > 0;
      if (hasExisting) {
        setIsRefreshing(true);
      } else {
        setAppState('loading');
      }

      try {
        const data = await loadCarparks(zone, coords);
        const readingTimestamp = data.fetchedAt || new Date().toISOString();
        setFetchedAt(readingTimestamp);

        // Calculate distance from user's current location if available
        const currentPos = userLocation || (coords ? { lat: coords.lat, lng: coords.lng, addressLabel: '', isLive: false } : null);

        let list = [...(data.carparks || [])].map((cp) => {
          if (currentPos && cp.lat !== null && cp.lng !== null) {
            const distMeters = calculateDistanceMeters(currentPos.lat, currentPos.lng, cp.lat, cp.lng);
            return {
              ...cp,
              distanceMeters: distMeters,
              distanceKm: Math.round((distMeters / 1000) * 10) / 10,
              distanceFormatted: formatDistance(distMeters),
            };
          }
          return cp;
        });

        // Sort by lots descending
        list.sort((a, b) => b.lots - a.lots);
        setCarparks(list);

        // Record readings in memory for trend detection
        const nowMs = Date.now();
        list.forEach((cp) => {
          recordCarparkReading(cp.id, cp.lots, nowMs);
        });

        lastKnownDataRef.current[zone] = {
          carparks: list,
          fetchedAt: readingTimestamp,
        };

        setLiveUnavailableBanner(null);
        if (list.length === 0 || data.count === 0) {
          setAppState('empty');
        } else {
          setAppState('success');
        }
      } catch (err: unknown) {
        const cached = lastKnownDataRef.current[zone];
        if (cached && cached.carparks.length > 0) {
          setCarparks(cached.carparks);
          setFetchedAt(cached.fetchedAt);
          setLiveUnavailableBanner({
            time: formatSingaporeTime(cached.fetchedAt),
          });
          setAppState('success');
        } else {
          if (err && typeof (err as { status?: unknown }).status === 'number') {
            setAppState('refused');
          } else {
            setAppState('unreachable');
          }
          setCarparks([]);
          setLiveUnavailableBanner(null);
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [carparks.length, userLocation]
  );

  // Initial load: Fetch default zone
  useEffect(() => {
    fetchCarparkData(selectedZone);
  }, [selectedZone, fetchCarparkData]);

  // Reverse geocode coordinates to human-readable address
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = (await res.json()) as { address?: string };
        if (data.address) return data.address;
      }
    } catch {
      // Fallback
    }
    return 'Singapore';
  };

  // Browser Geolocation Setup & Request
  const requestGeolocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeolocationStatus('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        lastCoordsRef.current = { lat, lng };

        setGeolocationStatus('granted');
        const label = await reverseGeocode(lat, lng);

        const newLoc: UserLocation = {
          lat,
          lng,
          addressLabel: label,
          isLive: true,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };

        setUserLocation(newLoc);
        setOriginText(label);
        setOriginCoords({ lat, lng, label });
        setMapCenter({ lat, lng });
        setMapZoom(15);

        // Fetch nearby carparks around user's live position
        fetchCarparkData(selectedZone, { lat, lng });
      },
      (err) => {
        console.warn('Geolocation access issue:', err);
        if (err.code === 1) {
          setGeolocationStatus('denied');
        } else if (err.code === 3) {
          setGeolocationStatus('timeout');
        } else {
          setGeolocationStatus('unavailable');
        }

        // Check if there is an explicitly saved manual address
        try {
          const savedDef = localStorage.getItem('parksg_preferred_manual_address');
          if (savedDef) {
            applyManualAddress(savedDef, false);
          }
        } catch {
          // Ignore
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );

    // Watch position for meaningful changes (>50m)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (lastCoordsRef.current) {
          const movedMeters = calculateDistanceMeters(
            lastCoordsRef.current.lat,
            lastCoordsRef.current.lng,
            lat,
            lng
          );
          // Only update if moved > 50 meters to prevent excessive API calls
          if (movedMeters < 50) return;
        }

        lastCoordsRef.current = { lat, lng };
        setUserLocation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            lat,
            lng,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
  }, [fetchCarparkData, selectedZone]);

  // Request geolocation on initial mount
  useEffect(() => {
    requestGeolocation();
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestGeolocation]);

  // Manual Address Selection & Fallback Handling
  const applyManualAddress = async (address: string, savePermanently: boolean) => {
    setManualAddress(address);
    if (savePermanently) {
      try {
        localStorage.setItem('parksg_preferred_manual_address', address);
        const newSavedLoc: SavedLocation = {
          id: `loc-${Date.now()}`,
          name: address,
          address,
          lat: mapCenter.lat,
          lng: mapCenter.lng,
          savedAt: Date.now(),
        };
        setSavedLocations((prev) => [newSavedLoc, ...prev.filter((l) => l.address !== address)]);
      } catch {
        // Ignore
      }
    }

    // Geocode manual address
    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(address)}`);
      if (res.ok) {
        const data = (await res.json()) as { suggestions?: Array<{ lat?: number; lng?: number; mainText: string }> };
        if (data.suggestions && data.suggestions.length > 0) {
          const top = data.suggestions[0];
          const lat = top.lat || ZONE_MAPPING.Orchard.center.lat;
          const lng = top.lng || ZONE_MAPPING.Orchard.center.lng;

          const manualLoc: UserLocation = {
            lat,
            lng,
            addressLabel: top.mainText || address,
            isLive: false,
          };

          setUserLocation(manualLoc);
          setOriginText(top.mainText || address);
          setOriginCoords({ lat, lng, label: top.mainText || address });
          setMapCenter({ lat, lng });
          setMapZoom(15);
          fetchCarparkData(selectedZone, { lat, lng });
          return;
        }
      }
    } catch {
      // Ignore
    }

    // Default coordinate assignment if geocode fails
    const fallbackLoc: UserLocation = {
      lat: ZONE_MAPPING.Orchard.center.lat,
      lng: ZONE_MAPPING.Orchard.center.lng,
      addressLabel: address,
      isLive: false,
    };
    setUserLocation(fallbackLoc);
    setOriginText(address);
    setOriginCoords({ lat: fallbackLoc.lat, lng: fallbackLoc.lng, label: address });
  };

  // Route calculation
  const handleCalculateRoute = async (destinationCarpark?: Carpark) => {
    setIsSearchingRoute(true);
    const startPoint = originCoords || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng, label: userLocation.addressLabel } : null);

    let endPoint = destCoords;
    if (destinationCarpark && destinationCarpark.lat !== null && destinationCarpark.lng !== null) {
      endPoint = {
        lat: destinationCarpark.lat,
        lng: destinationCarpark.lng,
        label: destinationCarpark.name,
      };
      setDestinationText(destinationCarpark.name);
      setDestCoords(endPoint);
    }

    // If no explicit start point, use Singapore Orchard center
    const origin = startPoint || {
      lat: ZONE_MAPPING.Orchard.center.lat,
      lng: ZONE_MAPPING.Orchard.center.lng,
      label: 'Orchard Road',
    };

    // If no destination specified, route to the highest lot carpark
    const dest = endPoint || (carparks.length > 0 && carparks[0].lat !== null && carparks[0].lng !== null
      ? { lat: carparks[0].lat, lng: carparks[0].lng, label: carparks[0].name }
      : { lat: ZONE_MAPPING.Marina.center.lat, lng: ZONE_MAPPING.Marina.center.lng, label: 'Marina Bay Sands' });

    try {
      const query = new URLSearchParams({
        originLat: String(origin.lat),
        originLng: String(origin.lng),
        destLat: String(dest.lat),
        destLng: String(dest.lng),
        originLabel: origin.label,
        destLabel: dest.label,
      });

      const res = await fetch(`/api/routes?${query.toString()}`);
      if (res.ok) {
        const routeData = (await res.json()) as RouteInfo;
        setRouteInfo(routeData);
        setRouteModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to calculate driving route:', err);
    } finally {
      setIsSearchingRoute(false);
    }
  };

  // Swap starting and destination locations
  const handleSwapLocations = () => {
    const tempText = originText;
    const tempCoords = originCoords;

    setOriginText(destinationText);
    setOriginCoords(destCoords);

    setDestinationText(tempText);
    setDestCoords(tempCoords);
  };

  // Handle Zone Change
  const handleSelectZone = (zone: ZoneCode) => {
    setSelectedZone(zone);
    const zoneCenter = ZONE_MAPPING[zone]?.center || ZONE_MAPPING.Orchard.center;
    setMapCenter(zoneCenter);
    setMapZoom(14);
    fetchCarparkData(zone);
  };

  // Handle Carpark Selection from list or marker
  const handleSelectCarpark = (carpark: Carpark) => {
    setSelectedCarparkId(carpark.id);
    if (carpark.lat !== null && carpark.lng !== null) {
      setMapCenter({ lat: carpark.lat, lng: carpark.lng });
      setMapZoom(16);
    }

    // Scroll to card in list
    const cardEl = document.getElementById(`carpark-${carpark.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Bookmark / Save toggle
  const handleToggleSaveCarpark = (carpark: Carpark) => {
    setSavedCarparks((prev) => {
      const exists = prev.some((c) => c.id === carpark.id);
      if (exists) {
        return prev.filter((c) => c.id !== carpark.id);
      }
      return [{ id: carpark.id, name: carpark.name, savedAt: Date.now() }, ...prev];
    });
  };

  // Launch external turn navigation (Google Maps / Waze)
  const handleLaunchExternalNav = () => {
    if (!routeInfo) return;
    const { lat, lng } = routeInfo.destination;
    const isMobile =
      typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches));

    if (isMobile) {
      // Mobile deep link
      window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  // Handle State Selector (failure testing)
  const handleStateChange = (newState: string) => {
    setTestState(newState as TestState);
    if (newState === 'stale') {
      const staleTime = new Date(Date.now() - (STALE_THRESHOLD_MINUTES + 4) * 60 * 1000).toISOString();
      setFetchedAt(staleTime);
      setAppState('success');
      return;
    }

    if (newState === 'trend') {
      if (carparks.length > 0) {
        const targetCp = carparks[0];
        seedSimulatedTrend(targetCp.id, targetCp.lots + 40, targetCp.lots, 8);
        setCurrentTimestampMs(Date.now());
      }
      setAppState('success');
      return;
    }

    if (newState === 'cached_failure') {
      setLiveUnavailableBanner({
        time: formatSingaporeTime(fetchedAt),
      });
      setAppState('success');
      return;
    }

    setAppState(newState as AppState);
    if (newState === 'success') {
      setLiveUnavailableBanner(null);
      fetchCarparkData(selectedZone);
    }
  };

  const updatedTime = formatSingaporeTime(fetchedAt);
  const currentZoneInfo = ZONES_LIST.find((z) => z.value === selectedZone) || ZONE_MAPPING.Orchard;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <Navbar
        userLocation={userLocation}
        locationStatus={geolocationStatus}
        savedCount={savedCarparks.length}
        activeView={activeNavView}
        onFindParkingClick={() => setActiveNavView('map')}
        onSavedClick={() => setSavedModalOpen(true)}
        onProfileClick={() => setProfileModalOpen(true)}
        onRequestGeolocation={requestGeolocation}
        onOpenLocationPicker={() => setGeoBannerDismissed(false)}
      />

      {/* Main Experience Layout: Desktop Split / Mobile Full Map + Bottom Sheet */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden h-[calc(100vh-53px)]">
        {/* Left Side (Desktop Sidebar / Panel) */}
        <aside
          id="results-panel"
          className="hidden md:flex md:w-[440px] lg:w-[480px] bg-white border-r border-slate-200/80 flex-col h-full z-20 shadow-sm overflow-hidden"
        >
          {/* Scrollable Control Header */}
          <div className="p-4 border-b border-slate-100 overflow-y-auto shrink-0 space-y-3">
            {/* Geolocation Denied / Timeout Fallback Banner */}
            {!geoBannerDismissed && (
              <GeolocationBanner
                status={geolocationStatus}
                manualAddress={manualAddress}
                onSetManualAddress={applyManualAddress}
                onDismiss={() => setGeoBannerDismissed(true)}
                onRequestGeolocation={requestGeolocation}
              />
            )}

            {/* Live Data Unavailable Banner */}
            {liveUnavailableBanner && (
              <div
                id="live-unavailable-banner"
                role="alert"
                className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900 shadow-xs animate-in fade-in"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium text-[11px] leading-snug">
                    Live data unavailable – showing last known counts from {liveUnavailableBanner.time}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchCarparkData(selectedZone)}
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

            {/* Route Search Panel */}
            <RouteSearchPanel
              userLocation={userLocation}
              selectedZone={selectedZone}
              originText={originText}
              destinationText={destinationText}
              isSearchingRoute={isSearchingRoute}
              onOriginChange={setOriginText}
              onDestinationChange={setDestinationText}
              onUseMyLocation={requestGeolocation}
              onSwapLocations={handleSwapLocations}
              onSearchRoute={() => handleCalculateRoute()}
              onSelectZone={handleSelectZone}
              onSelectOriginCoords={setOriginCoords}
              onSelectDestCoords={setDestCoords}
            />

            {/* Status & Timestamp Header */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1 font-medium">
              <span id="updated-timestamp" className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Updated {updatedTime} · LTA DataMall
              </span>
              <span id="active-zone-badge" className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                Zone: {currentZoneInfo.label} ({carparks.length})
              </span>
            </div>

            {/* Refreshing Bar */}
            {isRefreshing && (
              <div className="py-1 px-3 bg-indigo-50/80 border border-indigo-100 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-indigo-700 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Refreshing live lots…</span>
              </div>
            )}
          </div>

          {/* Carparks List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" id="main-content">
            {appState !== 'success' ? (
              <StateViews state={appState} zoneLabel={currentZoneInfo.label} />
            ) : carparks.length === 0 ? (
              <StateViews state="empty" zoneLabel={currentZoneInfo.label} />
            ) : (
              <ul id="carparks-list" className="flex flex-col gap-2.5 pb-4" role="list">
                {carparks.map((cp) => (
                  <CarparkCard
                    key={cp.id}
                    carpark={cp}
                    allCarparks={carparks}
                    isSelected={cp.id === selectedCarparkId}
                    isSaved={savedCarparks.some((s) => s.id === cp.id)}
                    readingTimestamp={fetchedAt}
                    currentTimestampMs={currentTimestampMs}
                    onSelect={() => handleSelectCarpark(cp)}
                    onToggleSave={() => handleToggleSaveCarpark(cp)}
                    onRequestRoute={() => handleCalculateRoute(cp)}
                  />
                ))}
              </ul>
            )}

            {/* TEST STATE dropdown moved to very bottom below carpark list */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 pb-2">
              <label
                htmlFor="state-selector"
                className="text-[11px] text-slate-400 font-normal"
              >
                Demo: simulate failure states
              </label>
              <select
                id="state-selector"
                value={liveUnavailableBanner ? 'cached_failure' : testState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-slate-300 cursor-pointer"
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
          </div>
        </aside>

        {/* Right Side: Interactive Google Map */}
        <main className="flex-1 relative w-full h-full min-h-[300px]">
          <GoogleMapView
            carparks={carparks}
            selectedCarparkId={selectedCarparkId}
            userLocation={userLocation}
            routeInfo={routeInfo}
            mapCenter={mapCenter}
            zoomLevel={mapZoom}
            onSelectCarpark={handleSelectCarpark}
            onRecenterUser={requestGeolocation}
          />

          {/* Floating Route Search Panel on Mobile (Top Overlay) */}
          <div className="md:hidden absolute top-2 left-2 right-2 z-30">
            {/* Collapsed top search bar */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-100/90 rounded-xl px-2.5 py-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <input
                    type="text"
                    value={destinationText}
                    onChange={(e) => setDestinationText(e.target.value)}
                    placeholder="Search carpark or destination..."
                    className="w-full bg-transparent text-xs text-slate-800 outline-hidden font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCalculateRoute()}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Route</span>
                </button>
              </div>

              {/* Zone Chips on Mobile */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {ZONES_LIST.map((zone) => (
                  <button
                    key={zone.value}
                    type="button"
                    onClick={() => handleSelectZone(zone.value)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                      zone.value === selectedZone
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Bottom Sheet (Results Panel) */}
          <div
            id="mobile-bottom-sheet"
            className={`md:hidden absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200/90 z-30 flex flex-col transition-all duration-300 ${
              mobileSheetSnap === 'collapsed'
                ? 'h-[80px]'
                : mobileSheetSnap === 'half'
                ? 'h-[46vh]'
                : 'h-[84vh]'
            }`}
          >
            {/* Drag Handle & Header */}
            <div
              className="py-2.5 px-4 flex flex-col items-center justify-center cursor-pointer border-b border-slate-100 shrink-0"
              onClick={() => {
                if (mobileSheetSnap === 'collapsed') setMobileSheetSnap('half');
                else if (mobileSheetSnap === 'half') setMobileSheetSnap('full');
                else setMobileSheetSnap('collapsed');
              }}
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-300 mb-1.5" />
              <div className="w-full flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <span>Available Carparks</span>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                    {carparks.length}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <span>{currentZoneInfo.label}</span>
                  {mobileSheetSnap === 'full' ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>
            </div>

            {/* Sheet Content List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {appState !== 'success' ? (
                <StateViews state={appState} zoneLabel={currentZoneInfo.label} />
              ) : carparks.length === 0 ? (
                <StateViews state="empty" zoneLabel={currentZoneInfo.label} />
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {carparks.map((cp) => (
                    <CarparkCard
                      key={cp.id}
                      carpark={cp}
                      allCarparks={carparks}
                      isSelected={cp.id === selectedCarparkId}
                      isSaved={savedCarparks.some((s) => s.id === cp.id)}
                      readingTimestamp={fetchedAt}
                      currentTimestampMs={currentTimestampMs}
                      onSelect={() => handleSelectCarpark(cp)}
                      onToggleSave={() => handleToggleSaveCarpark(cp)}
                      onRequestRoute={() => handleCalculateRoute(cp)}
                    />
                  ))}
                </ul>
              )}

              {/* Mobile simulation state dropdown */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 pb-4">
                <label htmlFor="mobile-state-selector" className="text-[10px] text-slate-400">
                  Demo: simulate failure states
                </label>
                <select
                  id="mobile-state-selector"
                  value={liveUnavailableBanner ? 'cached_failure' : testState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5"
                >
                  <option value="success">Success</option>
                  <option value="loading">loading</option>
                  <option value="empty">empty</option>
                  <option value="refused">refused</option>
                  <option value="unreachable">unreachable</option>
                  <option value="stale">demo: stale data</option>
                  <option value="trend">demo: filling fast</option>
                  <option value="cached_failure">demo: unavailable banner</option>
                </select>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Route Guidance Modal */}
      <RouteDetailsModal
        route={routeInfo}
        isOpen={routeModalOpen}
        onClose={() => setRouteModalOpen(false)}
        onLaunchExternalNav={handleLaunchExternalNav}
      />

      {/* Bookmarks & Saved Locations Modal */}
      <SavedModal
        isOpen={savedModalOpen}
        savedCarparks={savedCarparks}
        savedLocations={savedLocations}
        allCarparks={carparks}
        onClose={() => setSavedModalOpen(false)}
        onSelectCarpark={handleSelectCarpark}
        onSelectLocation={(loc) => {
          setMapCenter({ lat: loc.lat, lng: loc.lng });
          setOriginText(loc.address);
          setOriginCoords({ lat: loc.lat, lng: loc.lng, label: loc.address });
        }}
        onRemoveSavedCarpark={(id) => {
          setSavedCarparks((prev) => prev.filter((c) => c.id !== id));
        }}
        onRemoveSavedLocation={(id) => {
          setSavedLocations((prev) => prev.filter((l) => l.id !== id));
        }}
      />

      {/* Driver Profile & Settings Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        testState={testState}
        onClose={() => setProfileModalOpen(false)}
        onTestStateChange={handleStateChange}
        onOpenSavedModal={() => setSavedModalOpen(true)}
      />
    </div>
  );
}
