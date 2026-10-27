# Changelog

All notable changes to JSONDrill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/eaabak/jsondrill/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/eaabak/jsondrill/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/eaabak/jsondrill/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/eaabak/jsondrill/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/eaabak/jsondrill/releases/tag/v0.1.0
