import { describe, test, expect } from "bun:test";
import { sanitizeInput, getCacheKey } from "../src/app/api/teach/route";
import { generateId, cn } from "../src/lib/utils";
describe("API Security & Caching", () => {
    test("sanitizeInput removes scripts and limits length", () => {
        const malicious = '<script>alert("xss")</script><b>Hello</b> World';
        const result = sanitizeInput(malicious);
        expect(result).not.toContain("<script>");
        expect(result).not.toContain("<b>");
        expect(result).toBe("Hello World");
    });

    test("sanitizeInput limits length to 2000 chars", () => {
        const longInput = "a".repeat(3000);
        const result = sanitizeInput(longInput);
        expect(result.length).toBe(2000);
    });

    test("getCacheKey normalizes input", () => {
        const key1 = getCacheKey("Hello World", "5");
        const key2 = getCacheKey("  hello world  ", "5");
        expect(key1).toBe(key2);
    });
});

describe("Utility Functions", () => {
    test("generateId creates unique IDs", () => {
        const id1 = generateId();
        const id2 = generateId();
        expect(id1).not.toBe(id2);
        expect(typeof id1).toBe("string");
        expect(id1.length).toBeGreaterThan(0);
    });

    test("cn utility joins classes and filters falsy values", () => {
        expect(cn("class1", "class2")).toBe("class1 class2");
        expect(cn("class1", "", "class2")).toBe("class1 class2");
    });
});