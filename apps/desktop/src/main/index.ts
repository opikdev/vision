import { registerPrivilegedSchemes } from './protocols';
import { startApp } from './app';
import { failScreenshot, runScreenshot } from './screenshot';
import { parseScreenshotArgs } from './screenshot-args';

registerPrivilegedSchemes();

const screenshot = parseScreenshotArgs(process.argv);
switch (screenshot.kind) {
  case 'none':
    startApp();
    break;
  case 'invalid':
    failScreenshot(screenshot.message);
    break;
  case 'request':
    runScreenshot(screenshot.request);
    break;
}
