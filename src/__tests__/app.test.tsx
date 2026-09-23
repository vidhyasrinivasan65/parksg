import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { calculateDistanceMeters, formatDistance, findNearbyAlternative } from '../utils/distance.ts';
import { getFreshnessInfo } from '../utils/freshness.ts';
import { STALE_THRESHOLD_MINUTES } from '../utils/constants.ts';
import { analyzeCarparkTrend, recordCarparkReading } from '../utils/trend.ts';
import { CarparkCard } from '../components/CarparkCard.tsx';
import { Navbar } from '../components/Navbar.tsx';
import { RouteSearchPanel } from '../components/RouteSearchPanel.tsx';
import { GeolocationBanner } from '../components/GeolocationBanner.tsx';
import { RouteDetailsModal } from '../components/RouteDetailsModal.tsx';
import { Carpark, RouteInfo } from '../types.ts';

describe('ParkSG Distance & Geolocation Utilities', () => {
  it('calculates Haversine distance correctly between two Singapore landmarks', () => {
    // ION Orchard (1.3039, 103.8318) to Plaza Singapura (1.3006, 103.8452)
    const dist = calculateDistanceMeters(1.3039, 103.8318, 1.3006, 103.8452);
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(2000);
  });

  it('formats distance into human-readable strings', () => {
    expect(formatDistance(380)).toBe('400 m');
    expect(formatDistance(1450)).toBe('1.5 km');
  });

  it('finds closest carpark with healthy availability as alternative', () => {
    const fullCarpark: Carpark = {
      id: 'ORC_CEN',
      name: 'Orchard Central',
      agency: 'URA',
      lots: 0,
      lat: 1.3009,
      lng: 103.8384,
    };

    const allCarparks: Carpark[] = [
      fullCarpark,
      {
        id: 'ORC_ION',
        name: 'ION Orchard',
        agency: 'LTA',
        lots: 142,
        lat: 1.3039,
        lng: 103.8318,
      },
      {
        id: 'ORC_SOM',
        name: '313@somerset',
        agency: 'LTA',
        lots: 3,
        lat: 1.3015,
        lng: 103.8398,
      },
    ];

    const alt = findNearbyAlternative(fullCarpark, allCarparks);
    expect(alt).not.toBeNull();
    expect(alt?.id).toBe('ORC_ION');
    expect(alt?.lots).toBe(142);
  });
});

describe('ParkSG Freshness & Trend Warnings', () => {
  it('marks readings under 10 minutes as fresh', () => {
    const now = Date.now();
    const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();
    const freshness = getFreshnessInfo(twoMinutesAgo, now);

    expect(freshness.isStale).toBe(false);
    expect(freshness.label).toContain('2 min ago');
  });

  it('marks readings older than STALE_THRESHOLD_MINUTES as stale', () => {
    const now = Date.now();
    const fourteenMinsAgo = new Date(now - 14 * 60 * 1000).toISOString();
    const freshness = getFreshnessInfo(fourteenMinsAgo, now);

    expect(freshness.isStale).toBe(true);
    expect(freshness.label).toContain('May be outdated');
    expect(freshness.label).toContain('14 min ago');
  });

  it('detects rapidly declining parking lots (filling fast)', () => {
    const cpId = 'TEST_TREND_CP';
    const now = Date.now();

    // 8 minutes ago, it had 60 lots
    recordCarparkReading(cpId, 60, now - 8 * 60 * 1000);
    // Now it has 15 lots (dropped 45 lots in 8 minutes)
    recordCarparkReading(cpId, 15, now);

    const trend = analyzeCarparkTrend(cpId, 15, now);
    expect(trend.isFillingFast).toBe(true);
    expect(trend.warningMessage).toContain('Filling fast');
  });
});

