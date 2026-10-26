// Runs from the npm "version" lifecycle so `npm version <bump>` keeps the extension manifest in step.
import { readFileSync, writeFileSync } from 'node:fs';

const packageUrl = new URL('../package.json', import.meta.url);
const manifestUrl = new URL('../public/manifest.json', import.meta.url);

const { version } = JSON.parse(readFileSync(packageUrl, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
manifest.version = version;
writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
