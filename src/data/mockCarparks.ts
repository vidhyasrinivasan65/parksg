import { ZoneCode, ZoneData, ZoneInfo } from '../types.ts';

export const ZONE_MAPPING: Record<string, ZoneInfo> = {
  Orchard: {
    label: 'Orchard',
    value: 'Orchard',
    center: { lat: 1.3048, lng: 103.8318 },
  },
  Marina: {
    label: 'Marina',
    value: 'Marina',
    center: { lat: 1.2903, lng: 103.857 },
  },
  HarbourFront: {
    label: 'HarbourFront',
    value: 'Harbfront',
    center: { lat: 1.2653, lng: 103.822 },
  },
  'Jurong Lake District': {
    label: 'Jurong Lake District',
    value: 'JurongLakeDistrict',
    center: { lat: 1.3329, lng: 103.7436 },
  },
};

export const ZONES_LIST: ZoneInfo[] = [
  ZONE_MAPPING['Orchard'],
  ZONE_MAPPING['Marina'],
  ZONE_MAPPING['HarbourFront'],
  ZONE_MAPPING['Jurong Lake District'],
];

export const MOCK_DATA_STORE: Record<ZoneCode, ZoneData> = {
  Orchard: {
    fetchedAt: '2025-02-23T14:32:10+08:00',
    zone: 'Orchard',
    center: { lat: 1.3048, lng: 103.8318 },
    count: 9,
    carparks: [
      { id: 'ORC_ION', name: 'ION Orchard', agency: 'LTA', lots: 142, lat: 1.3039, lng: 103.8318 },
      { id: 'ORC_PLA', name: 'Plaza Singapura', agency: 'URA', lots: 95, lat: 1.3006, lng: 103.8452 },
      { id: 'ORC_TAK', name: 'Takashimaya / Ngee Ann City', agency: 'URA', lots: 78, lat: 1.3025, lng: 103.8344 },
      { id: 'ORC_SHA', name: 'Shaw Centre & House', agency: 'LTA', lots: 64, lat: 1.3056, lng: 103.8315 },
      { id: 'ORC_PAR', name: 'Paragon Shopping Centre', agency: 'LTA', lots: 34, lat: 1.3038, lng: 103.8358 },
      { id: 'ORC_WHE', name: 'Wheelock Place', agency: 'URA', lots: 12, lat: 1.3048, lng: 103.8307 },
      { id: 'ORC_SOM', name: '313@somerset', agency: 'LTA', lots: 3, lat: 1.3009, lng: 103.8384 },
      { id: 'ORC_CEN', name: 'Orchard Central', agency: 'URA', lots: 0, lat: null, lng: null },
      { id: 'ORC_FOR', name: 'The Centrepoint', agency: 'HDB', lots: 0, lat: 1.3015, lng: 103.8398 },
    ],
  },
  Marina: {
    fetchedAt: '2025-02-23T14:32:10+08:00',
    zone: 'Marina',
    center: { lat: 1.2903, lng: 103.857 },
    count: 5,
    carparks: [
      { id: 'MAR_MBS', name: 'Marina Bay Sands', agency: 'LTA', lots: 215, lat: 1.2834, lng: 103.8607 },
      { id: 'MAR_SUN', name: 'Suntec City', agency: 'URA', lots: 89, lat: 1.2935, lng: 103.8572 },
      { id: 'MAR_MIL', name: 'Millenia Walk', agency: 'LTA', lots: 41, lat: 1.2929, lng: 103.8596 },
      { id: 'MAR_ESQ', name: 'Esplanade Mall', agency: 'URA', lots: 18, lat: 1.2898, lng: 103.8558 },
      { id: 'MAR_MAR', name: 'Marina Square', agency: 'LTA', lots: 0, lat: null, lng: null },
    ],
  },
  Harbfront: {
    fetchedAt: '2025-02-23T14:32:10+08:00',
    zone: 'Harbfront',
    center: { lat: 1.2653, lng: 103.822 },
    count: 3,
    carparks: [
      { id: 'HBF_VIV', name: 'VivoCity', agency: 'LTA', lots: 160, lat: 1.2644, lng: 103.8222 },
      { id: 'HBF_CTR', name: 'HarbourFront Centre', agency: 'URA', lots: 45, lat: 1.2639, lng: 103.8206 },
      { id: 'HBF_TWR', name: 'HarbourFront Tower One', agency: 'LTA', lots: 0, lat: 1.2652, lng: 103.8198 },
    ],
  },
  JurongLakeDistrict: {
    fetchedAt: '2025-02-23T14:32:10+08:00',
    zone: 'JurongLakeDistrict',
    center: { lat: 1.3329, lng: 103.7436 },
    count: 4,
    carparks: [
      { id: 'JLD_JEM', name: 'Jem', agency: 'LTA', lots: 110, lat: 1.3332, lng: 103.7431 },
      { id: 'JLD_WES', name: 'Westgate', agency: 'URA', lots: 75, lat: 1.3344, lng: 103.7428 },
      { id: 'JLD_IMM', name: 'IMM Building', agency: 'LTA', lots: 35, lat: 1.3351, lng: 103.7468 },
      { id: 'JLD_JCU', name: 'JCube (Former)', agency: 'URA', lots: 0, lat: null, lng: null },
    ],
  },
};
