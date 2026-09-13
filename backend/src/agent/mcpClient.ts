import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = process.env.MCP_URL || 'http://localhost:8000/mcp';

async function conMcpClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: 'syshouse-agent-backend', version: '1.0.0' });

  try {
    await client.connect(transport);
    return await fn(client);
  } finally {
    await client.close();
  }
}

/**
 * Wrapper delgado sobre el cliente MCP oficial: abre una conexión nueva por
 * llamada (el servidor `mcp/` es stateless, así que no hay sesión que
 * reutilizar) y devuelve el resultado ya parseado como JSON.
 */
export async function llamarHerramientaMcp<T = unknown>(
  tool: string,
  args: Record<string, unknown>
): Promise<{ data: T; isError: boolean }> {
  return conMcpClient(async (client) => {
    const result = await client.callTool({ name: tool, arguments: args });

    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    const text = content?.[0]?.text ?? '{}';

    return { data: JSON.parse(text) as T, isError: Boolean(result.isError) };
  });
}

export type HerramientaMcp = {
  name: string;
  description?: string;
  input_schema: { type: 'object'; properties?: unknown; required?: string[] | null; [k: string]: unknown };
};

/**
 * Lista las tools reales de `mcp/` en el formato que espera el `tools` de la
 * Anthropic Messages API — ambos son JSON Schema, así que el `inputSchema`
 * de MCP se reutiliza tal cual como `input_schema` de Claude.
 */
export async function listarHerramientasMcp(): Promise<HerramientaMcp[]> {
  return conMcpClient(async (client) => {
    const { tools } = await client.listTools();
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as HerramientaMcp['input_schema'],
    }));
  });
}
