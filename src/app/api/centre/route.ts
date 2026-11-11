// POST /api/centre: what a coaching centre's owner dashboard does. Every
// action carries the centre's owner code, which the store checks.
//   { "action": "stats", "centre", "code", "days"?: 1-90 } -> CentreStats (src/lib/store.ts)
//   { "action": "notes", "centre", "code", "title", "text" } -> { "ok": true, "parts": n }
//     Replaces the notes saved under that title; empty text removes them.
import { NextResponse } from "next/server";
import { MAX_NOTE_CHUNKS, chunkNotes, parseCentreAction } from "@/lib/centre";
import { readServiceConfig } from "@/lib/config";
import { createRateLimiter } from "@/lib/rate-limit";
import { StoreError, createStore } from "@/lib/store";
import { errorSummary, getClientIp, hashKey } from "@/lib/teach";
import { MAX_BODY_CHARS } from "@/lib/teach-limits";

const config = readServiceConfig();
const store = config.store ? createStore(config.store) : null;
const rateLimiter = createRateLimiter(store);

function errorResponse(status: number, code: string, error: string) {
    return NextResponse.json({ error, code }, { status });
}

export const maxDuration = 60; // A notes upload embeds every chunk.

export async function POST(req: Request) {
    try {
        // Its own counter, apart from the tutor's, and the guard against
        // guessing an owner code.
        if (!(await rateLimiter.allow(hashKey(`owner:${getClientIp(req.headers)}`)))) {
            return errorResponse(429, "rate_limited", "Rate limit exceeded. Please try again later.");
        }
        if (!store) {
            return errorResponse(503, "not_configured", "Centre dashboards are not set up on this server: the store is not configured.");
        }
        const raw = await req.text();
        if (raw.length > MAX_BODY_CHARS) {
            return errorResponse(413, "too_large", "Request too large");
        }
        let body: unknown;
        try {
            body = JSON.parse(raw);
        } catch {
            return errorResponse(400, "invalid_input", "Invalid input");
        }
        const parsed = parseCentreAction(body);
        if (!parsed.success) {
            return errorResponse(400, "invalid_input", "Invalid input");
        }
        const action = parsed.data;

        if (action.action === "stats") {
            return NextResponse.json(await store.centreStats(action.centre, action.code, action.days));
        }
        const chunks = chunkNotes(action.text);
        if (chunks.length > MAX_NOTE_CHUNKS) {
            return errorResponse(413, "too_large", "These notes are too long for one title. Split them into two titles.");
        }
        await store.centreSetNotes(action.centre, action.code, action.title, chunks);
        return NextResponse.json({ ok: true, parts: chunks.length });
    } catch (error) {
        if (error instanceof StoreError && error.status === 401) {
            return errorResponse(401, "wrong_code", "Wrong owner code");
        }
        console.error(`[centre] request failed: ${errorSummary(error)}`);
        return errorResponse(500, "internal_error", "Failed to process request");
    }
}
