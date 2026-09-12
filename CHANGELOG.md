# Changelog

## 0.1.0-beta.2

- Recognize only explicitly marked Pi Code-mode `exec_command` result wrappers and expand one output layer.
- Recognize the DSH-projected ACP `content[]` wrapper's explicit `type: "content"` / nested text blocks one layer, while keeping non-text blocks in Raw.
- Keep script, exit-code, running-session, empty-output, error and upstream-truncation status visible while preserving the complete wrapper in Raw.
- Render mixed content blocks with per-segment languages under one shared 20-line / 4,000-character preview budget; unknown blocks remain available in Raw.
- Add synthetic shared and renderer regressions for ACP mixed blocks/shared preview limits, malformed/large data, multiple results, lazy metadata/image tails, streaming disclosure and selected-view Copy.
- Preserve important script errors even when another status is present; report upstream truncation before malformed literal fallback without repairing it or repeating the warning.
- Keep segmented status spacing compact instead of mounting newline-only text boxes. Refresh synthetic screenshots and verify the production renderer in wide/narrow, dark/light browser layouts.
- 202 tests; read-only replay of 582 recent tool outputs checked shared preview bounds, no formatter exceptions and source immutability. No personal payloads were published.

## 0.1.0-beta.1

Initial public release of Readable Agent Activity, an MIT fork of Colorful Agent Activity.

- Quiet icons and bounded single-line summaries.
- Literal JavaScript inputs and lexical JSON formatting, including JSON inside text blocks.
- Readable typed tool-result content; one-layer UI label decoding and repeated-path compaction.
- 20-line / 4,000-character previews, manual Show all/Show less, full selected-view Copy and complete Raw.
- Defensive malformed/large data handling and stable manual disclosure through streaming.
- Explicit Full detail-only compatibility warning for Paseo 0.8.0.
- 187 regression tests, pinned Apache-2.0 host projection fixtures, synthetic screenshots and CI.

**Beta limitations:** Summary unsupported; all connected clients must use Full detail. Native mobile is untested. Full Show all/Raw/Copy can remain expensive.
