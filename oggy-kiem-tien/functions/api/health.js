export async function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    aiConfigured: Boolean(env.AI_API_KEY),
    storageConfigured: Boolean(env.DB),
    rateLimitConfigured: Boolean(env.DB),
    mode: env.DB ? "cloudflare-d1" : "demo-local"
  }, { headers: { "cache-control": "no-store" } });
}
