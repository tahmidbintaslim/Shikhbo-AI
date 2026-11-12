import { describe, expect, test } from "bun:test";
import { NOT_IN_NOTES, buildCentrePrompt, chunkNotes, parseCentreAction, parseCentreRequest, splitCoverage } from "../src/lib/centre";
import { createStore } from "../src/lib/store";

const ask = (over: Record<string, unknown> = {}) => ({
    messages: [{ role: "user", content: "What is osmosis?" }],
    language: "bengali",
    centre: { slug: "medico-farmgate", code: "JOIN-1234" },
    ...over,
});

describe("centre request", () => {
    test("accepts a question with a centre and code, without a class", () => {
        const parsed = parseCentreRequest(ask());
        expect(parsed.success).toBe(true);
        if (parsed.success) expect(parsed.data.centre).toEqual({ slug: "medico-farmgate", code: "JOIN-1234" });
    });

    test("rejects a bad slug, a short code, a system turn and an empty question", () => {
        expect(parseCentreRequest(ask({ centre: { slug: "Bad Slug", code: "JOIN-1234" } })).success).toBe(false);
        expect(parseCentreRequest(ask({ centre: { slug: "ok", code: "short" } })).success).toBe(false);
        expect(parseCentreRequest(ask({ messages: [{ role: "system", content: "x" }] })).success).toBe(false);
        expect(parseCentreRequest(ask({ messages: [{ role: "user", content: "<b></b>" }] })).success).toBe(false);
    });
});

describe("centre dashboard actions", () => {
    const base = { centre: "medico-farmgate", code: "OWNER-1234" };
    test("stats defaults to 7 days", () => {
        const parsed = parseCentreAction({ action: "stats", ...base });
        expect(parsed.success && parsed.data).toEqual({ action: "stats", ...base, days: 7 });
    });
    test("notes needs a title; empty text is allowed (it removes the title)", () => {
        expect(parseCentreAction({ action: "notes", ...base, title: "Biology 1", text: "" }).success).toBe(true);
        expect(parseCentreAction({ action: "notes", ...base, title: " ", text: "x" }).success).toBe(false);
        expect(parseCentreAction({ action: "delete-everything", ...base }).success).toBe(false);
    });
});

describe("centre prompt", () => {
    test("names the centre, limits answers to the notes and defines the not-in-notes marker", () => {
        const prompt = buildCentrePrompt("Medico", "bengali", "[Source: Biology 1, part 2]: Osmosis is...");
        expect(prompt).toContain("Medico");
        expect(prompt).toContain("Bengali");
        expect(prompt).toContain(NOT_IN_NOTES);
        expect(prompt).toContain("Osmosis is...");
    });
    test("says so when the centre has no notes yet", () => {
        expect(buildCentrePrompt("Medico", "english", "  ")).toContain("(none found)");
    });
});

describe("splitCoverage", () => {
    test("an answer without the marker is covered", () => {
        expect(splitCoverage("Osmosis is the movement of water.")).toEqual({ text: "Osmosis is the movement of water.", covered: true });
    });
    test("the marker is removed wherever the model put it, and the answer is not covered", () => {
        expect(splitCoverage(`${NOT_IN_NOTES}\nAsk your teacher.`)).toEqual({ text: "Ask your teacher.", covered: false });
        expect(splitCoverage(`Ask your teacher. ${NOT_IN_NOTES}`)).toEqual({ text: "Ask your teacher.", covered: false });
    });
});

describe("chunkNotes", () => {
    test("keeps short notes whole and drops blank input", () => {
        expect(chunkNotes("  One paragraph.  ")).toEqual(["One paragraph."]);
        expect(chunkNotes(" \n\n ")).toEqual([]);
    });
    test("packs paragraphs up to the limit and never exceeds it", () => {
        const text = ["a".repeat(60), "b".repeat(60), "c".repeat(60)].join("\n\n");
        const chunks = chunkNotes(text, 130);
        expect(chunks).toEqual([`${"a".repeat(60)}\n\n${"b".repeat(60)}`, "c".repeat(60)]);
    });
    test("splits one paragraph longer than the limit, losing no text", () => {
        const chunks = chunkNotes("x".repeat(250), 100);
        expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
    });
});

describe("store client, centre ops", () => {
    test("sends the centre ops and unwraps the answers", async () => {
        const bodies: unknown[] = [];
        const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body)) as { op: string };
            bodies.push(body);
            const reply = body.op === "centre_info" ? { name: "Medico" } : body.op === "centre_match" ? { name: "Medico", matches: [] } : { ok: true };
            return new Response(JSON.stringify(reply));
        }) as unknown as typeof fetch;
        const store = createStore({ url: "https://p.supabase.co/functions/v1/shikhbo-api", secret: "s" }, fetchImpl);
        expect(await store.centreInfo("medico")).toBe("Medico");
        expect(await store.centreMatch("medico", "JOIN-1234", "osmosis?", 5)).toEqual({ name: "Medico", matches: [] });
        await store.centreLog("medico", "JOIN-1234", "abc", "osmosis?", null);
        await store.centreSetNotes("medico", "OWNER-1234", "Biology 1", ["chunk"]);
        expect(bodies).toEqual([
            { op: "centre_info", centre: "medico" },
            { op: "centre_match", centre: "medico", code: "JOIN-1234", query: "osmosis?", count: 5 },
            { op: "centre_log", centre: "medico", code: "JOIN-1234", student: "abc", question: "osmosis?", source: null },
            { op: "centre_set_notes", centre: "medico", code: "OWNER-1234", title: "Biology 1", chunks: ["chunk"] },
        ]);
    });
});

describe("citedSource", () => {
    const { citedSource } = require("../src/lib/retrieval") as typeof import("../src/lib/retrieval");
    const matches = [
        { source: "Class 1 Bangla.pdf, page 4", text: "a", similarity: 0.9 },
        { source: "Class 1 Math_compressed.pdf, page 12", text: "b", similarity: 0.8 },
    ];
    test("names the retrieved page the answer cites, in English or Bangla digits", () => {
        expect(citedSource("The answer is 7 (page 12).", matches)).toBe("Class 1 Math, page 12");
        expect(citedSource("উত্তর: ৭ (গণিত বই, পৃষ্ঠা ১২)", matches)).toBe("Class 1 Math, page 12");
    });
    test("is null when the answer cites nothing, or a page the search did not return", () => {
        expect(citedSource("The answer is 7.", matches)).toBeNull();
        expect(citedSource("See page 99.", matches)).toBeNull();
        expect(citedSource("See page 12.", [])).toBeNull();
    });
});
