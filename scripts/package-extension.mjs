// Packs dist/ into the zip uploaded to the Chrome Web Store, without depending on a zip binary.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(root, 'dist');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const outputPath = join(root, `jsondrill-${version}.zip`);

const ZIP_VERSION = 20;
const UTF8_NAMES_FLAG = 0x0800;
const DEFLATE_METHOD = 8;
// Fixed 1980-01-01 timestamps keep the archive byte-for-byte reproducible.
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1;

const files = readdirSync(distDir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name))
  .toSorted();

const localParts = [];
const centralParts = [];
let offset = 0;

for (const filePath of files) {
  const name = Buffer.from(relative(distDir, filePath).split(sep).join('/'));
  const data = readFileSync(filePath);
  const compressed = deflateRawSync(data, { level: 9 });
  const checksum = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(ZIP_VERSION, 4);
  local.writeUInt16LE(UTF8_NAMES_FLAG, 6);
  local.writeUInt16LE(DEFLATE_METHOD, 8);
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(ZIP_VERSION, 4);
  central.writeUInt16LE(ZIP_VERSION, 6);
  central.writeUInt16LE(UTF8_NAMES_FLAG, 8);
  central.writeUInt16LE(DEFLATE_METHOD, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);

  localParts.push(local, name, compressed);
  centralParts.push(central, name);
  offset += local.length + name.length + compressed.length;
}

const centralDirectory = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDirectory.length, 12);
end.writeUInt32LE(offset, 16);

writeFileSync(outputPath, Buffer.concat([...localParts, centralDirectory, end]));
process.stdout.write(`Packed ${files.length} files into ${relative(root, outputPath)}\n`);
