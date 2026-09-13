import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'syshouse-agent-educacion-financiera',
    version: '1.0.0',
  });

  registerTools(server);

  return server;
}
