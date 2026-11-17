import { runApp, type VisionApp } from './vision-app';

export interface ScreenshotOptions {
  file: string;
  artboard: string;
  scale: number;
}

export interface ScreenshotSize {
  scale: number;
  width: number;
  height: number;
}

export const maxScreenshotSide = 2000;

export function screenshotSize(width: number, height: number, requested: number): ScreenshotSize {
  const scale = Math.min(requested, maxScreenshotSide / Math.max(width, height));
  return {
    scale,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function takeScreenshot(app: VisionApp, options: ScreenshotOptions): Promise<Buffer> {
  return runApp(app, {
    prefix: 'vision-screenshot-',
    action: 'take the screenshot',
    output: 'screenshot.png',
    written: 'the PNG',
    args: (out) => [
      `--vision-screenshot=${options.file}`,
      `--artboard=${options.artboard}`,
      `--out=${out}`,
      `--scale=${options.scale}`,
    ],
  });
}
