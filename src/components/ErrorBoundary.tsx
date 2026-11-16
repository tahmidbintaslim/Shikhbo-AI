"use client";
import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="shell shell-narrow py-24">
          <h1>কিছু একটা ভুল হয়েছে।</h1>
          <p className="muted mt-4">Something went wrong. Please refresh the page.</p>
          <button type="button" className="btn btn-primary mt-8" onClick={() => window.location.reload()}>
            পাতাটি আবার খোলো
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
