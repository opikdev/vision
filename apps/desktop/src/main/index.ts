import { registerPrivilegedSchemes } from './protocols';
import { startApp } from './app';
import { failHeadless } from './headless';
import { runReview } from './review';
import { parseReviewArgs } from './review-args';
import { runScreenshot } from './screenshot';
import { parseScreenshotArgs } from './screenshot-args';

registerPrivilegedSchemes();

const screenshot = parseScreenshotArgs(process.argv);
const review = parseReviewArgs(process.argv);
if (screenshot.kind === 'invalid') failHeadless(screenshot.message);
else if (screenshot.kind === 'request') runScreenshot(screenshot.request);
else if (review.kind === 'invalid') failHeadless(review.message);
else if (review.kind === 'request') runReview(review.request);
else startApp();
