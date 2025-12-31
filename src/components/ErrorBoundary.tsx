import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<unknown>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // You could send this to an external monitoring service here
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
            <p className="text-sm text-muted-foreground">This window failed to load — try reopening it or refresh the app.</p>
            <div className="mt-4">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-3 py-1 rounded bg-primary text-primary-foreground"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
