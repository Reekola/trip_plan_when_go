export const VERTEX_CONFIG = {
  project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  location: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  agentId: process.env.VERTEX_AI_AGENT_ID!,
  model: 'gemini-3-flash-preview',
};

export function getAgentEndpoint(): string {
  const { project, location, agentId } = VERTEX_CONFIG;
  return `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/reasoningEngines/${agentId}`;
}

export async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error('Failed to obtain access token');
  return tokenResponse.token;
}

export interface AgentMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
}
