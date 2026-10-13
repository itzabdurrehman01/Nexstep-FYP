import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Database,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Tag
} from 'lucide-react';

export function DataReadinessDashboard({ lang = 'en' }) {
  const [readinessData, setReadinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReadinessData = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/data-readiness', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Access Restricted: Admin authorization required to view data readiness metrics.');
        }
        throw new Error(`Failed to load data readiness status (HTTP ${res.status}).`);
      }
      const json = await res.json();
      setReadinessData(json);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while fetching data readiness metrics.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReadinessData();
  }, []);

  /**
   * Helper to extract numerical verified count from series object regardless of series type
   */
  const getVerifiedCount = (seriesItem) => {
    if (typeof seriesItem.verifiedObservedPeriods === 'number') return seriesItem.verifiedObservedPeriods;
    if (typeof seriesItem.verifiedObservedSnapshots === 'number') return seriesItem.verifiedObservedSnapshots;
    if (typeof seriesItem.verifiedObservedCycles === 'number') return seriesItem.verifiedObservedCycles;
    return 0;
  };

  /**
   * Helper to extract numerical pending review count from series object
   */
  const getPendingCount = (seriesItem) => {
    if (typeof seriesItem.pendingReviewObservedPeriods === 'number') return seriesItem.pendingReviewObservedPeriods;
    if (typeof seriesItem.pendingReviewObservedSnapshots === 'number') return seriesItem.pendingReviewObservedSnapshots;
    if (typeof seriesItem.pendingReviewObservedCycles === 'number') return seriesItem.pendingReviewObservedCycles;
    return 0;
  };

  /**
   * Helper to extract numerical target threshold from requiredThreshold string
   */
  const getTargetThreshold = (seriesItem) => {
    if (seriesItem.periodsRemaining !== undefined) return getVerifiedCount(seriesItem) + seriesItem.periodsRemaining;
    if (seriesItem.snapshotsRemaining !== undefined) return getVerifiedCount(seriesItem) + seriesItem.snapshotsRemaining;
    if (seriesItem.cyclesRemaining !== undefined) return getVerifiedCount(seriesItem) + seriesItem.cyclesRemaining;
    const match = seriesItem.requiredThreshold?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 10;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Fetching real-time data readiness metrics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100">Data Readiness Error</h2>
          <p className="text-slate-400 text-sm">{error}</p>
          <button
            onClick={fetchReadinessData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-colors inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const seriesList = readinessData?.series || [];
  const baselineModel = readinessData?.baselineProductionModel;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Data Readiness & Model Unlock Dashboard
              </h1>
              <p className="text-slate-400 text-xs md:text-sm">
                Internal ML Infrastructure Readiness Tracker — Monitoring Historical Time-Series Accumulation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {readinessData?.timestamp && (
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-500 block">Last Synced</span>
              <span className="text-xs text-slate-300 font-mono">
                {new Date(readinessData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
          <button
            onClick={fetchReadinessData}
            disabled={isRefreshing}
            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Production System Baseline Status Banner */}
      {baselineModel && (
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ACTIVE PRODUCTION SYSTEM
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {baselineModel.modelVersion || 'v1.0.0'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                {baselineModel.activeEngine || 'Deterministic Multi-Factor Hybrid Career Ranker'}
              </h2>
              <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
                All production recommendation traffic is actively served by the Experiment A deterministic hybrid model.
                Future time-series forecasting engines remain gated until historical observation thresholds are fully cleared.
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center min-w-[180px]">
              <span className="text-xs text-slate-500 block">Production Status</span>
              <span className="text-sm font-bold text-emerald-400 font-mono tracking-wide">
                {baselineModel.modelStatus || 'BASELINE_ONLY'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Series List Grid */}
      {seriesList.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No Data Series Registered</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            No time-series indicators are currently being monitored for data readiness.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {seriesList.map((seriesItem) => {
            const verifiedCount = getVerifiedCount(seriesItem);
            const pendingCount = getPendingCount(seriesItem);
            const targetThreshold = getTargetThreshold(seriesItem);
            const progressPct = Math.min(100, Math.round((verifiedCount / Math.max(1, targetThreshold)) * 100));
            const isBlocked = seriesItem.status === 'BLOCKED';

            return (
              <div
                key={seriesItem.seriesId || seriesItem.modelName}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-6 hover:border-slate-700/80 transition-all"
              >
                {/* Series Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {seriesItem.modelName}
                      </h3>
                      {seriesItem.seriesId && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                          {seriesItem.seriesId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <span className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cadence: <strong className="text-slate-300 font-medium">{seriesItem.cadence}</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isBlocked ? (
                      <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>BLOCKED</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        <Unlock className="w-3.5 h-3.5" />
                        <span>UNLOCKED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Progress Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="text-slate-400">Verified Historical Progress: </span>
                        <strong className="text-white text-sm font-semibold ml-1">
                          {verifiedCount} / {targetThreshold}
                        </strong>
                        <span className="text-slate-500 ml-1">({seriesItem.requiredThreshold})</span>
                      </div>
                      <span className="text-slate-400 font-mono font-medium">{progressPct}%</span>
                    </div>

                    {/* Progress Bar (Strictly Verified Only) */}
                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isBlocked ? ' bg-amber-500/80 ' : ' bg-emerald-500 '
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Visually Separate Pending Review Backlog Badge */}
                    {pendingCount > 0 ? (
                      <div className="flex items-center space-x-2 pt-1 text-xs text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                          {pendingCount} Pending Review
                        </span>
                        <span className="text-slate-500 text-[11px] italic">
                          (Excluded from threshold until human approval)
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 pt-1">
                        No pending review backlog for this series.
                      </div>
                    )}
                  </div>

                  {/* Unlock Basis & Projection Card */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                    <span className="text-xs text-slate-500 font-medium block">Projected Unlock Timeline</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-white font-mono">
                        {seriesItem.projectedUnlockDate}
                      </span>
                      <span className="text-xs text-slate-400">
                        {isBlocked ? `${targetThreshold - verifiedCount} remaining` : 'Unlocked'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Based on current verified count ({verifiedCount}) and source cadence ({seriesItem.cadence}).
                    </p>
                  </div>
                </div>

                {/* Data Origin Breakdown */}
                {seriesItem.dataOriginCoverage && (
                  <div className="pt-4 border-t border-slate-800/60 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      Data Origin Breakdown:
                    </span>
                    {Object.entries(seriesItem.dataOriginCoverage).map(([originKey, count]) => {
                      const isKaggle = originKey.toLowerCase().includes('kaggle');
                      return (
                        <div
                          key={originKey}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center space-x-1.5 ${
                            isKaggle
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700'
                          }`}
                        >
                          <span>{originKey}:</span>
                          <strong className="text-white font-bold">{count}</strong>
                          {isKaggle && (
                            <span className="text-[11px] px-1 py-0.2 bg-blue-500/20 text-blue-200 rounded ml-1 font-sans">
                              Reference-Only
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DataReadinessDashboard;
