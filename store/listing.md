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

COMPARE RESPONSES
See what changed between two calls to the same endpoint in one click. JSONDrill lists structure changes first (removed fields, new fields, a number that became a string, a field that became nullable), then the added, removed and changed records, paired by their id. Each changed record is shown as a colored line-by-line diff, in unified or side-by-side view. Narrow the list to a single change type or field, such as only the records whose status changed.

SPOT SLOW AND FAILED REQUESTS
The request list keeps the order of the Network tab and shows how long each request took. Slow requests are orange, very slow and failed ones are red. Show only the errors, or sort by slowest first or problems first. GraphQL calls show their operation name, and a response that carries errors is marked as failed even when its status is 200.

PAYLOAD AND HEADERS
Switch between the Response, Payload and Headers tabs of any request. JSON request bodies get the same search, filters and table as responses, so even a bulk POST with hundreds of items is easy to inspect. Form data and query parameters are shown as tables. The Headers tab shows where the time went and decodes a JWT from the Authorization header or a cookie, with its expiry. Authorization headers, cookies, tokens and passwords stay masked until you reveal them.

RECORD WHEN CLOSED
Missed a request because DevTools was closed? Click Record when closed once and allow the site. From then on JSONDrill keeps that site's fetch and XHR requests in the page, and they are in the list as soon as you open DevTools. The requests stay in the open page only: nothing is sent anywhere or saved to disk, and they are cleared when you close or reload the page.

COPY AS BUG REPORT, CURL OR FETCH
Turn any request into a ready-to-paste bug report for Jira or GitHub, a cURL command or a fetch() call. Tokens, cookies and passwords are hidden unless you choose to include them.

OPEN A JSON FILE OR PASTE JSON
No DevTools needed: click the JSONDrill icon, then drop a JSON file or paste JSON. It opens in a tab with the same search, filters, table and JSON views.

COPY AND EXPORT
Copy the matching records as JSON or download them as a file.

PRIVATE BY DESIGN
JSONDrill runs entirely on your computer. It asks for no permissions at install; site access is requested only for a site you choose to record. It makes no network requests, has no analytics or tracking, and never stores response data or opened files on disk.

HOW TO USE
1. Open DevTools and select the JSONDrill panel.
2. Reload the page if the request list is empty.
3. Select a request, then search or add filters.
To explore a file instead, click the JSONDrill icon in the toolbar and choose "Open a JSON file or paste JSON".

JSONDrill is free and open source under the MIT license:
https://github.com/eaabak/jsondrill
```

**Graphic assets** (all in this folder):

| Asset                      | File                       |
| -------------------------- | -------------------------- |
| Store icon (128×128)       | `store-icon-128.png`       |
| Screenshot 1 (1280×800)    | `screenshot-4-compare.png` |
| Screenshot 2 (1280×800)    | `screenshot-5-split.png`   |
| Screenshot 3 (1280×800)    | `screenshot-6-payload.png` |
| Screenshot 4 (1280×800)    | `screenshot-1-table.png`   |
| Screenshot 5 (1280×800)    | `screenshot-3-dark.png`    |
| Small promo tile (440×280) | `promo-small-440x280.png`  |

The store allows five screenshots; `screenshot-2-json.png` is kept as a spare. The screenshots
show synthetic sample data.

**Official URL / Homepage:** https://github.com/eaabak/jsondrill

**Support URL:** https://github.com/eaabak/jsondrill/issues

## Privacy practices

**Single purpose:**

```text
JSONDrill helps developers inspect, search and filter JSON: the responses of network requests in a Chrome DevTools panel, including requests it records for a site the user chooses while DevTools is closed, and JSON files or text the user opens.
```

**Permission justification:** nothing is requested at install. Two optional permissions are
requested at runtime, only when the user clicks Record when closed, and only for the site open in
DevTools:

- `scripting` (optional):

  ```text
  Used only after the user turns on "Record when closed" for a site. It registers a script for that site so the requests the page makes while DevTools is closed are kept in the page and shown in the JSONDrill panel when DevTools is opened. Nothing is sent anywhere.
  ```

- Host permissions (optional, `https://*/*` and `http://*/*`):

  ```text
  Requested one site at a time, only for the site the user chooses to record. Needed so the recording script can run on that site. The user can stop recording or remove the access at any time.
  ```

**Remote code:** No, I am not using remote code. All scripts are bundled in the package.

**Data usage:** leave every data category unchecked. Request and response data (including
headers and request bodies) is read through the DevTools API, processed in memory on the user's
device and never transmitted, sold or stored. The same holds for a JSON file or text the user
opens in the viewer page, and for requests recorded while DevTools is closed, which stay in the
recorded page's memory until DevTools reads them.

Certify all three statements:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/eaabak/jsondrill/blob/main/PRIVACY.md

## Distribution

- **Visibility:** Public
- **Regions:** All regions
- **Pricing:** Free
