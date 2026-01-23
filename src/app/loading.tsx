"use client";

import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";

export default function Loading() {
  return (
    <div className="status-shell">
      <Card className="status-card">
        <CardBody>
          <div className="status-icon">
            <Spinner size="lg" color="primary" />
          </div>
          <h2 className="status-title">Loading AI Assistant</h2>
          <p className="status-text">
            Preparing your privacy-first AI chat experience...
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
