# Changelog

All notable changes to JSONDrill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.1] - 2026-11-05

### Added

- After an update, the toolbar icon shows a NEW badge. Opening the popup clears it and links to the
  release notes of the new version.
- Opening DevTools asks the browser to check for a newer JSONDrill right away instead of waiting
  for its own check every few hours. The update is installed once DevTools is closed.

## [0.2.0] - 2026-11-04

### Added

- Compare tab: shows what changed between two responses, by default the previous call to the same
  endpoint. Structure changes (removed, added and retyped fields, fields that became nullable) are
  listed first, then added, removed and changed records, paired by their `id`-like field or by
  position. The list can be narrowed to one change type or one changed field.
- Compare tab shows each changed record as a line-by-line JSON diff in unified or split view, with
  red and green highlighting, line numbers for both sides and folded unchanged lines. A compact
  summary view is still available.
- The request list can be resized by dragging its edge (or with the arrow keys); double-click the
  edge to reset. The size is remembered.
- Response, Payload and Headers tabs for the selected request. The chosen tab stays open while
  moving between requests.
- Payload tab: JSON request bodies get the same search, filters, table and export as responses;
  form data is shown as a table; other bodies are shown as text. Query parameters are listed too.
- Headers tab with the request URL, method, status, and the response and request headers.
- Credential-like headers, query parameters and form fields (`Authorization`, `Cookie`, tokens,
  API keys, passwords) are masked until revealed.

## [0.1.3] - 2026-10-27

### Added

- Toolbar popup with step-by-step usage instructions. The toolbar icon is now shown in colour
  instead of greyed out.

## [0.1.2] - 2026-10-26

### Changed

- Dropdowns draw their own arrow with consistent spacing from the right border in light and
  dark themes.

## [0.1.1] - 2026-10-26

### Fixed

- Schema sampling no longer misses fields that only appear in periodic records (for example
  every fourth record) in collections larger than the sample.

### Added

- Chrome Web Store listing text, screenshots, promo tile and store icon in `store/`.

## [0.1.0] - 2026-10-26

### Added

- DevTools panel listing captured network requests, newest first, with text and JSON-only
  filters, clear and page reload.
- Automatic collection discovery and schema inference from a bounded sample, including
  nullable fields, missing properties, nested objects and arrays.
- Search across all fields or a selected field, with Contains and Exact matching; integers
  beyond 2^53 are kept exact.
- Visual filter builder with type-aware operators, nested fields and any-element matching for
  arrays.
- Virtualized table view, lazily expanded JSON tree, and copy or download of matching records.
- Light and dark themes following the DevTools setting.

[Unreleased]: https://github.com/eaabak/jsondrill/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/eaabak/jsondrill/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/eaabak/jsondrill/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/eaabak/jsondrill/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/eaabak/jsondrill/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/eaabak/jsondrill/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/eaabak/jsondrill/releases/tag/v0.1.0
