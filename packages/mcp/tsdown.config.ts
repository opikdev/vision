import { readFile } from 'node:fs/promises';
import { defineConfig, type Rolldown } from 'tsdown';

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

export default defineConfig({
  entry: { 'vision-mcp': 'src/main.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node24',
  fixedExtension: true,
  dts: false,
  deps: { alwaysBundle: [/./], onlyBundle: false },
  plugins: [raw],
  inputOptions: { resolve: { mainFields: ['module', 'main'] } },
});
