import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import logoImg from '../../assets/images/nexstep_logo_1786045525796.png';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error);
    console.error('ErrorBoundary component stack:', errorInfo?.componentStack);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoToDashboard = () => {
    window.location.hash = '#/dashboard';
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo, showDetails } = this.state;

    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-mesh-pattern"
        style={{
          backgroundColor: 'var(--ns-bg)',
          color: 'var(--ns-text)',
          fontFamily: 'var(--ns-font-sans)',
        }}
      >
        <div className="absolute ns-accent-glow-left" aria-hidden="true" />
        <div className="absolute ns-accent-glow-right" aria-hidden="true" />

        <div
          className="ns-card relative w-full max-w-lg mx-auto p-6 sm:p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex items-center gap-3">
              <img
                src={logoImg}
                alt="NexStep"
                className="h-10 w-10 rounded-xl object-contain shadow-sm bg-slate-50"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-left">
                <div className="text-xl font-extrabold tracking-tight ns-text-gradient-brand">
                  NexStep
                </div>
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--ns-text-faint)' }}
                >
                  Career Guidance Platform
                </div>
              </div>
            </div>

            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: 'var(--ns-danger-bg)',
                border: '1px solid rgb(220 38 38 / 0.2)',
                color: 'var(--ns-danger)',
              }}
            >
              <AlertTriangle className="h-8 w-8" strokeWidth={2} />
            </div>

            <h1
              className="mb-2 text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--ns-text)' }}
            >
              Something went wrong
            </h1>

            <p
              className="mb-6 text-sm leading-relaxed max-w-sm"
              style={{ color: 'var(--ns-text-muted)' }}
            >
              We hit an unexpected issue while loading this part of NexStep.
              Your data is safe — this is usually a temporary glitch. Try
              refreshing the page or head back to your dashboard.
            </p>

            <div className="mb-6 flex w-full flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRefresh}
                className="ns-btn ns-btn-primary ns-btn-lg"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh page
              </button>
              <button
                type="button"
                onClick={this.handleGoToDashboard}
                className="ns-btn ns-btn-secondary ns-btn-lg"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>

            <div className="w-full">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="ns-btn ns-btn-ghost w-full justify-between"
                aria-expanded={showDetails}
                aria-controls="error-details"
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--ns-text-subtle)' }}
                >
                  Technical details
                </span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" style={{ color: 'var(--ns-text-subtle)' }} />
                ) : (
                  <ChevronDown className="h-4 w-4" style={{ color: 'var(--ns-text-subtle)' }} />
                )}
              </button>

              {showDetails && (
                <div
                  id="error-details"
                  className="mt-3 rounded-xl overflow-hidden text-left"
                  style={{
                    background: 'var(--ns-surface-2)',
                    border: '1px solid var(--ns-border)',
                  }}
                >
                  <div
                    className="px-4 py-2 border-b"
                    style={{
                      borderColor: 'var(--ns-border)',
                      background: 'var(--ns-surface-3)',
                    }}
                  >
                    <div
                      className="font-mono text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--ns-text-subtle)' }}
                    >
                      {error?.name || 'Error'}
                      {error?.message && (
                        <span className="normal-case font-medium ml-1">
                          — {error.message}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="px-4 py-3 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto"
                    style={{
                      color: 'var(--ns-text-muted)',
                    }}
                  >
                    <div className="mb-3">
                      <div
                        className="text-[11px] font-bold uppercase tracking-wider mb-1"
                        style={{ color: 'var(--ns-text-faint)' }}
                      >
                        Error stack
                      </div>
                      <pre className="whitespace-pre-wrap m-0">
                        {error?.stack || String(error)}
                      </pre>
                    </div>
                    {errorInfo?.componentStack && (
                      <div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-1"
                          style={{ color: 'var(--ns-text-faint)' }}
                        >
                          Component stack
                        </div>
                        <pre className="whitespace-pre-wrap m-0">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className="mt-6 pt-5 w-full border-t flex items-center justify-between"
              style={{ borderColor: 'var(--ns-border-soft)' }}
            >
              <div
                className="text-[11px]"
                style={{ color: 'var(--ns-text-faint)' }}
              >
                If this keeps happening, please contact support.
              </div>
              <div className="ns-badge ns-badge-danger">
                Runtime Error
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
