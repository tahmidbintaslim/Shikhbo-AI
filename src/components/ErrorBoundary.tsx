"use client";
import React from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";

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
        <div className="status-shell">
          <Card className="status-card">
            <CardHeader>
              <h2 className="status-title">Oops! Something went wrong</h2>
            </CardHeader>
            <CardBody>
              <p className="status-text">
                We're sorry, but an error occurred. Please try refreshing the
                page.
              </p>
            </CardBody>
            <CardFooter className="status-actions">
              <Button color="primary" onPress={() => window.location.reload()}>
                Refresh Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
