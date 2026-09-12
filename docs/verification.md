# Verification and remaining gaps

## Automated checks

For v0.1.0-beta.1, typecheck and lint pass; **13 files / 187 tests** pass with the plugin's own dependencies. CI runs the same checks on Node.js 22 and 24.

Coverage includes:
- Lexical JSON fidelity, empty/malformed/oversized payloads, generated-output bounds and surrogate boundaries.
- Explicit code inputs, typed result envelopes, non-text placeholders and full Raw data.
- Exactly one decoding layer for known UI labels; generic logs/code and malformed quotes remain literal.
- Repeated AX role paths compacted only in the derived UI view; full labeled paths retained in Raw.
- JSON text-block highlighting, short headers and real-shaped custom tool inputs.
- Default collapse, user-controlled Show all/Show less, streaming/status updates and complete selected-view copying.
- Async clipboard races, error feedback, dark/light colors and compact props.
- Unmodified pinned Paseo projection functions, including the intentionally unsupported Summary grouping case.

## Browser and host checks

The development workspace also has a separate React Native Web comparison harness. Its browser checks passed at **1500×950 dark** and **390×844 light**, exercising production components with synthetic inputs: frame spacing, keyboard disclosure, wrapping, code/JSON, quoted UI labels, Raw/Copy, streaming, bounded previews and 100,000-row data.

The standalone release includes source/unit/renderer/host-projection tests and selected synthetic screenshots, not the separate comparison application's source or its large host renderer fixtures. The browser check is not a connected-host integration test.

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

Formatting limits do not cap host projection/storage, full Raw serialization or clipboard work. Show all intentionally removes the preview limit. Clipboard browser tests use the shared system clipboard and must not run concurrently with unrelated copying.
