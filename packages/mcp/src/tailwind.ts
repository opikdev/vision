import { createTailwindEngine } from '@vision/format';
import preflight from 'tailwindcss/preflight.css?raw';
import theme from 'tailwindcss/theme.css?raw';
import utilities from 'tailwindcss/utilities.css?raw';

export const tailwind = createTailwindEngine({ theme, preflight, utilities });
