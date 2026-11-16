# Privacy Policy

_Last updated: 16 November 2026_

JSONDrill is a Chrome DevTools extension that helps developers inspect JSON responses. It is
designed to work entirely on your computer.

## What JSONDrill accesses

While Chrome DevTools is open, JSONDrill reads the list of network requests that DevTools has
recorded for the inspected page: method, URL, status, content type, size, query parameters,
request and response headers, timing, and the request body (payload). It reads a response body
only when you select that request in the JSONDrill panel. The one exception is GraphQL calls: their
response bodies are read as they arrive, to check for an `errors` field, because GraphQL reports
failures inside a successful response.

Headers, query parameters and form fields whose names look like credentials (for example
`Authorization`, cookies, tokens, API keys and passwords) are masked in the panel until you
choose to reveal them. When a request carries a JSON Web Token, JSONDrill decodes it locally to
show its expiry; the decoded claims are masked the same way.

## How the data is used

The data is parsed and displayed inside the DevTools panel so you can search and filter it.
It is kept in memory only, and is discarded when you clear the list, when the inspected page
navigates, or when DevTools is closed.

## What JSONDrill does not do

- It does not send any data to the developer or to any third party.
- It makes no network requests of its own and loads no remote code. When DevTools opens, it asks
  the browser to check the Chrome Web Store for a newer version of JSONDrill, the same check the
  browser makes on its own every few hours.
- It contains no analytics, telemetry, advertising or tracking.
- It does not store request or response data on disk. The only things it remembers are the size
  of the request list and whether Copy as hides credentials, kept in the extension's local storage.
- It requests no extension permissions.

## Opening a JSON file

The toolbar popup can open a page where you drop a JSON file or paste JSON. The content is read
by that page only, kept in memory, and discarded when you close the tab.

## Copy and export

Copying or exporting results happens only when you click Copy or Export. The data goes to your
clipboard or to a file you choose to save, and nowhere else.

## Changes and contact

Changes to this policy are published in this file in the
[JSONDrill repository](https://github.com/eaabak/jsondrill). Questions can be raised through
[GitHub issues](https://github.com/eaabak/jsondrill/issues).
