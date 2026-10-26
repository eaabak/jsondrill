# Chrome Web Store listing

Copy these values into the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).
Upload the package built by `npm run package` (`jsondrill-<version>.zip`).

## Store listing

**Name:** JSONDrill

**Summary** (from the manifest, max 132 characters):

```text
Smart JSON filtering directly inside Chrome DevTools.
```

**Category:** Developer Tools

**Language:** English

**Description:**

```text
Find anything inside your JSON.

JSONDrill adds a panel to Chrome DevTools that lists the JSON responses captured by the Network panel and lets you search and filter them like a spreadsheet, without scrolling through thousands of nested objects or writing JSONPath.

SEARCH ANY FIELD
Search every value in a response, or pick a single field such as id, email or status. Choose Contains or Exact matching. Large numeric IDs (beyond 2^53) are matched exactly, never rounded.

FILTERS THAT KNOW YOUR DATA
JSONDrill detects the structure of the selected response automatically: field types, nullable fields, missing properties, nested objects and arrays. Build filters as Field | Operator | Value with operators that fit each type (equals, contains, starts with, greater than, is true, is null, is missing and more). Filter nested fields like profile.city and array fields like orders[].status.

BUILT FOR LARGE RESPONSES
A virtualized table and a lazily expanded JSON tree stay responsive with tens of thousands of records. When a response contains several arrays, choose which collection to explore.

COPY AND EXPORT
Copy the matching records as JSON or download them as a file.

PRIVATE BY DESIGN
JSONDrill runs entirely on your computer. It requests no permissions, makes no network requests, has no analytics or tracking, and never stores response data on disk.

HOW TO USE
1. Open DevTools and select the JSONDrill panel.
2. Reload the page if the request list is empty.
3. Select a request, then search or add filters.

JSONDrill is free and open source under the MIT license:
https://github.com/eaabak/jsondrill
```

**Graphic assets** (all in this folder):

| Asset                      | File                      |
| -------------------------- | ------------------------- |
| Store icon (128×128)       | `store-icon-128.png`      |
| Screenshot 1 (1280×800)    | `screenshot-1-table.png`  |
| Screenshot 2 (1280×800)    | `screenshot-2-json.png`   |
| Screenshot 3 (1280×800)    | `screenshot-3-dark.png`   |
| Small promo tile (440×280) | `promo-small-440x280.png` |

The screenshots show synthetic sample data.

**Official URL / Homepage:** https://github.com/eaabak/jsondrill

**Support URL:** https://github.com/eaabak/jsondrill/issues

## Privacy practices

**Single purpose:**

```text
JSONDrill helps developers inspect, search and filter JSON responses of network requests inside a Chrome DevTools panel.
```

**Permission justification:** none needed. The manifest requests no permissions and no host
permissions; the DevTools APIs it uses are available to every `devtools_page`.

**Remote code:** No, I am not using remote code. All scripts are bundled in the package.

**Data usage:** leave every data category unchecked. Response data is read through the DevTools
API, processed in memory on the user's device and never transmitted, sold or stored.

Certify all three statements:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/eaabak/jsondrill/blob/main/PRIVACY.md

## Distribution

- **Visibility:** Public
- **Regions:** All regions
- **Pricing:** Free
