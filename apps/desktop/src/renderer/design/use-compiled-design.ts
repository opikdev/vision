import type { Diagnostic, VisionDocument } from '@vision/format';
import { useEffect, useMemo, useState } from 'react';
import { designStyle, type DesignStyle } from './style-key';
import { tailwindEngine } from './tailwind-engine';

export interface CompiledDesign {
  document: VisionDocument;
  css: string;
  style: DesignStyle;
}

export function useCompiledDesign(
  document: VisionDocument | null,
  onError: (error: unknown) => void = logCompileError,
): CompiledDesign | null {
  const [compiled, setCompiled] = useState<CompiledDesign | null>(null);
  const style = useMemo(() => (document === null ? null : designStyle(document)), [document]);
  const stale = style !== null && style.key !== compiled?.style.key;
  useEffect(() => {
    if (document === null || style === null || !stale) return;
    let current = true;
    tailwindEngine
      .css(document)
      .then((css) => {
        if (current) setCompiled({ document, css, style });
      })
      .catch((error: unknown) => {
        if (current) onError(error);
      });
    return () => {
      current = false;
    };
  }, [document, style, stale, onError]);
  return useMemo(() => {
    if (compiled === null || document === null || stale) return compiled;
    return compiled.document === document ? compiled : { ...compiled, document };
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
