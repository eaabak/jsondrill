# Contributing to JSONDrill

Thanks for helping improve JSONDrill. Bug reports, focused fixes and well-scoped features are
welcome. Please read the [code of conduct](CODE_OF_CONDUCT.md) first, and report security issues
privately as described in [SECURITY.md](SECURITY.md).

## Setup

Use the Node.js version in `.nvmrc` (`nvm use`), then:

```bash
npm install
npm run dev
```

Load `dist/` as an unpacked extension (see the README) and reload it from `chrome://extensions`
after each rebuild. Close and reopen DevTools to pick up panel changes.

Before opening a pull request, run:

```bash
npm run format
npm run check
```

`npm run check` runs exactly what CI runs: Prettier, Oxlint, TypeScript, Vitest and the
production build. Editors that support EditorConfig and Prettier pick up the project settings
automatically.

## Architecture

- `src/core` is framework-free and must not use Chrome or DOM APIs. All JSON processing and
  query logic lives here and is covered by tests in `tests/`.
- `src/network` owns the captured request model; `devtools.ts` is the only file that talks to
  `chrome.devtools`.
- `src/panel` contains React components and hooks. Keep domain logic out of components.

## Guidelines

- Add or update tests for any behaviour change in `src/core` or `src/network`.
- Keep the TypeScript configuration strict; do not use `any` or suppress errors.
- Do not add extension permissions, remote requests, telemetry or persistent storage of
  response data.
- Render response content as text only; never use `dangerouslySetInnerHTML` or `eval`.
- Prefer small, explicit changes over new abstractions or dependencies.
- Follow the existing UI conventions: compact controls, square corners, design tokens in
  `src/styles/panel.css`.

- Add user-facing changes to the "Unreleased" section of `CHANGELOG.md`.

## Reporting issues

Use the issue templates. Include the Chrome version, steps to reproduce and, if possible, a
minimal sample response with sensitive data removed.

## Releasing

Maintainers release from `main`:

1. Move the "Unreleased" notes in `CHANGELOG.md` under the new version.
2. Run `npm version patch` (or `minor` / `major`). This updates `package.json` and
   `public/manifest.json`, commits and creates the `vX.Y.Z` tag.
3. Run `git push --follow-tags`. The release workflow runs all checks, builds
   `jsondrill-X.Y.Z.zip` and attaches it to a GitHub release.
4. Upload the zip in the Chrome Web Store developer dashboard.
