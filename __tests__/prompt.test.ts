import { describe, expect, test } from "bun:test";
import { sourceLabel, formatContext } from "../src/lib/retrieval";
import { buildSystemPrompt } from "../src/lib/teach";

describe("buildSystemPrompt", () => {
  test("answers in the student's medium", () => {
    expect(buildSystemPrompt(1, "english", "")).toContain("Write in English");
    expect(buildSystemPrompt(1, "bengali", "")).toContain("Write in Bengali");
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
