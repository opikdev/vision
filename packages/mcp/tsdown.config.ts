import * as hugeicons from '@hugeicons/core-free-icons';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';
import { defineConfig, type Rolldown } from 'tsdown';
import { buildIconSet } from './src/icons/icon-set.ts';

const rawSuffix = '?raw';

const raw: Rolldown.Plugin = {
  name: 'vision-raw',
  async resolveId(source, importer) {
    if (!source.endsWith(rawSuffix)) return null;
    const resolved = await this.resolve(source.slice(0, -rawSuffix.length), importer, {
      skipSelf: true,
    });
    if (resolved === null)
      throw new Error(`Can't resolve ${source} from ${importer ?? 'the entry'}`);
    return `${resolved.id}${rawSuffix}`;
  },
  async load(id) {
    if (!id.endsWith(rawSuffix)) return null;
    const text = await readFile(id.slice(0, -rawSuffix.length), 'utf8');
    return { code: `export default ${JSON.stringify(text)};`, moduleType: 'js' };
  },
};

const iconsModule = fileURLToPath(new URL('src/icons/hugeicons.ts', import.meta.url));

// Bundled as they are, the 6,000 icon modules would add about 7 MB to the server; as one
// brotli-compressed blob of the shapes they add about 1.3 MB, unpacked on first use.
const compressedIcons: Rolldown.Plugin = {
  name: 'vision-compressed-icons',
  load(id) {
    if (id !== iconsModule) return null;
    const packed = brotliCompressSync(JSON.stringify(buildIconSet(hugeicons))).toString('base64');
    return {
      code: [
        "import { brotliDecompressSync } from 'node:zlib';",
        'let iconSet;',
        'export function loadIconSet() {',
        `  iconSet ??= JSON.parse(brotliDecompressSync(Buffer.from(${JSON.stringify(packed)}, 'base64')).toString());`,
        '  return iconSet;',
        '}',
      ].join('\n'),
      moduleType: 'js',
    };
  },
};

export default defineConfig({
  entry: { 'vision-mcp': 'src/main.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node24',
  fixedExtension: true,
  dts: false,
  deps: { alwaysBundle: [/./], onlyBundle: false },
  plugins: [raw, compressedIcons],
  inputOptions: { resolve: { mainFields: ['module', 'main'] } },
});
