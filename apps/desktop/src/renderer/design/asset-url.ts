export function assetUrl(src: string, assetToken: string, assetsVersion: number): string {
  if (src.startsWith('https:')) return src;
  const path = src
    .split(/[/\\]/)
    .filter((segment) => segment !== '')
    .map(encodeURIComponent)
    .join('/');
  return `vision-asset://${assetToken}/${path}?v=${assetsVersion}`;
}
