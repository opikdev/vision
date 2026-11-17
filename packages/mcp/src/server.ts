import { McpServer } from '@modelcontextprotocol/server';
import packageJson from '../package.json' with { type: 'json' };
import { registerReadTools } from './tools/read';
import { registerValidateTool } from './tools/validate';

export const instructions =
  "Vision designs are .vis files that the Vision app draws and redraws on every save. Call get_guide once before your first edit: it explains the format, the HTML that write_html accepts and the Tailwind classes. Always pass file as the absolute path of a .vis file; it doesn't need to exist yet, since the first edit creates it. After building or changing an artboard, check your work with validate and screenshot.";

export function createServer(): McpServer {
  const server = new McpServer({ name: 'vision', version: packageJson.version }, { instructions });
  registerReadTools(server);
  registerValidateTool(server);
  return server;
}
