# Paseo 0.8 compatibility

## Supported beta scope

Verified with app, daemon, protocol and plugin SDK **0.8.0**, using **Full detail**.
The manifest accepts `>=0.8.0 <0.9.0`; future 0.8 releases must be rechecked.
macOS is the tested installed host. Native iOS/Android are untested.

**Summary is not supported. All connected clients must use Full detail. Disable the plugin before switching to Summary.** The warning is not an automatic runtime guard.

## Why Summary cannot safely fall back

Evidence is pinned to [Paseo v0.8.0, commit b8e2467](https://github.com/getpaseo/paseo/tree/b8e24677e12b226c7c38c1c3a40649daa9f1152f):

1. `packages/app/src/agent-stream/view.tsx` calls `projectToolCallDetailLevel` before `projectPluginTimelineItems`.
2. `packages/app/src/tool-calls/detail-level/grouping.ts` gives a grouped host the latest call's payload and first call's ID.
3. `packages/app/src/plugins/timeline/projection.ts` removes group context before calling the plugin transformer.
4. The public contract in `packages/plugin/src/client/contracts.ts` exposes item and phase, not display mode or group members.
5. A replacement plugin row uses a different branch from the native group renderer, removing the group's entry point.

The plugin therefore cannot recognize a Summary group and preserve all its members. It does not read private storage, inspect host DOM/React state, force Full detail or patch the app.

The [host integration tests](../tests/paseo-display.compat.test.js) run the real pinned projection functions with synthetic data. The Summary regression intentionally demonstrates the gap; a passing test is **not Summary support**. A future public host API that preserves groups or adds a detail-renderer slot is needed.

## Spacing and icons

The pinned host spacing function adds 16px between plugin rows, unlike native tool sequences. The plugin uses a 16px desktop content line, producing a 32px pitch; compact mode uses a 44px touch target. Final/footer boundaries can have zero host gap. No negative margins or overlap compensation is used.

Host Icon supports name, size and color, not a plugin stroke-width option. New host releases need spacing and icon rechecks.

## Coexistence and lifecycle

Do not enable two plugins that replace the same tool/reasoning items. This fork uses the distinct default ID `readable-agent-activity`; existing installations may use an explicit runtime alias. Reload the existing alias rather than creating an enabled duplicate.

Contributions are unregistered during cleanup. Streaming/status updates preserve per-card manual disclosure while mounted; virtual-list remounts reset it. Native messages, approvals, composer and special `speak` rows remain with the host.
