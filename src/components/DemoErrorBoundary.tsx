import React, { ErrorInfo } from 'react';
import { DEMO_MODE } from '../config/demoMode';

interface State {
  hasError: boolean;
}

export class DemoErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DemoErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError && DEMO_MODE) {
      return null;
    }
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
