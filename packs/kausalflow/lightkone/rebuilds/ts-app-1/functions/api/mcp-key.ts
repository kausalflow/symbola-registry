// Cloudflare Pages Function: /api/mcp-key (see server/mcp-key.ts).
import { mcpKey, type McpEnv } from "../../server/mcp-key.ts";

export const onRequest = ({ request, env }: { request: Request; env: McpEnv }) => mcpKey(request, env);
