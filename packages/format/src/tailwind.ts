import { __unstable__loadDesignSystem, compile } from 'tailwindcss';
import { closest } from './closest';
import type { Diagnostic } from './diagnostics';
import { classOf, collectClasses, splitClasses, visit } from './query';
import type { VisionDocument } from './schema';
import { tokensToThemeCss } from './tokens';
import { locationIds } from './validate';

export interface TailwindStylesheets {
  theme: string;
  preflight: string;
  utilities: string;
}

export interface TailwindEngine {
  css(doc: VisionDocument): Promise<string>;
  classDiagnostics(doc: VisionDocument): Promise<Diagnostic[]>;
}

const markerPattern = /^(group|peer)(\/[A-Za-z0-9_-]+)?$/;

export function createTailwindEngine(sheets: TailwindStylesheets): TailwindEngine {
  const options = { base: '/', loadStylesheet: stylesheetLoader(sheets) };
  return {
    async css(doc) {
      const compiler = await compile(inputCss(doc), options);
      return compiler.build(collectClasses(doc));
    },
    async classDiagnostics(doc) {
      const checker = await loadClassChecker(inputCss(doc), options);
      const unknown = new Set(checker.unknown(collectClasses(doc)));
      const diagnostics: Diagnostic[] = [];
      for (const located of visit(doc)) {
        for (const name of splitClasses(classOf(located))) {
          if (!unknown.has(name)) continue;
          const suggestion = checker.suggest(name);
          diagnostics.push({
            severity: 'warning',
            code: 'unknown-class',
            message: `Unknown class "${name}"`,
            hint:
              suggestion === undefined
                ? 'Check the spelling against the Tailwind CSS v4 docs, or use an arbitrary value such as w-[320px].'
                : `Did you mean \`${suggestion}\`?`,
            path: [...located.path, 'class'],
            ...locationIds(located),
          });
        }
      }
      return diagnostics;
    },
  };
}

function inputCss(doc: VisionDocument): string {
  return [
    '@layer theme, base, components, utilities;',
    '@import "tailwindcss/theme" layer(theme);',
    '@import "tailwindcss/preflight" layer(base);',
    '@import "tailwindcss/utilities" layer(utilities);',
    tokensToThemeCss(doc.tokens),
    '@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));',
  ].join('\n');
}

function stylesheetLoader(sheets: TailwindStylesheets) {
  return (id: string, base: string): Promise<{ path: string; base: string; content: string }> => {
    const name = id.replace(/^tailwindcss\//, '').replace(/\.css$/, '');
    if (name !== 'theme' && name !== 'preflight' && name !== 'utilities') {
      return Promise.reject(new Error(`Unknown stylesheet "${id}"`));
    }
    return Promise.resolve({ path: id, base, content: sheets[name] });
  };
}

interface ClassChecker {
  unknown(candidates: string[]): string[];
  suggest(candidate: string): string | undefined;
}

// Tailwind's design system API is unstable, so every use of it stays in this function.
async function loadClassChecker(
  css: string,
  options: Parameters<typeof __unstable__loadDesignSystem>[1],
): Promise<ClassChecker> {
  const system = await __unstable__loadDesignSystem(css, options);
  const isValid = (candidate: string): boolean => system.candidatesToCss([candidate])[0] != null;
  let classNames: string[] | undefined;
  let variantNames: string[] | undefined;
  return {
    unknown(candidates) {
      const results = system.candidatesToCss(candidates);
      return candidates.filter(
        (candidate, index) => results[index] == null && !markerPattern.test(candidate),
      );
    },
    suggest(candidate) {
      const parts = splitVariants(candidate);
      const utility = parts.pop() ?? '';
      if (isValid(utility)) {
        variantNames ??= system.getVariants().map((variant) => variant.name);
        const names = variantNames;
        const fixed = parts.map((variant) =>
          system.parseVariant(variant) === null ? (closest(variant, names) ?? variant) : variant,
        );
        const suggestion = [...fixed, utility].join(':');
        return isValid(suggestion) ? suggestion : undefined;
      }
      classNames ??= system.getClassList().map(([name]) => name);
      const slash = utility.lastIndexOf('/');
      const hasModifier = slash > 0 && !utility.slice(slash).includes(']');
      const match = closest(hasModifier ? utility.slice(0, slash) : utility, classNames);
      if (match === undefined) return undefined;
      const modifier = hasModifier ? utility.slice(slash) : '';
      return [[...parts, match + modifier].join(':'), [...parts, match].join(':')].find(isValid);
    },
  };
}

function splitVariants(candidate: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < candidate.length; index++) {
    const char = candidate[index];
    if (char === '[' || char === '(') depth++;
    else if (char === ']' || char === ')') depth--;
    else if (char === ':' && depth === 0) {
      parts.push(candidate.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(candidate.slice(start));
  return parts;
}
