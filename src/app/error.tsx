"use client";

import { useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { TriangleAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <div className="status-shell">
      <Card className="status-card">
        <CardBody>
          <div className="status-icon">
            <TriangleAlert className="icon-lg" />
          </div>
          <h2 className="status-title">Something went wrong!</h2>
          <p className="status-text">
            The AI assistant encountered an unexpected error. This might be due
            to a model loading issue or memory constraints.
          </p>
          <div className="status-actions">
            <Button color="primary" onPress={reset}>
              Try again
            </Button>
            <Button variant="flat" onPress={() => window.location.reload()}>
              Refresh page
            </Button>
          </div>
          <p className="status-footnote">
            If this problem persists, try using a different AI model or refresh
            your browser.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
