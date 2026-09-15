export interface Carpark {
  id: string;
  name: string;
  agency: 'LTA' | 'URA' | 'HDB' | string;
  lots: number;
  lat: number | null;
  lng: number | null;
}

export type ZoneCode = 'Orchard' | 'Marina' | 'Harbfront' | 'JurongLakeDistrict';

export interface ZoneInfo {
  label: string;
  value: ZoneCode;
}

export interface ZoneData {
  fetchedAt: string;
  zone: ZoneCode;
  count: number;
  carparks: Carpark[];
}

export type AppState = 'loading' | 'empty' | 'refused' | 'unreachable' | 'success';
export type TestState = AppState;
