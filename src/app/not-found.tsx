"use client";

import Link from "next/link";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="status-shell">
      <Card className="status-card">
        <CardBody>
          <div className="status-icon">
            <SearchX className="icon-lg" />
          </div>
          <h2 className="status-title">Page Not Found</h2>
          <p className="status-text">
            The page you're looking for doesn't exist. Let's get you back to
            chatting with our AI assistant!
          </p>
          <div className="status-actions">
            <Button as={Link} href="/" color="primary">
              Go to AI Chat
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
