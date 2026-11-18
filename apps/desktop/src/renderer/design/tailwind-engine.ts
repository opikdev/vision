import { createTailwindEngine } from '@vision/format';
import preflight from 'tailwindcss/preflight.css?raw';
import theme from 'tailwindcss/theme.css?raw';
import utilities from 'tailwindcss/utilities.css?raw';
import { bundledFonts } from './fonts';

export const tailwindEngine = createTailwindEngine({ theme, preflight, utilities }, bundledFonts);

export const frameBaseCss = `@layer base {
  html, body { height: 100%; overflow: hidden; }
  [data-artboard] { height: 100%; }
  p { white-space: pre-line; }
}
[data-reveal='hidden'] { opacity: 0; }
[data-reveal='added'] { animation: vision-rise 160ms ease-out, vision-outline 400ms ease-out; }
[data-reveal='changed'] { animation: vision-outline 400ms ease-out; }
@keyframes vision-rise { from { opacity: 0; translate: 0 4px; } }
@keyframes vision-outline {
  from { outline: 1.5px solid #1c1c1c; }
  to { outline: 1.5px solid transparent; }
}`;
