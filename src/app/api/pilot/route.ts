// POST /api/pilot: a coaching centre asks for a pilot from the Bongo landing
// page (another origin, hence CORS). Saved to shikhbo.pilot_requests.
//   { "name", "centre", "phone", "city"?, "students"? } -> { "ok": true }
import { NextResponse } from "next/server";
import { PilotRequestSchema } from "@/lib/centre";
import { readServiceConfig } from "@/lib/config";
import { createRateLimiter } from "@/lib/rate-limit";
import { createStore } from "@/lib/store";
import { errorSummary, getClientIp, hashKey } from "@/lib/teach";

const config = readServiceConfig();
const store = config.store ? createStore(config.store) : null;
const rateLimiter = createRateLimiter(store);

const CORS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST",
    "access-control-allow-headers": "content-type",
};

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });

export function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
    try {
        if (!(await rateLimiter.allow(hashKey(`pilot:${getClientIp(req.headers)}`)))) {
            return reply({ error: "Too many requests. Please try again later.", code: "rate_limited" }, 429);
        }
        if (!store) return reply({ error: "Not set up on this server.", code: "not_configured" }, 503);
        const parsed = PilotRequestSchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) return reply({ error: "Invalid input", code: "invalid_input" }, 400);
        const { website: _honeypot, ...request } = parsed.data;
        await store.pilotRequest(request);
        return reply({ ok: true });
    } catch (error) {
        console.error(`[pilot] ${errorSummary(error)}`);
        return reply({ error: "Could not save the request. Please try again.", code: "store_error" }, 500);
    }
}
