// GET /api/health: whether this deployment has what the tutor needs.
// Reports counts and booleans only, never a key, URL or provider name.
// GET handlers are dynamic by default, so env vars are read per request.
import { NextResponse } from "next/server";
import { configStatus, readServiceConfig } from "@/lib/config";

export function GET() {
    const status = configStatus(readServiceConfig());
    return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
