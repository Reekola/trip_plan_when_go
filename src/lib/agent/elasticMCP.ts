type SearchHit = { _id?: string; _source?: unknown };

const MCP_ENDPOINT = () => process.env.ELASTIC_MCP_ENDPOINT;
const API_KEY = () => process.env.ELASTIC_API_KEY;

let mcpSessionId: string | undefined;

async function mcpRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
  const endpoint = MCP_ENDPOINT();
  if (!endpoint) throw new Error('ELASTIC_MCP_ENDPOINT not set');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `ApiKey ${API_KEY()}`,
    'Accept': 'application/json',
  };
  if (mcpSessionId) headers['mcp-session-id'] = mcpSessionId;

  const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });

  const res = await fetch(endpoint, { method: 'POST', headers, body });

  if (res.headers.get('mcp-session-id')) {
    mcpSessionId = res.headers.get('mcp-session-id')!;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json() as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`MCP error: ${json.error.message}`);
  return json.result;
}

async function ensureInitialized() {
  if (mcpSessionId) return;
  await mcpRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'trip-planner', version: '1.0.0' },
  });
}

export async function mcpSearch(
  index: string,
  query: Record<string, unknown>
): Promise<SearchHit[]> {
  await ensureInitialized();
  const result = await mcpRequest('tools/call', {
    name: 'platform.core.search',
    arguments: { index, body: query },
  }) as { content?: Array<{ text?: string }> };

  const text = result?.content?.[0]?.text;
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as { hits?: { hits?: SearchHit[] } };
    return parsed?.hits?.hits ?? [];
  } catch {
    return [];
  }
}

export async function mcpExecuteESQL(query: string): Promise<unknown> {
  await ensureInitialized();
  const result = await mcpRequest('tools/call', {
    name: 'platform.core.execute_esql',
    arguments: { query },
  }) as { content?: Array<{ text?: string }> };

  const text = result?.content?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function isMCPConfigured(): boolean {
  return !!MCP_ENDPOINT();
}
