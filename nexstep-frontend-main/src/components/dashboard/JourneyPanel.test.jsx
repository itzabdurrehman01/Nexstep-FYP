import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { JourneyPanel } from './JourneyPanel.jsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('JourneyPanel', () => {
  it('shows the class-to-university path, milestones, and automatic deadlines', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <JourneyPanel
        profile={{
          education: { level: 'class12' },
          preferredStream: 'FSc Pre-Medical',
          topRiasecCluster: 'Investigative',
          marks: { fscPct: 90 },
        }}
        onNavigate={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'From your class to university' })).toBeInTheDocument();
    expect(screen.getByText('Class 8')).toBeInTheDocument();
    expect(screen.getByText('FSc II')).toBeInTheDocument();
    expect(screen.getByText('University')).toBeInTheDocument();
    expect(screen.getByText('MDCAT registration opens')).toBeInTheDocument();
    expect(screen.getByText('University application window')).toBeInTheDocument();
    expect(screen.queryByText('ECAT / NUST NET registration opens')).not.toBeInTheDocument();
    expect(screen.getByText('Interest quiz result saved')).toBeInTheDocument();
    expect(screen.getByText('Marks saved')).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.guidance.cluster).toBe('Investigative');
    expect(body.guidance.recommendations.length).toBeGreaterThan(0);
    expect(body.guidance.deadlines.some((d) => d.kind === 'entry-test')).toBe(true);
    expect(body.guidance.deadlines.some((d) => d.kind === 'application')).toBe(true);

    expect(await screen.findByText(/Saved on your profile:/)).toBeInTheDocument();
  });
});
