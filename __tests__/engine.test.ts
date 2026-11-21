import { describe, expect, test } from "bun:test";
import { readServiceConfig } from "../src/lib/config";
import { engineChat } from "../src/lib/engine";

describe("free engine", () => {
    test("config needs both ENGINE_URL (https) and ENGINE_SECRET", () => {
        expect(readServiceConfig({ ENGINE_URL: "https://e.example.dev/", ENGINE_SECRET: "s" }).engine).toEqual({
            url: "https://e.example.dev",
            secret: "s",
        });
        expect(readServiceConfig({ ENGINE_URL: "https://e.example.dev" }).engine).toBeNull();
        expect(readServiceConfig({ ENGINE_URL: "http://e.example.dev", ENGINE_SECRET: "s" }).problems[0]).toContain("ENGINE_URL");
    });

    test("posts system and messages with the bearer secret, and throws on errors", async () => {
        const calls: [string, RequestInit][] = [];
        const ok = (async (url: string, init: RequestInit) => {
            calls.push([url, init]);
            return new Response(JSON.stringify({ text: "১২" }));
        }) as unknown as typeof fetch;
        const engine = { url: "https://e.example.dev", secret: "s" };
        expect(await engineChat(engine, "sys", [{ role: "user", content: "৭ + ৫?" }], ok)).toBe("১২");
        const [url, init] = calls[0]!;
        expect(url).toBe("https://e.example.dev/chat");
        expect((init.headers as Record<string, string>).authorization).toBe("Bearer s");
        expect(JSON.parse(String(init.body)).messages[0].content).toBe("৭ + ৫?");

        const down = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
        await expect(engineChat(engine, "sys", [{ role: "user", content: "x?" }], down)).rejects.toThrow("503");
    });
});
