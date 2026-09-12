import { describe, expect, it } from "vitest";
import { detailSections, MAX_DECODE_CHARS, PREVIEW_CHARS, PREVIEW_LINES, previewText, readableValue, renderReadable } from "./details";

describe("explicit readable transport views", () => {
  it.each(["exec", "functions.exec", "mcpScript", "tools.mcp_script", "evaluate_browser"])("renders %s source as JS without executing or rewriting it", name => {
    const code = '// comment\nconst n = 90071992547409931234n;\nthrow new Error("literal");';
    const input = { [name === "evaluate_browser" ? "expression" : "code"]: code, timeoutMs: 1000 };
    for (const value of [input, JSON.stringify(input)]) {
      const view = readableValue(value, name)!;
      expect(view).toMatchObject({ kind: "code", language: "javascript" });
      expect(renderReadable(view, true).text).toBe(code);
    }
    expect(readableValue(code, "exec")).toMatchObject({ kind: "code", code });
  });

  it("keeps all input fields and raw envelope metadata available behind the readable view", () => {
    const input = { code: "await run();", timeoutMs: 10 };
    const output = { content: [{ type: "text", text: "first\nsecond" }, { type: "text", text: '{"id":90071992547409931234,"a":1,"a":2}' }], details: { token: 0 }, isError: false };
    const sections = detailSections({ name: "exec", status: "completed", detail: { type: "unknown", input, output }, presentation: { icon: "Code", category: "unknown", label: "Exec" } });
    expect(sections[0]!.value).toBe(input);
    expect(sections[1]!.value).toBe(output);
    const view = sections[1]!.readable!;
    expect(view.note).toContain("metadata and attachments in Raw");
    expect(renderReadable(view).text).toContain('first\nsecond\n\n{\n  "id": 90071992547409931234,\n  "a": 1,\n  "a": 2\n}');
  });

  it("does not access base64, metadata or serialize a huge envelope for its default view", () => {
    const output = { content: [{ type: "text", text: "visible tree" }, { type: "image", mimeType: "image/png", get data() { throw new Error("Do not touch base64"); } }],
      get details() { throw new Error("Do not touch metadata"); }, toJSON() { throw new Error("No whole-envelope serialization"); } };
    expect(renderReadable(readableValue(output)!).text).toBe("visible tree\n\n[image · image/png · data in Raw]");
  });

  it("applies one twenty-line budget across many blocks without visiting the tail", () => {
    const blocks = Array.from({ length: 100_000 }, (_, i) => ({ type: "text", get text() {
      if (i > 10) throw new Error("Visited unneeded tail");
      return "block " + i;
    } }));
    const result = renderReadable(readableValue({ content: blocks })!);
    expect(result.truncated).toBe(true);
    expect(result.text.split("\n").length).toBeLessThanOrEqual(PREVIEW_LINES);
    expect(result.text.length).toBeLessThanOrEqual(PREVIEW_CHARS);
  });

  it("previews real newlines in a 100k-line tool result and retains full readable copying", () => {
    const text = Array.from({ length: 100_000 }, (_, i) => "UI node " + i).join("\n");
    const view = readableValue({ content: [{ type: "text", text }] })!;
    expect(renderReadable(view)).toEqual({ text: text.split("\n").slice(0, 20).join("\n"), truncated: true });
    expect(renderReadable(view, true)).toEqual({ text, truncated: false });
  });

  it("handles unknown, malformed and empty blocks visibly without dropping the raw container", () => {
    const value = { content: [{ type: "text", text: false }, { type: "resource", uri: "https://example.invalid/never-fetch" }, null] };
    expect(renderReadable(readableValue(value)!).text).toBe("[text · data in Raw]\n\n[resource · data in Raw]\n\n[Unknown block · data in Raw]");
    expect(renderReadable(readableValue({ content: [] })!)).toEqual({ text: "", truncated: false });
  });

  it.each([null, false, [], "", '{"content":', { text: "not a tool envelope" }, { content: "not an array" }, { content: [{ text: "untyped" }] }])("does not guess transport wrappers from arbitrary data %j", value => {
    expect(readableValue(value)).toBeUndefined();
  });

  it("does not decode arbitrary nested strings or foreign tools' code properties", () => {
    expect(readableValue({ code: "secret();" }, "vendor.exec")).toBeUndefined();
    expect(readableValue({ expression: "1 + 1" }, "exec")).toBeUndefined();
    const view = readableValue({ content: [{ type: "text", text: '{"text":"line1\\nline2"}' }] })!;
    expect(renderReadable(view).text).toContain('"line1\\nline2"');
  });

  it("bounds serialized envelope decoding and preserves original input for fallback", () => {
    const serialized = JSON.stringify({ content: [{ type: "text", text: "x".repeat(MAX_DECODE_CHARS) }] });
    expect(readableValue(serialized)).toBeUndefined();
    expect(readableValue(JSON.stringify({ content: [{ type: "text", text: "a\nb" }] }))).toMatchObject({ kind: "content" });
  });

  it("never leaves a split surrogate in a character-limited preview", () => {
    const text = "x".repeat(PREVIEW_CHARS - 1) + "🐈tail";
    expect(previewText(text)).toEqual({ text: "x".repeat(PREVIEW_CHARS - 1), truncated: true });
  });
});
