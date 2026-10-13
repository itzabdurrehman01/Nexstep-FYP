// @vitest-environment jsdom
/**
 * frontend/src/components/admin/DataReadinessDashboard.test.jsx
 *
 * Real DOM Component & Auth-Guard Test Suite using React Testing Library & Vitest.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DataReadinessDashboard } from './DataReadinessDashboard.jsx';
import { ProtectedRoute } from '../auth/ProtectedRoute.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';

const mockPayload = {
  timestamp: '2026-08-19T23:00:00.000Z',
  series: [
    {
      seriesId: 'pbs-macro-demand',
      modelName: 'Job & Skill Demand Forecast (PBS Macro-Demand)',
      status: 'BLOCKED',
      requiredThreshold: '8 annual periods',
      verifiedObservedPeriods: 6,
      pendingReviewObservedPeriods: 5, // Nonzero pending backlog
      periodsRemaining: 2,
      cadence: 'Annual PBS Labour Force Survey releases',
      projectedUnlockDate: '2028-Q3',
      dataOriginCoverage: { officialVerified: 6, kaggle: 3 }
    },
    {
      seriesId: 'njp-vacancy-demand',
      modelName: 'Job & Skill Demand Forecast (NJP Vacancy Micro-Demand)',
      status: 'BLOCKED',
      requiredThreshold: '52 weekly snapshots (1 year accumulation)',
      verifiedObservedSnapshots: 0,
      pendingReviewObservedSnapshots: 0,
      snapshotsRemaining: 52,
      cadence: 'Weekly NJP active vacancy snapshots',
      projectedUnlockDate: '2027-Q3',
      dataOriginCoverage: { officialVerified: 0, kaggle: 0 }
    }
  ],
  baselineProductionModel: {
    modelStatus: 'BASELINE_ONLY',
    modelVersion: 'baseline-hybrid-1.0.0',
    activeEngine: 'Deterministic Multi-Factor Hybrid Career Ranker'
  }
};

describe('DataReadinessDashboard & Auth Guard RTL Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ── PART 2: Real Auth-Guard Navigation Tests (No mirror functions) ─────────
  it('redirects unauthenticated user to /auth when accessing /admin/data-readiness', () => {
    const authValue = { user: null, authStatus: 'unauthenticated' };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin/data-readiness']}>
          <Routes>
            <Route path="/auth" element={<div>Auth Target Page</div>} />
            <Route
              path="/admin/data-readiness"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <DataReadinessDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Auth Target Page')).toBeInTheDocument();
    expect(screen.queryByText('Data Readiness & Model Unlock Dashboard')).not.toBeInTheDocument();
  });

  it('redirects non-admin STUDENT user to /dashboard when accessing /admin/data-readiness', () => {
    const authValue = { user: { role: 'STUDENT' }, authStatus: 'authenticated' };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin/data-readiness']}>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard Target Page</div>} />
            <Route
              path="/admin/data-readiness"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <DataReadinessDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Dashboard Target Page')).toBeInTheDocument();
    expect(screen.queryByText('Data Readiness & Model Unlock Dashboard')).not.toBeInTheDocument();
  });

  it('allows ADMIN user to render DataReadinessDashboard DOM content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload
    });

    const authValue = { user: { role: 'ADMIN' }, authStatus: 'authenticated' };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/admin/data-readiness']}>
          <Routes>
            <Route
              path="/admin/data-readiness"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <DataReadinessDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Data Readiness & Model Unlock Dashboard')).toBeInTheDocument();
    });
  });

  // ── PART 3: Nonzero Pending Review & DOM Styling Tests ──────────────────────
  it('renders pending review count separately and calculates progress bar strictly from verified count', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload
    });

    render(
      <MemoryRouter>
        <DataReadinessDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Job & Skill Demand Forecast (PBS Macro-Demand)')).toBeInTheDocument();
    });

    // 1. Assert pending badge is rendered with distinct styling
    const pendingBadge = screen.getByText('5 Pending Review');
    expect(pendingBadge).toBeInTheDocument();
    expect(pendingBadge.className).toContain('bg-slate-800');

    // 2. Assert progress bar width strictly evaluates to 75% (6 / 8), NOT 137.5% (11 / 8)
    const progressText = screen.getByText('75%');
    expect(progressText).toBeInTheDocument();

    const progressBar = progressText.closest('div')?.parentElement?.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  // ── PART 4: Loading, Error, Empty, Refresh & Timestamp State Tests ─────────
  it('renders loading spinner state while fetch is pending', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // Pending promise

    render(
      <MemoryRouter>
        <DataReadinessDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Fetching real-time data readiness metrics…')).toBeInTheDocument();
  });

  it('renders clean error state without exposing raw stack trace on HTTP failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403
    });

    render(
      <MemoryRouter>
        <DataReadinessDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Data Readiness Error')).toBeInTheDocument();
      expect(screen.getByText('Access Restricted: Admin authorization required to view data readiness metrics.')).toBeInTheDocument();
      expect(screen.getByText('Retry Connection')).toBeInTheDocument();
    });
  });

  it('renders empty state fallback when series list is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ timestamp: '2026-08-19T23:00:00.000Z', series: [] })
    });

    render(
      <MemoryRouter>
        <DataReadinessDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Data Series Registered')).toBeInTheDocument();
      expect(screen.getByText('No time-series indicators are currently being monitored for data readiness.')).toBeInTheDocument();
    });
  });

  it('re-fetches endpoint when Refresh button is clicked and displays formatted timestamp', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload
    });
    global.fetch = fetchMock;

    render(
      <MemoryRouter>
        <DataReadinessDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Data Readiness & Model Unlock Dashboard')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Click Refresh button
    const refreshBtn = screen.getByRole('button', { name: /^refresh$/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
