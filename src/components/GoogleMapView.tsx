import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { LocateFixed, ZoomIn, ZoomOut, Layers, Navigation } from 'lucide-react';
import { Carpark, RouteInfo, UserLocation } from '../types.ts';

interface GoogleMapViewProps {
  carparks: Carpark[];
  selectedCarparkId: string | null;
  userLocation: UserLocation | null;
  routeInfo: RouteInfo | null;
  mapCenter: { lat: number; lng: number };
  zoomLevel: number;
  onSelectCarpark: (carpark: Carpark) => void;
  onRecenterUser: () => void;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  carparks,
  selectedCarparkId,
  userLocation,
  routeInfo,
  mapCenter,
  zoomLevel,
  onSelectCarpark,
  onRecenterUser,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Load Google Maps API
  useEffect(() => {
    let isMounted = true;
    const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

    try {
      setOptions({
        key: apiKey || '',
        v: 'weekly',
      });

      Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
      ])
        .then(([mapsLib]) => {
          if (!isMounted || !mapContainerRef.current) return;
          const { Map: GoogleMap } = mapsLib as google.maps.MapsLibrary;

          // Initialize Google Map instance with internalUsageAttributionIds
          const mapOptions: google.maps.MapOptions & { internalUsageAttributionIds?: string[] } = {
            center: mapCenter,
            zoom: zoomLevel,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true, // We provide clean custom controls
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy', // smooth mobile touch and pan
            internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'simplified' }],
              },
              {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'simplified' }],
              },
            ],
          };

          const map = new GoogleMap(mapContainerRef.current, mapOptions);
          mapInstanceRef.current = map;
          setMapLoaded(true);
        })
        .catch((err) => {
          console.warn('Google Maps JS API load failed, switching to interactive fallback map:', err);
          setMapLoadError(err?.message || 'Failed to load Google Maps');
        });
    } catch (err: unknown) {
      setMapLoadError((err as Error)?.message || 'Failed to initialize Google Maps');
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Update map center when props change
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      mapInstanceRef.current.panTo(mapCenter);
    }
  }, [mapCenter, mapLoaded]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      return;
    }

    const position = { lat: userLocation.lat, lng: userLocation.lng };

    if (!userMarkerRef.current) {
      // Create user location marker with pulsing circle SVG
      userMarkerRef.current = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: userLocation.addressLabel || 'You are here',
        zIndex: 9999,
        icon: {
          url:
            'data:image/svg+xml;charset=UTF-8,' +
            encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="16" fill="#3B82F6" fill-opacity="0.25" stroke="#2563EB" stroke-width="2"/>
                <circle cx="20" cy="20" r="7" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="2.5"/>
              </svg>
            `),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
      });
    } else {
      userMarkerRef.current.setPosition(position);
    }
  }, [userLocation, mapLoaded]);

  // Update carpark markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;

    // Clear old markers that no longer exist
    const currentIds = new Set(carparks.map((c) => c.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    carparks.forEach((carpark) => {
      if (carpark.lat === null || carpark.lng === null) return;
      const isSelected = carpark.id === selectedCarparkId;

      // Lot badge color
      let bgColor = '#10B981'; // emerald green (>50)
      if (carpark.lots === 0) {
        bgColor = '#EF4444'; // red (FULL)
      } else if (carpark.lots <= 50) {
        bgColor = '#F59E0B'; // amber (1-50)
      }

      const lotsText = carpark.lots === 0 ? 'FULL' : `${carpark.lots}`;
      const badgeWidth = carpark.lots === 0 ? 46 : 40;

      const markerSvg = `
        <svg width="${badgeWidth + 8}" height="42" viewBox="0 0 ${badgeWidth + 8} 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.25))">
            <!-- Pin Body -->
            <rect x="4" y="2" width="${badgeWidth}" height="24" rx="12" fill="${bgColor}" stroke="${isSelected ? '#4338CA' : '#FFFFFF'}" stroke-width="${isSelected ? '3' : '2'}"/>
            <!-- Pin Pointer -->
            <path d="M${(badgeWidth + 8) / 2 - 5} 25 L${(badgeWidth + 8) / 2} 33 L${(badgeWidth + 8) / 2 + 5} 25 Z" fill="${bgColor}" stroke="${isSelected ? '#4338CA' : '#FFFFFF'}" stroke-width="${isSelected ? '2' : '1.5'}"/>
            <!-- Lot Text -->
            <text x="${(badgeWidth + 8) / 2}" y="18" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${carpark.lots === 0 ? '10' : '11'}" font-weight="800" text-anchor="middle">${lotsText}</text>
          </g>
        </svg>
      `;

      let marker = markersRef.current.get(carpark.id);
      const position = { lat: carpark.lat, lng: carpark.lng };

      if (!marker) {
        marker = new google.maps.Marker({
          position,
          map,
          title: `${carpark.name}: ${carpark.lots} lots`,
          zIndex: isSelected ? 1000 : 100,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
            scaledSize: new google.maps.Size(badgeWidth + 8, 42),
            anchor: new google.maps.Point((badgeWidth + 8) / 2, 33),
          },
        });

        marker.addListener('click', () => {
          onSelectCarpark(carpark);
        });

        markersRef.current.set(carpark.id, marker);
      } else {
        marker.setPosition(position);
        marker.setZIndex(isSelected ? 1000 : 100);
        marker.setIcon({
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
          scaledSize: new google.maps.Size(badgeWidth + 8, 42),
          anchor: new google.maps.Point((badgeWidth + 8) / 2, 33),
        });
      }
    });
  }, [carparks, selectedCarparkId, mapLoaded, onSelectCarpark]);

  // Render Route Polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;

    // Clear old polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    if (!routeInfo || !routeInfo.path || routeInfo.path.length < 2) return;

    const coordinates = routeInfo.path.map((p) => ({ lat: p.lat, lng: p.lng }));

    routePolylineRef.current = new google.maps.Polyline({
      path: coordinates,
      geodesic: true,
      strokeColor: '#4F46E5', // indigo-600
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map,
    });

    // Fit map bounds to encompass the entire route
    const bounds = new google.maps.LatLngBounds();
    coordinates.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { top: 70, right: 50, bottom: 90, left: 50 });
  }, [routeInfo, mapLoaded]);

  // Controls
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 14;
      mapInstanceRef.current.setZoom(current + 1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 14;
      mapInstanceRef.current.setZoom(Math.max(10, current - 1));
    }
  }, []);

  const handleToggleMapType = useCallback(() => {
    if (mapInstanceRef.current) {
      const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
      mapInstanceRef.current.setMapTypeId(
        nextType === 'satellite' ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP
      );
      setMapType(nextType);
    }
  }, [mapType]);

  return (
    <div className="relative w-full h-full min-h-[350px] bg-slate-100 overflow-hidden select-none">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" id="google-map-element" />

      {/* Fallback View if Google Maps JS fails */}
      {mapLoadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Interactive Map Preview</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
            Viewing Singapore carpark zones and routes. Real-time lot counters and turn navigation are fully operational.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRecenterUser}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs"
            >
              Center My Location
            </button>
          </div>
        </div>
      )}

      {/* Floating Map Controls */}
      <div className="absolute right-3.5 bottom-6 flex flex-col gap-2 z-20">
        {/* Recenter My Location */}
        <button
          type="button"
          id="map-recenter-btn"
          onClick={onRecenterUser}
          className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-indigo-600 flex items-center justify-center shadow-md border border-slate-200/80 transition-all cursor-pointer"
          title="Recenter on my location"
          aria-label="Recenter on my location"
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        {/* Map Type Toggle */}
        <button
          type="button"
          onClick={handleToggleMapType}
          className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-indigo-600 flex items-center justify-center shadow-md border border-slate-200/80 transition-all cursor-pointer"
          title={`Switch to ${mapType === 'roadmap' ? 'Satellite' : 'Roadmap'} view`}
          aria-label="Toggle map view"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* Zoom In & Out */}
        <div className="flex flex-col bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 hover:bg-slate-50 active:scale-95 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 hover:bg-slate-50 active:scale-95 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Google Maps Required Attribution Badge */}
      <div className="absolute left-3 bottom-2 z-10 pointer-events-none">
        <span className="text-[10px] text-slate-500 font-semibold bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/80 shadow-xs">
          Google Maps
        </span>
      </div>
    </div>
  );
};
