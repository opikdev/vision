import type { Diagnostic, VisionDocument } from '@vision/format';
import { useEffect, useState } from 'react';
import { tailwindEngine } from './tailwind-engine';

export interface CompiledDesign {
  document: VisionDocument;
  css: string;
}

export function useCompiledDesign(
  document: VisionDocument | null,
  onError: (error: unknown) => void = logCompileError,
): CompiledDesign | null {
  const [compiled, setCompiled] = useState<CompiledDesign | null>(null);
  useEffect(() => {
    if (document === null) return;
    let current = true;
    tailwindEngine
      .css(document)
      .then((css) => {
        if (current) setCompiled({ document, css });
      })
      .catch((error: unknown) => {
        if (current) onError(error);
      });
    return () => {
      current = false;
    };
  }, [document, onError]);
  return compiled;
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
