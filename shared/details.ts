import type { ToolCallDetail } from "@getpaseo/protocol/agent-types";
import { diffLinesForDetail, isRenderableDetail, type DiffLine } from "./presentation";
import type { ToolCallItemData } from "./timeline";
import { formatUiText, isUiTool } from "./ui-text";

export const MAX_FORMAT_CHARS = 100_000;
export const PREVIEW_LINES = 20;
export const PREVIEW_CHARS = 4_000;
export const MAX_DECODE_CHARS = 1_000_000;

export type ReadableValue =
  | { kind: "code"; code: string; language: "javascript"; note: string }
  | { kind: "content"; blocks: unknown[]; language: "text"; note: string; ui?: boolean };

export interface TextPreview { text: string; truncated: boolean; language?: "json" }

export interface DetailSection {
  label: string;
  value: unknown;
  language?: string;
  prose?: boolean;
  diff?: DiffLine[];
  raw?: string;
  readable?: ReadableValue;
}

export function rawValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

/** Change whitespace only. Preserve large numbers, key order, duplicate keys and escapes. */
export function prettyJson(source: string): string | null {
  if (source.length > MAX_FORMAT_CHARS || !source.trim()) return null;
  try {
    JSON.parse(source);
  } catch {
    return null;
  }
  const tokens = source.match(/"(?:\\[\s\S]|[^"\\])*"|[{}[\],:]|[^\s{}[\],:]+/g) ?? [];
  let depth = 0;
  const out: string[] = [];
  let length = 0;
  const push = (value: string) => { out.push(value); length += value.length; };
  const line = () => push("\n" + "  ".repeat(Math.min(depth, 40)));
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === "{" || token === "[") {
      push(token);
      depth += 1;
      if (tokens[index + 1] !== "}" && tokens[index + 1] !== "]") line();
    } else if (token === "}" || token === "]") {
      depth -= 1;
      if (tokens[index - 1] !== "{" && tokens[index - 1] !== "[") line();
      push(token);
    } else if (token === ",") {
      push(token);
      line();
    } else if (token === ":") {
      push(": ");
    } else {
      push(token);
    }
    // Small but deeply nested input can otherwise expand into megabytes of indentation.
    if (length > MAX_FORMAT_CHARS) return null;
  }
  return out.join("");
}

export function presentValue(value: unknown, language?: string) {
  const raw = rawValue(value);
  const formatted = language && language !== "json" ? null : prettyJson(raw);
  return {
    raw,
    text: formatted ?? raw,
    language: formatted !== null ? "json" : language ?? "text",
    canFormat: formatted !== null && formatted !== raw,
  };
}

