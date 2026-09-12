import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import bash from "@shikijs/langs/bash";
import css from "@shikijs/langs/css";
import go from "@shikijs/langs/go";
import html from "@shikijs/langs/html";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import markdown from "@shikijs/langs/markdown";
import python from "@shikijs/langs/python";
import rust from "@shikijs/langs/rust";
import typescript from "@shikijs/langs/typescript";
import yaml from "@shikijs/langs/yaml";
import { useEffect, useState } from "react";

export interface SyntaxColors {
  foreground: string;
  foregroundMuted: string;
  accent: string;
  surface1: string;
}
export interface ShikiToken {
  content: string;
  color?: string;
}
export const MAX_HIGHLIGHT_CHARS = 100_000;
const modules = [bash, css, go, html, javascript, json, markdown, python, rust, typescript, yaml];
const supported = new Set(modules.flat().flatMap((language) => [language.name, ...(language.aliases ?? [])]));
type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;
const highlighters = new Map<string, Promise<Highlighter>>();
const tokensCache = new Map<string, { size: number; tokens: ShikiToken[][] }>();
let cachedChars = 0;

export function syntaxTheme(colors: SyntaxColors) {
  return {
    name: "paseo-quiet",
    // Colors are explicit, not inherited from a separately installed editor theme.
    colors: { "editor.foreground": colors.foreground, "editor.background": colors.surface1 },
    settings: [
      { settings: { foreground: colors.foreground, background: colors.surface1 } },
      { scope: ["comment", "punctuation"], settings: { foreground: colors.foregroundMuted } },
      { scope: ["string", "keyword"], settings: { foreground: colors.accent } },
      { scope: ["constant.numeric", "constant.language", "support.type.property-name.json"], settings: { foreground: colors.foreground } },
    ],
  };
}
export function syntaxKey(colors: SyntaxColors): string {
  return [colors.foreground, colors.foregroundMuted, colors.accent, colors.surface1].join("|");
}
function getHighlighter(colors: SyntaxColors): Promise<Highlighter> {
  const key = syntaxKey(colors);
  const cached = highlighters.get(key);
  if (cached) return cached;
  const promise = createHighlighterCore({
    langs: modules,
    themes: [syntaxTheme(colors)],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  highlighters.set(key, promise);
  // JS regex engine: evicted highlighters can be garbage-collected after in-flight callers finish.
  if (highlighters.size > 4) highlighters.delete(highlighters.keys().next().value!);
  return promise;
}
function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  const aliases: Record<string, string> = { sh: "bash", shell: "bash", shellscript: "bash", jsx: "javascript", tsx: "typescript" };
  return aliases[normalized] ?? normalized;
}
export async function highlightCode(code: string, language: string, colors: SyntaxColors): Promise<ShikiToken[][] | null> {
  const lang = normalizeLanguage(language);
  if (!code || code.length > MAX_HIGHLIGHT_CHARS || !supported.has(lang)) return null;
  const key = syntaxKey(colors) + ":" + lang + ":" + code;
  const cached = tokensCache.get(key);
  if (cached) {
    tokensCache.delete(key);
    tokensCache.set(key, cached);
    return cached.tokens;
  }
  try {
    const highlighter = await getHighlighter(colors);
    const tokens = highlighter.codeToTokensBase(code, { lang, theme: "paseo-quiet" });
    // Concurrent requests for the same code may both have awaited initialization.
    if (!tokensCache.has(key)) {
      tokensCache.set(key, { size: code.length, tokens });
      cachedChars += code.length;
    }
    while (tokensCache.size > 40 || cachedChars > 500_000) {
      const oldest = tokensCache.keys().next().value!;
      cachedChars -= tokensCache.get(oldest)!.size;
      tokensCache.delete(oldest);
    }
    return tokens;
  } catch {
    return null;
  }
}
export function useShikiTokens(code: string, language: string, colors: SyntaxColors): ShikiToken[][] | null {
  const key = syntaxKey(colors);
  const [result, setResult] = useState<{ code: string; language: string; key: string; tokens: ShikiToken[][] | null }>();
  useEffect(() => {
    let cancelled = false;
    void highlightCode(code, language, colors).then((tokens) => {
      if (!cancelled) setResult({ code, language, key, tokens });
    });
    return () => { cancelled = true; };
  }, [code, language, key]);
  // Never display tokens from a previous streaming value or theme, even for one render.
  return result?.code === code && result.language === language && result.key === key ? result.tokens : null;
}
