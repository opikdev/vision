import type { CallToolResult } from '@modelcontextprotocol/server';

export function textResult(
  text: string,
  structuredContent?: Record<string, unknown>,
): CallToolResult {
  const content: CallToolResult['content'] = [{ type: 'text', text }];
  return structuredContent === undefined ? { content } : { content, structuredContent };
}

export function errorResult(text: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text }] };
}

export function imageResult(text: string, png: Buffer): CallToolResult {
  return {
    content: [
      { type: 'text', text },
      { type: 'image', data: png.toString('base64'), mimeType: 'image/png' },
    ],
  };
}
