export interface Carpark {
  id: string;
  name: string;
  agency: 'LTA' | 'URA' | 'HDB' | string;
  lots: number;
  totalLots?: number;
  lat: number | null;
  lng: number | null;
  fetchedAt?: string;
  distanceMeters?: number;
  distanceKm?: number;
  distanceFormatted?: string;
  zone?: ZoneCode | string;
}

export type ZoneCode = 'Orchard' | 'Marina' | 'Harbfront' | 'JurongLakeDistrict';

export interface ZoneInfo {
  label: string;
  value: ZoneCode;
  center: { lat: number; lng: number };
}

export interface ZoneData {
  fetchedAt: string;
  zone?: ZoneCode | string;
  count: number;
  carparks: Carpark[];
  center?: { lat: number; lng: number };
}

export interface UserLocation {
  lat: number;
  lng: number;
  addressLabel: string;
  isLive: boolean;
  accuracy?: number;
  timestamp?: number;
}

export interface RouteStep {
  instruction: string;
  distanceText: string;
  durationText: string;
  turnType?: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'destination';
}

export interface RouteInfo {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string; carparkId?: string };
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  steps: RouteStep[];
  path: Array<{ lat: number; lng: number }>;
}

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  savedAt: number;
}

export interface SavedCarpark {
  id: string;
  name: string;
  savedAt: number;
}

export interface AutocompleteResult {
  placeId: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
}

export type AppState = 'loading' | 'empty' | 'refused' | 'unreachable' | 'success';
export type TestState = AppState;

export type GeolocationStatus = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'timeout';
