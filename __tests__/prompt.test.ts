import { describe, expect, test } from "bun:test";
import { sourceLabel, formatContext } from "../src/lib/retrieval";
import { buildSystemPrompt, getCacheKey, PROMPT_VERSION, stripEmoji } from "../src/lib/teach";

describe("buildSystemPrompt", () => {
  test("answers in the student's medium", () => {
    expect(buildSystemPrompt(1, "english", "")).toContain("Write in English");
    expect(buildSystemPrompt(1, "bengali", "")).toContain("Write in Bengali");
  });

  test("Bangla answers use তুমি consistently", () => {
    expect(buildSystemPrompt(1, "bengali", "")).toContain("তুমি (never আপনি)");
    expect(buildSystemPrompt(1, "english", "")).not.toContain("তুমি");
  });

  test("keeps young grades short and free of LaTeX", () => {
    const prompt = buildSystemPrompt(1, "english", "");
    expect(prompt).toContain("Do not use LaTeX");
    expect(prompt).not.toContain("$F = ma$");
  });

  test("allows formulas for older grades", () => {
    expect(buildSystemPrompt(9, "english", "")).toContain("Use LaTeX");
  });

  test("includes the passages, or says none were found", () => {
    expect(buildSystemPrompt(1, "english", "[Source: Class 1 Math, page 12]: 2 + 3 = 5")).toContain("page 12]: 2 + 3 = 5");
    expect(buildSystemPrompt(1, "english", "  ")).toContain("(none found)");
  });
});

describe("greetings and cache", () => {
  test("a greeting gets a short reply, not a lesson", () => {
    expect(buildSystemPrompt(1, "english", "")).toContain("Do not teach a lesson, cite a page or give a practice task for a greeting");
  });

  test("cache keys change with the prompt version", () => {
    expect(getCacheKey("hi", 1, "english").startsWith(`v${PROMPT_VERSION}:`)).toBe(true);
  });
});

describe("tutor voice", () => {
  test("the prompt forbids emoji", () => {
    expect(buildSystemPrompt(1, "english", "")).toContain("Never use emoji");
  });

  test("stripEmoji removes emoji and the space after them", () => {
    expect(stripEmoji("Hello \u{1F44B} world")).toBe("Hello world");
    expect(stripEmoji("\u{1F34C}\u{1F34C}\u{1F34C} three bananas")).toBe("three bananas");
    expect(stripEmoji("\u2705 Done")).toBe("Done");
    expect(stripEmoji("ok\uFE0F")).toBe("ok");
  });

  test("stripEmoji keeps digits, math and Bangla (including ZWJ conjuncts)", () => {
    expect(stripEmoji("3 + 4 = 7")).toBe("3 + 4 = 7");
    expect(stripEmoji("৩ আর ৪ যোগ করলে ৭")).toBe("৩ আর ৪ যোগ করলে ৭");
    const conjunct = "র\u200D্য";
    expect(stripEmoji(conjunct)).toBe(conjunct);
  });
});

describe("sourceLabel", () => {
  test("drops file noise from book names", () => {
    expect(sourceLabel("Class 1 Math_compressed.pdf, page 12")).toBe("Class 1 Math, page 12");
    expect(sourceLabel("class 1 math_compressed (1).pdf, page 3")).toBe("class 1 math, page 3");
    expect(sourceLabel("selftest")).toBe("selftest");
  });

  test("formatContext uses the clean label", () => {
    expect(formatContext([{ source: "Class 1 Bangla_compressed.pdf, page 4", text: "অ আ" }])).toBe(
      "[Source: Class 1 Bangla, page 4]: অ আ",
    );
  });
});
