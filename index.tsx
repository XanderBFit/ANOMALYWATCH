
import React, { ReactNode, ErrorInfo, Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// [CANVAS_FAILSAFE]: Protect against IndexSizeError when getImageData is executed on 0-width or 0-height canvas contexts (e.g., during Leaflet heat map container resizes).
if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined') {
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function(sx: number, sy: number, sw: number, sh: number, settings?: any) {
    if (sw <= 0 || sh <= 0 || !isFinite(sw) || !isFinite(sh)) {
      const safeW = Math.max(1, Math.floor(Math.abs(sw) || 1));
      const safeH = Math.max(1, Math.floor(Math.abs(sh) || 1));
      try {
        return originalGetImageData.call(this, sx, sy, safeW, safeH, settings);
      } catch {
        return this.createImageData(safeW, safeH);
      }
    }
    try {
      return originalGetImageData.call(this, sx, sy, sw, sh, settings);
    } catch (err: any) {
      if (err instanceof DOMException && (err.name === 'IndexSizeError' || err.code === 1)) {
        const safeW = Math.max(1, Math.floor(Math.abs(sw) || 1));
        const safeH = Math.max(1, Math.floor(Math.abs(sh) || 1));
        return this.createImageData(safeW, safeH);
      }
      throw err;
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// [PWA_REGISTRATION]: Register service worker for offline tactical capability.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

// [FIX]: Extending 'Component' from 'react' explicitly with generic parameters to ensure 'state', 'setState', and 'props' are correctly recognized by the TypeScript compiler.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // [FIX]: Explicitly declaring the state property to satisfy the compiler's visibility checks.
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    // [FIX]: Initializing state correctly within the constructor.
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: any): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("CRITICAL UI ERROR:", error, errorInfo);
    // [FIX]: Using the inherited setState method from the Component base class to update component state.
    this.setState({ errorInfo });
  }

  render() {
    // [FIX]: Accessing the 'state' property inherited from the Component base class.
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-black text-white p-10 font-mono">
          <div className="border border-red-500 p-8 rounded bg-red-900/10 max-w-2xl w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
            <h1 className="text-xl text-red-500 font-bold mb-4 font-display tracking-widest uppercase">CRITICAL SYSTEM FAILURE</h1>
            <p className="mb-4 text-sm text-slate-300 italic">The interface encountered an unrecoverable rendering exception.</p>
            <div className="space-y-4">
              <pre className="text-[10px] text-red-400 bg-black/50 p-4 rounded overflow-auto border border-red-900/50 max-h-40 custom-scrollbar">
                {/* [FIX]: Accessing the error object from state. */}
                {this.state.error?.toString()}
              </pre>
              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 px-6 py-3 bg-red-900/40 border border-red-500/50 text-white rounded text-xs tracking-[0.2em] uppercase font-bold transition-all hover:bg-red-500 hover:text-black"
                >
                  Attempt Reboot
                </button>
                <button 
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="flex-1 px-6 py-3 bg-white/5 border border-white/20 text-slate-400 rounded text-xs tracking-[0.2em] uppercase transition-all hover:text-white hover:border-white"
                >
                  Factory Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // [FIX]: Accessing the 'props' property inherited from the Component base class to render children.
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
