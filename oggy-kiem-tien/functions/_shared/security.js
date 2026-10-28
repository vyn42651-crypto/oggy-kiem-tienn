export function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", ...extraHeaders },
  });
}

export async function readJson(request, maxBytes = 12_000) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: "Content-Type phải là application/json.", status: 415 };
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) return { error: "Nội dung gửi lên quá lớn.", status: 413 };
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { error: "Nội dung gửi lên quá lớn.", status: 413 };
  }
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { error: "Dữ liệu JSON phải là một đối tượng.", status: 400 };
    }
    return { value };
  } catch {
    return { error: "JSON không hợp lệ.", status: 400 };
  }
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Optional D1-backed rate limit. Stores only a one-way digest, not the raw IP.
// If D1 is not bound, the API remains in demo mode; configure D1 for shared limits.
export async function rateLimit(request, env, bucket, limit, windowSeconds = 60) {
  if (!env.DB) return { allowed: true, configured: false };
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = await digest(`${bucket}:${ip}`);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  try {
    const result = await env.DB.prepare(
      `INSERT INTO rate_limits (bucket_key, window_start, hits) VALUES (?, ?, 1)
       ON CONFLICT(bucket_key, window_start) DO UPDATE SET hits = hits + 1
       RETURNING hits`
    ).bind(key, windowStart).first();
    // Periodically prune old windows without keeping a long history.
    if (now % 31 < 2) {
      await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
        .bind(now - Math.max(windowSeconds * 4, 3600)).run();
    }
    return { allowed: Number(result?.hits || 0) <= limit, configured: true };
  } catch {
    // Fail closed when a configured limiter is broken.
    return { allowed: false, configured: true, error: true };
  }
}

export function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // CLI/server-to-server requests may omit Origin.
  const requestUrl = new URL(request.url);
  const allowed = new Set([requestUrl.origin]);
  if (env.SITE_ORIGIN) allowed.add(env.SITE_ORIGIN.replace(/\/$/, ""));
  return allowed.has(origin);
}
