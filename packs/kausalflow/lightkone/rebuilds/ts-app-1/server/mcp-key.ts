// The site's MCP key: browsers encrypt the storage settings in an MCP
// address with its public half; only the site holds the private half
// (the MCP_PRIVATE_KEY secret, a P-256 ECDH private JWK).

export interface McpEnv {
  MCP_PRIVATE_KEY?: string;
}

export function privateJwk(env: McpEnv): JsonWebKey | null {
  if (!env.MCP_PRIVATE_KEY) return null;
  return JSON.parse(env.MCP_PRIVATE_KEY) as JsonWebKey;
}

export function mcpKey(_req: Request, env: McpEnv): Response {
  const jwk = privateJwk(env);
  if (!jwk) return Response.json({ error: "This site has no MCP key (set MCP_PRIVATE_KEY)." }, { status: 404 });
  const { d: _d, ...pub } = jwk;
  return Response.json({ ...pub, key_ops: [] }, { headers: { "cache-control": "public, max-age=3600" } });
}

/** Prints a new key for `wrangler pages secret put MCP_PRIVATE_KEY`. */
export async function newMcpKey(): Promise<string> {
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d });
}
