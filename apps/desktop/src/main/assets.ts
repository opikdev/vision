import { realpath } from 'node:fs/promises';
import { extname, isAbsolute, join, relative } from 'node:path';
import { isMissingFileError } from './errors';

const imageExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.svg',
  '.bmp',
  '.ico',
]);

export async function resolveAssetFile(
  assetsDir: string,
  urlPath: string,
): Promise<string | undefined> {
  const segments = decodeSegments(urlPath);
  if (segments === undefined) return undefined;
  const requested = join(assetsDir, ...segments);
  if (!imageExtensions.has(extname(requested).toLowerCase())) return undefined;
  try {
    const [realDir, realFile] = await Promise.all([realpath(assetsDir), realpath(requested)]);
    if (!imageExtensions.has(extname(realFile).toLowerCase())) return undefined;
    const inside = relative(realDir, realFile);
    if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) return undefined;
    return realFile;
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

function decodeSegments(urlPath: string): string[] | undefined {
  const segments = urlPath.split('/').filter((segment) => segment !== '');
  try {
    const decoded = segments.map((segment) => decodeURIComponent(segment));
    const unsafe = decoded.some(
      (segment) => segment === '..' || segment === '.' || /[/\\\0]/.test(segment),
    );
    return unsafe || decoded.length === 0 ? undefined : decoded;
  } catch (error) {
    if (error instanceof URIError) return undefined;
    throw error;
  }
}
