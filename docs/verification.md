# Verification and remaining gaps

## Automated checks

The published v0.1.0-beta.1 baseline had typecheck and lint passing with **13 files / 187 tests**.
The v0.1.0-beta.2 formatter follow-up passes the same checks with **13 files / 202 tests**.
It was reloaded into the existing enabled macOS Paseo 0.8.0 installation, which reported running.
No daemon restart, host display-preference change or other plugin state change was performed.
CI runs the same checks on Node.js 22 and 24.

Coverage includes:
- Lexical JSON fidelity, empty/malformed/oversized payloads, generated-output bounds and surrogate boundaries.
- Explicit code inputs, typed result envelopes, non-text placeholders and full Raw data.
- DSH-projected ACP `content[]` wrappers: explicit `type: "content"` blocks with nested text are extracted one layer, while mixed non-text blocks remain safe placeholders and the source stays in Raw.
- Explicit Pi Code-mode envelopes: one-layer `exec_command` result extraction only when `details.codeMode === true`, with schema rejection for partial/ambiguous wrappers.
- Mixed result blocks with per-segment language, one aggregate preview budget, multiple results and preserved unknown/image placeholders, including the ACP projection.
- Nested exit codes, running sessions, empty output, script errors, dropped trace counts, upstream `[Output truncated]` markers and formatter-limit notices.
- Exactly one decoding layer for known UI labels; generic logs/code and malformed quotes remain literal.
- Repeated AX role paths compacted only in the derived UI view; full labeled paths retained in Raw.
- JSON text-block highlighting, short headers and real-shaped custom tool inputs.
- Default collapse, user-controlled Show all/Show less, streaming/status updates and complete selected-view copying.
- Async clipboard races, error feedback, dark/light colors and compact props.
- Unmodified pinned Paseo projection functions, including the intentionally unsupported Summary grouping case.

The new Activity cases use synthetic envelopes only. They deliberately do not inspect or serialize
trace/image payloads for the default preview, do not repair partial JSON, and verify that Readable,
Raw and complete selected-view Copy remain distinct.

## Browser and host checks

The development workspace also has a separate React Native Web comparison harness. Its browser checks passed at **1500×950 dark** and **390×844 light**, exercising production components with synthetic inputs: frame spacing, keyboard disclosure, wrapping, code/JSON, quoted UI labels, Raw/Copy, streaming, bounded previews and 100,000-row data.

The standalone release includes source/unit/renderer/host-projection tests and selected synthetic screenshots, not the separate comparison application's source or its large host renderer fixtures. The browser check is not a connected-host integration test.
The baseline browser suite was repeated for beta.2. A new **1500×1050 / 390×844** browser pass
also verified nested Pi output, literal escapes, one-layer ACP blocks, mixed JSON token colors,
full Readable/Raw copying, streaming, compact status spacing and absence of horizontal page overflow.
The first pass exposed oversized newline-only status boxes; those were fixed and the check rerun.

A read-only public-SDK replay of eight recent live timelines exercised **582 completed unknown
tool calls**: all stayed within the shared preview bounds, none threw, and hashes confirmed all
582 source payloads were unchanged. It included 298 bounded previews, 76 visible JSON segments
and 11 upstream-truncation cases. Only aggregate counts were retained, not personal fixtures.
This is live-data formatter verification, not visual desktop or latency/FPS measurement.

The README's focused images show the shipped renderer's UI-label/JSON view, bounded long-output preview and nested command output. They are component crops from the same browser harness, not reconstructed artwork. Captures check the compacted path, shared preview boundary and status spacing. Along with the three overview images, all six public screenshots use synthetic data and are labeled as component previews rather than live-host captures.

On the macOS Paseo 0.8.0 installation, earlier smoke checks verified 32px desktop pitch, real custom-tool icons and short summaries, readable output previews, and Show all/Show less. The beta was subsequently reloaded into that same enabled installation and reported running, without changing host preferences or restarting the daemon. The new quoted-label/path rendering was checked in the browser and renderer tests, not re-exercised in a live personal conversation. These targeted checks do not amount to the full browser matrix running in the installed app.

## Dependency review

An npm audit on 2026-09-12 reported **one low-severity advisory**, [GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx), for `diff@7.0.0` in the verification dependency tree. It affects `parsePatch` and string-input `applyPatch`; this plugin imports only `diffLines`, which the advisory explicitly says is unaffected. It does not call the affected functions.

The test dependency remains pinned to the version used for the Paseo 0.8 compatibility baseline; a blanket major upgrade would not upgrade the installed host's provided module. This is a scoped dependency review, not a security certification.

## Not established

- Summary support, automatic display-mode detection or safe mixed-mode connected clients.
- Native iOS/Android behavior, or a complete reconnect/virtualization/enable-disable matrix.
- Smooth full rendering of million-line payloads or a measured latency/FPS budget.
- Lossless information equivalence of Readable and Raw. Readable is explicitly derived; Raw remains the complete received representation.
- Perfect interpretation of arbitrary custom-tool output or recursive code/string decoding.
- Recovery of output omitted upstream: a visible `[Output truncated]` marker is reported, but Show all and Copy cannot recreate bytes Pi did not send.

Formatting limits do not cap host projection/storage, full Raw serialization or clipboard work. Show all intentionally removes the preview limit. Clipboard browser tests use the shared system clipboard and must not run concurrently with unrelated copying.
