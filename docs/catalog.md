# paseo.cafe submission

[paseo.cafe](https://paseo.cafe) is an independent community directory, not an official Paseo compatibility certification.

Publishing a GitHub repository or adding topics does **not** automatically list a plugin. The [official directory README](https://github.com/paseo-cafe/paseo-cafe#submitting-a-plugin) and [submission page](https://paseo.cafe/submit) describe this workflow:

1. Add **`registry/readable-agent-activity.json`** to [paseo-cafe/paseo-cafe](https://github.com/paseo-cafe/paseo-cafe), using the prepared [catalog-entry.json](catalog-entry.json).
2. Open a PR containing that one pointer file. No `path` field is needed: the public repository root is the plugin.
3. Registry validation checks that the public repo exists, its manifest is valid, and its ID exactly matches the registry filename. The directory's CI must pass; maintainers decide whether to merge.
4. After merge and deployment, the scanner generates the listing from this repository's manifest, package metadata, README, license and images. Subsequent scans refresh it.

The existing `colorful-agent-activity` listing belongs to the upstream plugin. This fork uses a distinct ID and credits that upstream rather than replacing its listing.

The prepared entry prominently discloses the Full detail-only beta limitation. `platforms` is omitted because the implementation is not OS-restricted; the caveat explicitly distinguishes a tested macOS host from untested native mobile clients.

## Suggested PR text

**Title:** Add Readable Agent Activity (Full detail-only beta)

> Add a separately named MIT fork of Colorful Agent Activity.
> It provides bounded JSON/code/text previews, Raw/Copy, short headers, and readable UI labels/paths.
> Verified against Paseo 0.8.0. Summary is unsupported; users must use Full detail on every connected client and disable the plugin before switching modes.
> macOS host smoke checks and browser compact tests are documented; native mobile is untested.
> The registry entry includes these caveats. Source, upstream provenance, tests and synthetic screenshots are in the public repository.

**Status:** submitted as [paseo-cafe/paseo-cafe#86](https://github.com/paseo-cafe/paseo-cafe/pull/86). The PR is open and awaiting review. Upstream CI and Registry validation currently require maintainer approval to run for this fork contribution; local registry validation passed for all 59 entries. Submission is not acceptance or catalog inclusion.
