import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary, { SimpleErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing purposes
const ErrorThrowingComponent = () => {
  throw new Error('Test error');
  return <div>This will not render</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console errors during tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
  });
  
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Test Child</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
  
  it('renders fallback UI when an error is thrown', () => {
    // We need to hide the React error boundary warning in the console
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    // Check that the error message is displayed
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    // Use querySelector instead of getByText to find the specific error message
    const errorElement = document.querySelector('.text-red-600.mb-4');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement?.textContent).toMatch(/test error/i);
    
    // Check that the retry button is present
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    
    spy.mockRestore();
  });
  
  it('uses custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Fallback</div>;
    
    // We need to hide the React error boundary warning in the console
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    
    spy.mockRestore();
  });
  
  it('calls custom function fallback with error when provided', () => {
    // We need to hide the React error boundary warning in the console
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    const customFallback = vi.fn().mockImplementation((error, reset) => (
      <div data-testid="function-fallback">
        Function Fallback: {error.message}
        <button onClick={reset}>Reset</button>
      </div>
    ));
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );
    
    expect(customFallback).toHaveBeenCalled();
    expect(screen.getByTestId('function-fallback')).toBeInTheDocument();
    expect(screen.getByText(/function fallback: test error/i)).toBeInTheDocument();
    
    spy.mockRestore();
  });
});

describe('SimpleErrorBoundary', () => {
  // Suppress console errors during tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
  });
  
  it('renders children when no error is thrown', () => {
    render(
      <SimpleErrorBoundary>
        <div data-testid="child">Test Child</div>
      </SimpleErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
  
  it('renders simplified error UI when an error is thrown', () => {
    // We need to hide the React error boundary warning in the console
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});
    
    render(
      <SimpleErrorBoundary>
        <ErrorThrowingComponent />
      </SimpleErrorBoundary>
    );
    
    // Check that the error message is displayed
    expect(screen.getByText(/error: test error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    
    spy.mockRestore();
  });
});