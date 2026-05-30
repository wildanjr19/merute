import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center h-full bg-surface">
          <div className="text-center p-md glass-panel-strong rounded-xl shadow-float-lg max-w-md">
            <h2 className="text-headline-md text-error mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-body-md text-on-surface-variant mb-md">
              {this.state.error?.message || 'Aplikasi mengalami error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary/90 font-semibold transition-all shadow-sm"
            >
              Reload Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
