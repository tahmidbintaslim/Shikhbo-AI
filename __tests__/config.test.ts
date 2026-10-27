import { describe, expect, spyOn, test } from "bun:test";
import { errorText } from "../src/lib/chat-errors";
import { configStatus, createOptional, isRestUrl, readServiceConfig } from "../src/lib/config";
import { createRateLimiter } from "../src/lib/rate-limit";

describe("service config", () => {
    test("no env vars means no chat provider and no retrieval", () => {
        const config = readServiceConfig({});
        expect(config).toEqual({ openrouterKey: null, hfKey: null, groqKey: null, store: null, problems: [] });
        expect(configStatus(config)).toEqual({ ok: false, chatProviders: 0, textbookRetrieval: false });
    });

    test("values are trimmed and blank values count as unset", () => {
        const config = readServiceConfig({
            OPENROUTER_API_KEY: "  sk-or-1\n",
            HF_API_KEY: "   ",
            GROQ_API_KEY: "",
        });
        expect(config.openrouterKey).toBe("sk-or-1");
        expect(config.hfKey).toBeNull();
        expect(config.groqKey).toBeNull();
        expect(configStatus(config)).toEqual({ ok: true, chatProviders: 1, textbookRetrieval: false });
    });

    test("textbook retrieval needs the full store pair", () => {
        const urlOnly = readServiceConfig({ SHIKHBO_STORE_URL: "https://p.supabase.co/functions/v1/shikhbo-api" });
        expect(urlOnly.store).toBeNull();
        expect(configStatus(urlOnly).textbookRetrieval).toBe(false);
        expect(urlOnly.problems.join(" ")).toContain("SHIKHBO_STORE_SECRET is not set");

        const secretOnly = readServiceConfig({ SHIKHBO_STORE_SECRET: "zz-secret-value" });
        expect(secretOnly.store).toBeNull();
        expect(secretOnly.problems.join(" ")).toContain("SHIKHBO_STORE_URL is not set");
        expect(secretOnly.problems.join(" ")).not.toContain("zz-secret-value");
        expect(readServiceConfig({}).problems).toEqual([]);

        const full = readServiceConfig({
            SHIKHBO_STORE_URL: "https://p.supabase.co/functions/v1/shikhbo-api",
            SHIKHBO_STORE_SECRET: "s",
            GROQ_API_KEY: "g",
        });
        expect(configStatus(full)).toEqual({ ok: true, chatProviders: 1, textbookRetrieval: true });
    });

    test("a store URL that is not an https URL disables the store and names the variable", () => {
        const bad = [
            "0123456789abcdef0123456789abcdef", // URL and secret swapped
            "https://user:S3cretPass@p.supabase.co/functions/v1/shikhbo-api",
            "http://p.supabase.co/functions/v1/shikhbo-api",
            "not a url",
        ];
        for (const url of bad) {
            const config = readServiceConfig({ SHIKHBO_STORE_URL: url, SHIKHBO_STORE_SECRET: "https://p.supabase.co" });
            expect(config.store).toBeNull();
            expect(configStatus(config).textbookRetrieval).toBe(false);
            expect(config.problems).toHaveLength(1);
            expect(config.problems[0]).toContain("SHIKHBO_STORE_URL");
            expect(config.problems[0]).not.toContain(url);
            expect(config.problems[0]).not.toContain("S3cretPass");
        }
    });

    test("an https store URL without credentials is accepted and trimmed", () => {
        expect(isRestUrl("https://p.supabase.co/functions/v1/shikhbo-api")).toBe(true);
        expect(isRestUrl("")).toBe(false);
        const config = readServiceConfig({
            SHIKHBO_STORE_URL: " https://p.supabase.co/functions/v1/shikhbo-api\n",
            SHIKHBO_STORE_SECRET: " s ",
        });
        expect(config.store).toEqual({ url: "https://p.supabase.co/functions/v1/shikhbo-api", secret: "s" });
        expect(config.problems).toEqual([]);
    });

    test("createOptional returns null and logs the setting name, not the value", () => {
        const log = spyOn(console, "error").mockImplementation(() => {});
        const client = createOptional("cache", "SOME_URL", () => {
            throw new TypeError("bad value: super-secret-token");
        });
        expect(client).toBeNull();
        const line = String(log.mock.calls[0]?.[0]);
        expect(line).toContain("SOME_URL");
        expect(line).not.toContain("super-secret-token");
        log.mockRestore();
    });
});

describe("rate limiter setup", () => {
    test("no store means the in-memory limit", () => {
        expect(createRateLimiter(null).backend).toBe("memory");
    });

    test("uses the store, and the in-memory limit when a store call fails", async () => {
        const warn = spyOn(console, "warn").mockImplementation(() => {});
        let fail = false;
        const store = {
            rateLimit: async () => {
                if (fail) throw new Error("HTTP 500");
                return false;
            },
        } as unknown as Parameters<typeof createRateLimiter>[0];
        const limiter = createRateLimiter(store);
        expect(limiter.backend).toBe("store");
        expect(await limiter.allow("k")).toBe(false);
        fail = true;
        expect(await limiter.allow("k")).toBe(true);
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });
});

describe("chat error text", () => {
    const strings = {
        apiError: "generic",
        rateLimited: "slow down",
        notConfigured: "not set up",
        providersUnavailable: "try later",
    };

    test("maps each server error code to its message", () => {
        expect(errorText(strings, 429, undefined)).toBe("slow down");
        expect(errorText(strings, 503, "not_configured")).toBe("not set up");
        expect(errorText(strings, 503, "providers_unavailable")).toBe("try later");
        expect(errorText(strings, 500, "internal_error")).toBe("generic");
        expect(errorText(strings, 502, undefined)).toBe("generic");
    });
});
