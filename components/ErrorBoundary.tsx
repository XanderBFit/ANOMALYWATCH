import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-black/60 border border-red-500/30 text-white space-y-3">
          <div className="flex items-center gap-3 text-red-400 font-mono text-xs font-bold uppercase">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            <span>{this.props.fallbackTitle || 'TELEMETRY FEED ISOLATED'}</span>
          </div>
          <p className="text-xs font-mono text-slate-400">
            {this.state.error?.message || 'An unexpected anomaly interrupted this module feed.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            RE-ESTABLISH FEED
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
