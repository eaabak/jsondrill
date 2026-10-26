// JSON.rawJSON ships with JSON.parse source text access (Chrome 114+) but is not yet in TypeScript's lib.
interface JSON {
  rawJSON(text: string): unknown;
}
