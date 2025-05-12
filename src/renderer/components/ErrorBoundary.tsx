import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      // Use the provided fallback component if available
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error!, this.resetError);
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">{error?.message || 'An unknown error occurred'}</p>
          <pre className="max-h-32 overflow-auto text-xs text-red-500 bg-red-50 p-2 border border-red-100 rounded mb-4">
            {error?.stack || 'No stack trace available'}
          </pre>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

/**
 * A simplified version with default behavior for when you just need basic error handling
 */
export const SimpleErrorBoundary: React.FC<{children: ReactNode}> = ({ children }) => {
  return (
    <ErrorBoundary 
      fallback={(error, reset) => (
        <div className="p-4 bg-red-50 border-l-4 border-red-600 text-red-700">
          <p className="font-bold">Error: {error.message}</p>
          <button 
            onClick={reset}
            className="mt-2 px-4 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;