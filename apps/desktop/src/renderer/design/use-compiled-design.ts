import type { Diagnostic, VisionDocument } from '@vision/format';
import { useEffect, useMemo, useState } from 'react';
import { styleKey } from './style-key';
import { tailwindEngine } from './tailwind-engine';

export interface CompiledDesign {
  document: VisionDocument;
  css: string;
}

export function useCompiledDesign(
  document: VisionDocument | null,
  onError: (error: unknown) => void = logCompileError,
): CompiledDesign | null {
  const [compiled, setCompiled] = useState<(CompiledDesign & { key: string }) | null>(null);
  const key = useMemo(() => (document === null ? null : styleKey(document)), [document]);
  const stale = key !== null && key !== compiled?.key;
  useEffect(() => {
    if (document === null || key === null || !stale) return;
    let current = true;
    tailwindEngine
      .css(document)
      .then((css) => {
        if (current) setCompiled({ key, document, css });
      })
      .catch((error: unknown) => {
        if (current) onError(error);
      });
    return () => {
      current = false;
    };
  }, [document, key, stale, onError]);
  return useMemo(() => {
    if (compiled === null || document === null || stale) return compiled;
    return compiled.document === document ? compiled : { document, css: compiled.css };
  }, [compiled, document, stale]);
}

function logCompileError(error: unknown): void {
  console.error('Compiling the design CSS failed:', error);
}

export function useClassWarnings(document: VisionDocument | null): Diagnostic[] {
  const [warnings, setWarnings] = useState<{ diagnostics: Diagnostic[] } | null>(null);
  useEffect(() => {
    if (document === null) return;
    let current = true;
    tailwindEngine
      .classDiagnostics(document)
      .then((diagnostics) => {
        if (current) setWarnings({ diagnostics });
      })
      .catch((error: unknown) => {
        console.error('Checking the design classes failed:', error);
      });
    return () => {
      current = false;
    };
  }, [document]);
  return warnings?.diagnostics ?? [];
}
