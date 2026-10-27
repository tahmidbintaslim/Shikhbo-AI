import { describe, expect, test } from "bun:test";
import { StoreError, createStore } from "../src/lib/store";

interface Call {
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
}

function fakeFetch(reply: (call: Call) => Response) {
    const calls: Call[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const call = {
            url: String(input),
            headers: Object.fromEntries(new Headers(init?.headers).entries()),
            body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        };
        calls.push(call);
        return reply(call);
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const config = { url: "https://p.supabase.co/functions/v1/shikhbo-api", secret: "s3cret" };

describe("store client", () => {
    test("sends the op with the secret header and unwraps the answer", async () => {
        const { calls, fetchImpl } = fakeFetch(() =>
            json({ matches: [{ source: "a.pdf, page 1", text: "t", similarity: 0.9 }] }),
        );
        const store = createStore(config, fetchImpl);
        const matches = await store.match("2+3?", 1, "english", 5);
        expect(matches).toEqual([{ source: "a.pdf, page 1", text: "t", similarity: 0.9 }]);
        expect(calls[0]?.url).toBe(config.url);
        expect(calls[0]?.headers["x-shikhbo-secret"]).toBe("s3cret");
        expect(calls[0]?.body).toEqual({ op: "match", query: "2+3?", grade: 1, medium: "english", count: 5 });
    });

    test("maps cache and rate-limit answers", async () => {
        const { calls, fetchImpl } = fakeFetch((call) =>
            call.body.op === "cache_get" ? json({ response: null }) : call.body.op === "rate_limit" ? json({ allowed: false }) : json({ ok: true }),
        );
        const store = createStore(config, fetchImpl);
        expect(await store.cacheGet("k")).toBeNull();
        await store.cacheSet("k", "answer", 300);
        expect(await store.rateLimit("ip", 10, 60)).toBe(false);
        expect(calls.map((c) => c.body)).toEqual([
            { op: "cache_get", key: "k" },
            { op: "cache_set", key: "k", response: "answer", ttlSeconds: 300 },
            { op: "rate_limit", key: "ip", limit: 10, windowSeconds: 60 },
        ]);
    });

    test("throws a StoreError with the status on a non-2xx answer, never quoting the secret", async () => {
        const { fetchImpl } = fakeFetch(() => json({ error: "not allowed" }, 401));
        const error = await createStore(config, fetchImpl).cacheGet("k").catch((e: unknown) => e);
        expect(error).toBeInstanceOf(StoreError);
        expect((error as StoreError).status).toBe(401);
        expect((error as StoreError).message).not.toContain("s3cret");
    });
});
