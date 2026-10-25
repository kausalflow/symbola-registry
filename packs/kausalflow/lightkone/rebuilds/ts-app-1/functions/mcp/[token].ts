// Cloudflare Pages Function: /mcp/<token> (see server/mcp.ts).
import { mcp } from "../../server/mcp.ts";
import type { McpEnv } from "../../server/mcp-key.ts";

export const onRequest = ({ request, env, params }: { request: Request; env: McpEnv; params: { token: string } }) => mcp(request, env, params.token);