describe('ParkSG Frontend UI Components', () => {
  it('renders Navbar with active location badge and actions', () => {
    const onFindParking = vi.fn();
    const onSaved = vi.fn();
    const onProfile = vi.fn();

    render(
      <Navbar
        userLocation={{
          lat: 1.3039,
          lng: 103.8318,
          addressLabel: 'Orchard Road',
          isLive: true,
        }}
        locationStatus="granted"
        savedCount={2}
        activeView="map"
        onFindParkingClick={onFindParking}
        onSavedClick={onSaved}
        onProfileClick={onProfile}
        onRequestGeolocation={vi.fn()}
        onOpenLocationPicker={vi.fn()}
      />
    );

    expect(screen.getByText('ParkSG')).toBeInTheDocument();
    expect(screen.getByText('Live: Orchard Road')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // saved count badge
  });

  it('renders RouteSearchPanel and handles inputs and zone selection', () => {
    const onOriginChange = vi.fn();
    const onDestinationChange = vi.fn();
    const onSwap = vi.fn();
    const onRoute = vi.fn();
    const onSelectZone = vi.fn();

    render(
      <RouteSearchPanel
        userLocation={null}
        selectedZone="Orchard"
        originText="Orchard Road"
        destinationText="Marina Bay"
        isSearchingRoute={false}
        onOriginChange={onOriginChange}
        onDestinationChange={onDestinationChange}
        onUseMyLocation={vi.fn()}
        onSwapLocations={onSwap}
        onSearchRoute={onRoute}
        onSelectZone={onSelectZone}
      />
    );

    expect(screen.getByDisplayValue('Orchard Road')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Marina Bay')).toBeInTheDocument();

    // Click swap button
    const swapBtn = screen.getByLabelText('Swap starting and destination locations');
    fireEvent.click(swapBtn);
    expect(onSwap).toHaveBeenCalled();

    // Click route button
    const routeBtn = screen.getByTitle('Calculate driving route and find parking');
    fireEvent.click(routeBtn);
    expect(onRoute).toHaveBeenCalled();

    // Select Marina zone
    const marinaChip = screen.getByText('Marina');
    fireEvent.click(marinaChip);
    expect(onSelectZone).toHaveBeenCalledWith('Marina');
  });

  it('renders GeolocationBanner on denied permission and allows setting manual address', () => {
    const onSetManual = vi.fn();
    const onDismiss = vi.fn();

    render(
      <GeolocationBanner
        status="denied"
        manualAddress=""
        onSetManualAddress={onSetManual}
        onDismiss={onDismiss}
        onRequestGeolocation={vi.fn()}
      />
    );

    expect(screen.getByText('Location permission is off')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e\.g\. Orchard Road/i);
    fireEvent.change(input, { target: { value: 'Raffles Place' } });

    const submitBtn = screen.getByText('Set Location');
    fireEvent.click(submitBtn);

    expect(onSetManual).toHaveBeenCalledWith('Raffles Place', false);
  });

  it('renders CarparkCard with lot count, freshness, and action buttons', () => {
    const testCarpark: Carpark = {
      id: 'ORC_ION',
      name: 'ION Orchard',
      agency: 'LTA',
      lots: 142,
      lat: 1.3039,
      lng: 103.8318,
      distanceFormatted: '450 m',
    };

    const onRequestRoute = vi.fn();
    const onToggleSave = vi.fn();

    render(
      <CarparkCard
        carpark={testCarpark}
        allCarparks={[testCarpark]}
        isSelected={false}
        isSaved={false}
        currentTimestampMs={Date.now()}
        readingTimestamp={new Date().toISOString()}
        onRequestRoute={onRequestRoute}
        onToggleSave={onToggleSave}
      />
    );

    expect(screen.getByText('ION Orchard')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('450 m')).toBeInTheDocument();

    // Click Route button
    const routeBtn = screen.getByTitle('Calculate driving route');
    fireEvent.click(routeBtn);
    expect(onRequestRoute).toHaveBeenCalled();

    // Click Save button
    const saveBtn = screen.getByLabelText('Bookmark carpark');
    fireEvent.click(saveBtn);
    expect(onToggleSave).toHaveBeenCalled();
  });

  it('renders RouteDetailsModal with turn-by-turn steps and duration', () => {
    const mockRoute: RouteInfo = {
      distanceMeters: 4200,
      distanceText: '4.2 km',
      durationSeconds: 660,
      durationText: '11 mins',
      origin: { lat: 1.3039, lng: 103.8318, label: 'Orchard Road' },
      destination: { lat: 1.2834, lng: 103.8607, label: 'Marina Bay Sands' },
      path: [
        { lat: 1.3039, lng: 103.8318 },
        { lat: 1.2834, lng: 103.8607 },
      ],
      steps: [
        {
          instruction: 'Head southeast on Orchard Rd toward Paterson Rd',
          distanceText: '450 m',
          durationText: '1 min',
          turnType: 'straight',
        },
        {
          instruction: 'Turn right onto Bras Basah Rd',
          distanceText: '1.2 km',
          durationText: '3 mins',
          turnType: 'right',
        },
        {
          instruction: 'Arrive at Marina Bay Sands carpark entrance',
          distanceText: '100 m',
          durationText: '1 min',
          turnType: 'destination',
        },
      ],
    };

    const onLaunchNav = vi.fn();

    render(
      <RouteDetailsModal
        route={mockRoute}
        isOpen={true}
        onClose={vi.fn()}
        onLaunchExternalNav={onLaunchNav}
      />
    );

    expect(screen.getByText('Route Guidance')).toBeInTheDocument();
    expect(screen.getByText('11 mins')).toBeInTheDocument();
    expect(screen.getByText('4.2 km')).toBeInTheDocument();
    expect(screen.getByText(/Turn right onto Bras Basah Rd/i)).toBeInTheDocument();
    expect(screen.getByText('Start Live GPS Navigation')).toBeInTheDocument();

    const startNavBtn = screen.getByText('Start Live GPS Navigation');
    fireEvent.click(startNavBtn);
    expect(onLaunchNav).toHaveBeenCalled();
  });
});
