import { describe, expect, it } from "vitest";
import { highlightCode, MAX_HIGHLIGHT_CHARS } from "./highlight";

const colors = { foreground: "#dddddd", foregroundMuted: "#aaaaaa", accent: "#9ab8ce", surface1: "#181818" };

describe("Shiki highlighting", () => {
  it("tokenizes shell commands without HTML or DOM APIs", async () => {
    const tokens = await highlightCode("$ bun run test\n170 pass", "bash", colors);
    const content = tokens?.flat().map((token) => token.content).join("");
    expect(content).toContain("bun");
    expect(content).toContain("170 pass");
    expect(tokens?.flat().some((token) => token.color)).toBe(true);
  });

  it("tokenizes arbitrary JSON payloads", async () => {
    const tokens = await highlightCode(
      '{\n  "content": [{"type": "text"}]\n}',
      "json",
      colors,
    );
    const content = tokens?.flat().map((token) => token.content).join("");
    expect(content).toContain('"content"');
    expect(content).toContain('"text"');
    expect(tokens?.flat().some((token) => token.color)).toBe(true);
  });

  it("returns a fallback signal for oversized output", async () => {
    await expect(highlightCode("x".repeat(MAX_HIGHLIGHT_CHARS + 1), "ansi", colors)).resolves.toBeNull();
  });

  it.each(["javascript", "js"])("keeps complete JS tokens and applies theme colors for %s", async language => {
    const code = '// comment\nconst result = await run("hello");\ntext(result);';
    const tokens = (await highlightCode(code, language, colors))!;
    expect(tokens.map(line => line.map(token => token.content).join("")).join("\n")).toBe(code);
    expect(tokens.flat().some(token => token.color?.toLowerCase() === colors.accent)).toBe(true);
  });

  it("uses the new host palette for the same code after a theme switch", async () => {
    const code = '{"message":"hello","count":12}';
    const light = { foreground: "#202020", foregroundMuted: "#606060", accent: "#345678", surface1: "#eeeeee" };
    const darkTokens = (await highlightCode(code, "json", colors))!.flat();
    const lightTokens = (await highlightCode(code, "json", light))!.flat();
    expect(lightTokens.map((token) => token.content).join("")).toBe(code);
    expect(darkTokens.some((token) => token.color?.toLowerCase() === colors.accent)).toBe(true);
    expect(lightTokens.some((token) => token.color?.toLowerCase() === light.accent)).toBe(true);
    const palette = new Set([light.foreground, light.foregroundMuted, light.accent]);
    expect(lightTokens.every((token) => !token.color || palette.has(token.color.toLowerCase()))).toBe(true);
  });
});
