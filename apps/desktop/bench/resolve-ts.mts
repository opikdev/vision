import { registerHooks } from 'node:module';

// Node runs TypeScript, but unlike the bundlers it needs the extension on relative imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
  load(url, context, nextLoad) {
    return nextLoad(
      url,
      url.endsWith('.ts') ? { ...context, format: 'module-typescript' } : context,
    );
  },
});
