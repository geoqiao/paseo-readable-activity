import { describe, expect, it } from "vitest";
import { detailSections, presentValue, prettyJson, previewText, MAX_FORMAT_CHARS, PREVIEW_CHARS, PREVIEW_LINES } from "./details";
import { diffLinesForDetail, formatError } from "./presentation";
import type { ToolCallItemData } from "./timeline";

function data(detail: ToolCallItemData["detail"]): ToolCallItemData {
  return { name: "test", status: "completed", detail, presentation: { category: "unknown", icon: "Wrench", label: "Test" } };
}

describe("lossless presentation", () => {
  it.each([
    '{"id":90071992547409931234,"x":1e+100,"neg":-0,"a":1,"a":2}',
    '{"s":"quote:\\" slash:\\\\ newline:\\n","empty":{},"arr":[]}',
    '[1,true,false,null,{"emoji":"猫🐈","values":[2,3]}]',
    ' "hello" ', "false", "0", "null",
  ])("formats without changing lexical values: %s", (raw) => {
    const formatted = prettyJson(raw)!;
    const lexical = (text: string) => text.match(/"(?:\\[\s\S]|[^"\\])*"|[^\s]/g)?.join("");
    expect(lexical(formatted)).toBe(lexical(raw));
    expect(() => JSON.parse(formatted)).not.toThrow();
  });
  it.each(["partial {", '{"incomplete":', "plain text", "{'invalid': 1}", ""])("keeps malformed or plain output untouched: %s", (raw) => {
    expect(presentValue(raw)).toEqual({ raw, text: raw, language: "text", canFormat: false });
  });
  it("does not reinterpret nested JSON strings", () => {
    const raw = '{"text":"{\\"embedded\\":1}"}';
    expect(presentValue(raw).text).toContain('"{\\"embedded\\":1}"');
  });
  it("keeps zero, false, null and empty distinct", () => {
    expect([0, false, null, ""].map((value) => presentValue(value).raw)).toEqual(["0", "false", "null", ""]);
  });
  it("avoids formatting enormous values while retaining original content", () => {
    const raw = '{"text":"' + "a".repeat(MAX_FORMAT_CHARS) + '"}';
    expect(prettyJson(raw)).toBeNull();
    expect(presentValue(raw).raw).toBe(raw);
  });
  it("bounds pathological nesting without changing valid JSON", () => {
    const raw = "[".repeat(100) + "0" + "]".repeat(100);
    const formatted = prettyJson(raw)!;
    expect(Math.max(...formatted.split("\n").map((line) => line.match(/^ */)![0].length))).toBeLessThanOrEqual(80);
    expect(JSON.parse(formatted)).toEqual(JSON.parse(raw));
  });
  it("bounds line count and single-line length independently", () => {
    expect(previewText("a".repeat(PREVIEW_CHARS + 1))).toEqual({ text: "a".repeat(PREVIEW_CHARS), truncated: true });
    expect(previewText(Array.from({ length: 100 }, () => "x").join("\n")).text.split("\n")).toHaveLength(PREVIEW_LINES);
    expect(previewText("")).toEqual({ text: "", truncated: false });
  });
  it("bounds formatted output as well as input, falling back without losing the source", () => {
    const raw = "[".repeat(40) + Array.from({ length: 2_000 }, () => "0").join(",") + "]".repeat(40);
    expect(raw.length).toBeLessThan(MAX_FORMAT_CHARS);
    expect(prettyJson(raw)).toBeNull();
    expect(presentValue(raw)).toMatchObject({ raw, text: raw, canFormat: false });
  });
  it("keeps full errors instead of truncating them in the view model", () => {
    const error = "failure ".repeat(200);
    expect(formatError(error)).toBe(error);
  });
});

describe("detail sections", () => {
  it("keeps input/output and provider-specific fields intact", () => {
    const input = { hidden: false, nested: { a: 1 } };
    const output = { content: [{ type: "text", text: '{"a":1}' }], extra: "keep" };
    expect(detailSections(data({ type: "unknown", input, output }))).toMatchObject([
      { label: "Input", value: input, language: undefined },
      { label: "Output", value: output, language: undefined },
    ]);
    const future = { type: "future", value: { arbitrary: "content" } };
    expect(detailSections(data(future))).toEqual([{ label: "Details", value: future, language: undefined }]);
  });
  it("keeps shell output and exit code without synthetic prompt characters", () => {
    expect(detailSections(data({ type: "shell", command: "pwd", cwd: "/tmp", output: "", exitCode: 0 }))).toMatchObject([
      { label: "Command", value: "pwd" }, { label: "Working directory", value: "/tmp" },
      { label: "Output", value: "" }, { label: "Exit code", value: "0" },
    ]);
  });
  it("uses one diff panel, preserving source strings behind Raw", () => {
    const detail = { type: "edit", filePath: "a.ts", oldString: "old\n", newString: "new\n" };
    const sections = detailSections(data(detail));
    expect(sections.map((section) => section.label)).toEqual(["File", "Diff"]);
    expect(JSON.parse(sections[1]!.raw!)).toEqual(detail);
    expect(sections[1]!.diff).toEqual([{ kind: "remove", text: "old" }, { kind: "add", text: "new" }]);
  });
  it("falls back to before/after for enormous diffs without losing either side", () => {
    const before = "old\n".repeat(30_000), after = "new\n".repeat(30_000);
    const sections = detailSections(data({ type: "edit", filePath: "a", oldString: before, newString: after }));
    expect(sections.map((section) => section.label)).toEqual(["File", "Before", "After"]);
    expect(sections[1]!.value).toBe(before);
    expect(sections[2]!.value).toBe(after);
  });
  it("bounds worst-case diff work and falls back to a complete replacement", () => {
    const before = Array.from({ length: 400 }, (_, i) => "old " + i).join("\n");
    const after = Array.from({ length: 400 }, (_, i) => "new " + i).join("\n");
    const lines = diffLinesForDetail({ type: "edit", filePath: "a", oldString: before, newString: after });
    expect(lines.filter((line) => line.kind === "remove").map((line) => line.text).join("\n")).toBe(before);
    expect(lines.filter((line) => line.kind === "add").map((line) => line.text).join("\n")).toBe(after);
  });
});