export function previewText(text: string): TextPreview {
  const lines = text.slice(0, PREVIEW_CHARS + 1).split("\n");
  let preview = lines.slice(0, PREVIEW_LINES).join("\n").slice(0, PREVIEW_CHARS);
  // Do not leave half an emoji at a UTF-16 character boundary.
  if (preview.length < text.length && /[\uD800-\uDBFF]$/.test(preview)) preview = preview.slice(0, -1);
  return { text: preview, truncated: preview.length < text.length };
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

/** Decode only known transport containers; never recursively reinterpret arbitrary string fields. */
export function readableValue(value: unknown, toolName?: string, direction = toolName === undefined ? "output" : "input"): ReadableValue | undefined {
  let decoded = value;
  if (typeof value === "string" && value.length <= MAX_DECODE_CHARS) {
    try { decoded = JSON.parse(value); } catch { /* It may be literal JS input. */ }
  }
  const record = object(decoded);
  if (direction === "input") {
    const name = (toolName ?? "").trim().toLowerCase().replace(/^(?:functions|tools)\./, "");
    const codeTool = ["exec", "mcpscript", "mcp_script"].includes(name);
    const code = codeTool ? record?.code ?? (typeof decoded === "string" && !decoded.slice(0, 256).trimStart().startsWith("{") ? decoded : undefined)
      : name === "evaluate_browser" ? record?.expression : undefined;
    if (typeof code === "string") return { kind: "code", code, language: "javascript", note: "JavaScript · Full input in Raw" };
    return undefined;
  }
  const ui = isUiTool(toolName);
  const blocks = ui && typeof value === "string" && !record ? [{ type: "text", text: value }] : record?.content;
  // A typed content array is the explicit tool-result contract, not a random { text } object.
  if (!Array.isArray(blocks) || (blocks.length > 0 && typeof object(blocks[0])?.type !== "string")) return undefined;
  return { kind: "content", blocks, language: "text", ...(ui ? { ui } : {}), note: ui
    ? "UI view · Labels expanded; paths compacted. Full response and attachments in Raw"
    : "Readable content · Full response, metadata and attachments in Raw" };
}

/** One preview budget across ALL blocks; do not serialize images/metadata or scan the tail eagerly. */
export function renderReadable(value: ReadableValue, all = false): TextPreview {
  if (value.kind === "code") return all ? { text: value.code, truncated: false } : previewText(value.code);
  if (!value.blocks.length) return { text: "", truncated: false };
  let text = "";
  let language: "json" | undefined;
  for (let i = 0; i < value.blocks.length; i++) {
    // Respect an exhausted budget before reading even the next block.
    const separator = i ? "\n\n" : "";
    if (!all && previewText(text + separator + "x").truncated) return { text: previewText(text + separator).text, truncated: true };
    const block = object(value.blocks[i]);
    let part: string;
    if (block?.type === "text" && typeof block.text === "string") {
      // Formatting changes lexical whitespace only. Embedded non-JSON text keeps its real newlines.
      const json = prettyJson(block.text);
      if (json !== null && value.blocks.length === 1) language = "json";
      part = json ?? (value.ui ? formatUiText(block.text) : block.text);
    } else {
      // Non-text blocks and extra fields are explicitly retained in Raw, never fetched/executed.
      const type = typeof block?.type === "string" ? block.type.slice(0, 40) : "Unknown block";
      const mime = typeof block?.mimeType === "string" ? " · " + block.mimeType.slice(0, 80) : "";
      part = "[" + type + mime + " · data in Raw]";
    }
    if (all) { text += separator + part; continue; }
    const preview = previewText(text + separator + part.slice(0, PREVIEW_CHARS + 1));
    text = preview.text;
    if (preview.truncated || part.length > PREVIEW_CHARS) return { text, truncated: true, ...(language ? { language } : {}) };
  }
  return { text, truncated: false, ...(language ? { language } : {}) };
}

/** Host-validated detail is still treated defensively for history/provider evolution. */
export function detailSections(data: ToolCallItemData): DetailSection[] {
  if (!isRenderableDetail(data.detail)) {
    return [{ label: "Details", value: data.detail, language: undefined },
      ...(data.errorText ? [{ label: "Error", value: data.errorText, prose: true, language: "text" }] : [])];
  }
  const detail = data.detail as unknown as ToolCallDetail;
  const section = (label: string, value: unknown, language?: string): DetailSection => ({
    label, value, language,
  });
  let sections: DetailSection[];
  switch (detail.type) {
    case "unknown": {
      sections = [section("Input", detail.input), section("Output", detail.output)];
      const input = readableValue(detail.input, data.name);
      const output = readableValue(detail.output, data.name, "output");
      if (input) sections[0]!.readable = input;
      if (output) sections[1]!.readable = output;
      break;
    }
    case "shell":
      sections = [section("Command", detail.command, "bash")];
      if (detail.cwd) sections.push(section("Working directory", detail.cwd, "text"));
      sections.push(section("Output", detail.output, "text"));
      if (detail.exitCode !== undefined && detail.exitCode !== null) {
        sections.push(section("Exit code", String(detail.exitCode), "text"));
      }
      break;
    case "read":
    case "write":
      sections = [
        section("File", detail.filePath, "text"),
        section("Contents", detail.content, data.presentation.language ?? "text"),
      ];
      break;
    case "edit": {
      sections = [section("File", detail.filePath, "text")];
      const size = (detail.oldString?.length ?? 0) + (detail.newString?.length ?? 0);
      if (detail.unifiedDiff !== undefined) {
        sections.push({
          ...section("Diff", detail.unifiedDiff, "text"),
          ...(detail.unifiedDiff.length <= MAX_FORMAT_CHARS ? { diff: diffLinesForDetail(detail) } : {}),
        });
      } else if (size <= MAX_FORMAT_CHARS) {
        const diff = diffLinesForDetail(detail);
        sections.push({
          label: "Diff",
          value: diff.map((line) => (line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " ") + line.text).join("\n"),
          diff,
          language: "text",
          raw: rawValue(detail),
        });
      } else {
        sections.push(section("Before", detail.oldString, data.presentation.language ?? "text"));
        sections.push(section("After", detail.newString, data.presentation.language ?? "text"));
      }
      break;
    }
    case "plain_text":
    case "plan":
      sections = [{ label: "Output", value: detail.text, prose: true, language: "text" }];
      break;
    default:
      // Keep every field for search/fetch/subagent/provider-specific details.
      sections = [section("Details", detail)];
  }
  if (data.errorText) sections.push({ label: "Error", value: data.errorText, prose: true, language: "text" });
  return sections;
}

export function activityIcon(category: ToolCallItemData["presentation"]["category"]): string {
  return {
    shell: "Terminal",
    file: "FileText",
    search: "Search",
    agent: "User",
    plan: "List",
    communication: "MessageSquare",
    unknown: "Wrench",
  }[category];
}
