import { describe, expect, spyOn, test } from "bun:test";
import { errorText } from "../src/lib/chat-errors";
import { configStatus, createOptional, isRestUrl, readServiceConfig } from "../src/lib/config";
import { createRateLimiter } from "../src/lib/rate-limit";

describe("service config", () => {
    test("no env vars means no chat provider and no retrieval", () => {
        const config = readServiceConfig({});
        expect(config).toEqual({ openrouterKey: null, hfKey: null, groqKey: null, vector: null, problems: [] });
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

    test("textbook retrieval needs the full vector pair and the Hugging Face key", () => {
        const vectorOnly = readServiceConfig({
            UPSTASH_VECTOR_REST_URL: "https://v",
            UPSTASH_VECTOR_REST_TOKEN: "t",
        });
        expect(configStatus(vectorOnly).textbookRetrieval).toBe(false);

        const halfPair = readServiceConfig({ UPSTASH_VECTOR_REST_URL: "https://v", HF_API_KEY: "hf" });
        expect(halfPair.vector).toBeNull();

        const full = readServiceConfig({
            UPSTASH_VECTOR_REST_URL: "https://v",
            UPSTASH_VECTOR_REST_TOKEN: "t",
            HF_API_KEY: "hf",
        });
        expect(configStatus(full)).toEqual({ ok: true, chatProviders: 1, textbookRetrieval: true });
    });

    test("a vector URL that is not an https REST URL disables retrieval and names the variable", () => {
        // The Upstash Vector client accepts these without throwing, and
        // Node's fetch error then quotes the value on every question.
        const bad = [
            "ABUFakeVectorToken0123456789abcdefXYZ=", // URL and token swapped
            "redis://default:S3cretPass@eu1-x.upstash.io:6379",
            "https://default:S3cretPass@eu1-x-vector.upstash.io",
            "http://eu1-x-vector.upstash.io",
            "not a url",
        ];
        for (const url of bad) {
            const config = readServiceConfig({
                UPSTASH_VECTOR_REST_URL: url,
                UPSTASH_VECTOR_REST_TOKEN: "https://eu1-x-vector.upstash.io",
                HF_API_KEY: "hf",
            });
            expect(config.vector).toBeNull();
            expect(configStatus(config).textbookRetrieval).toBe(false);
            expect(config.problems).toHaveLength(1);
            expect(config.problems[0]).toContain("UPSTASH_VECTOR_REST_URL");
            expect(config.problems[0]).not.toContain(url);
            expect(config.problems[0]).not.toContain("S3cretPass");
        }
    });

    test("an https vector URL without credentials is accepted", () => {
        expect(isRestUrl("https://eu1-x-vector.upstash.io")).toBe(true);
        expect(isRestUrl("https://eu1-x-vector.upstash.io/")).toBe(true);
        expect(isRestUrl("")).toBe(false);
        const config = readServiceConfig({
            UPSTASH_VECTOR_REST_URL: " https://eu1-x-vector.upstash.io\n",
            UPSTASH_VECTOR_REST_TOKEN: "t",
        });
        expect(config.vector).toEqual({ url: "https://eu1-x-vector.upstash.io", token: "t" });
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
    test("a non-https Redis URL falls back to the in-memory limit instead of throwing", async () => {
        const log = spyOn(console, "error").mockImplementation(() => {});
        const limiter = createRateLimiter({
            KV_REST_API_URL: "rediss://default:token@example.upstash.io:6379",
            KV_REST_API_TOKEN: "t",
        });
        expect(limiter.backend).toBe("memory");
        expect(await limiter.allow("k")).toBe(true);
        expect(String(log.mock.calls[0]?.[0])).not.toContain("token@");
        log.mockRestore();
    });

    test("no Redis credentials means the in-memory limit", () => {
        expect(createRateLimiter({}).backend).toBe("memory");
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
