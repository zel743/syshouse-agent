import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = process.env.MCP_URL || 'http://localhost:8000/mcp';

/**
 * Wrapper delgado sobre el cliente MCP oficial: abre una conexión nueva por
 * llamada (el servidor `mcp/` es stateless, así que no hay sesión que
 * reutilizar) y devuelve el resultado ya parseado como JSON.
 */
export async function llamarHerramientaMcp<T = unknown>(
  tool: string,
  args: Record<string, unknown>
): Promise<{ data: T; isError: boolean }> {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: 'syshouse-agent-backend', version: '1.0.0' });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: tool, arguments: args });

    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    const text = content?.[0]?.text ?? '{}';

    return { data: JSON.parse(text) as T, isError: Boolean(result.isError) };
  } finally {
    await client.close();
  }
}
