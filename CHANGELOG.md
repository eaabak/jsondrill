# Changelog

All notable changes to JSONDrill are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0] - 2026-11-16

### Changed

- Simpler controls above the records: the list picker, search and Add filter share one row. The
  list picker only appears when a response has more than one list, Contains and Exact appear once
  you type, and Reset appears once there is something to reset.
- The request list runs in time order like the Network tab: new requests appear at the bottom and
  the list follows them until you scroll up.
- Compare shows its change filters in a single row.
- After an update, the toolbar popup lists what is new instead of linking to the release page. The
  same list is always available under What's new.

### Added

- Open a JSON file or paste JSON from the toolbar popup. It opens in a tab with the same search,
  filters, table and JSON views as a response, without DevTools and without any permission.
- Copy as button on every request with three choices: a bug report (a Markdown summary of the
  request, the response, any GraphQL errors and a cURL command to reproduce it), a cURL command
  and a `fetch()` call. Tokens, cookies and passwords are hidden by default.
- Headers tab: a JWT stored in a cookie (for example `token=…`) is decoded like the one in the
  `Authorization` header. A token in a header is preferred when both are present.

## [0.3.0] - 2026-11-15

### Added

- The request list shows how long each request took. Requests of 1 s or longer are orange and
  requests of 3 s or longer are red.
- Errors option that keeps only failed requests, HTTP errors and GraphQL responses with errors.
- The request list can be sorted newest first, slowest first or problems first (failed and 5xx,
  4xx, GraphQL errors, very slow, slow).
- Colors button under the request list that explains what each color and badge means.
- GraphQL calls show their operation type and name. Responses that carry an `errors` field are
  marked as errors even when the status is 200, and Compare pairs calls of the same operation.
- A badge such as `2×` marks requests sent again within one second with the same method, URL and
  body.
- Headers tab: timing breakdown (queued, DNS, connecting, sending, waiting for the server,
  downloading), a summary of all calls to the same endpoint (calls, errors, average and slowest
  time), and the decoded token of a JWT `Authorization` header with its expiry. Token claims stay
  masked until revealed; the signature is not verified.

### Changed

- The bodies of GraphQL responses are read as they arrive to look for errors. Other response
  bodies are still read only when the request is selected.

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

[Unreleased]: https://github.com/eaabak/jsondrill/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/eaabak/jsondrill/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/eaabak/jsondrill/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/eaabak/jsondrill/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/eaabak/jsondrill/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/eaabak/jsondrill/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/eaabak/jsondrill/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/eaabak/jsondrill/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/eaabak/jsondrill/releases/tag/v0.1.0
