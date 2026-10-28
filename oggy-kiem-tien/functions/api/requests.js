import { json, readJson, rateLimit, originAllowed } from "../_shared/security.js";

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json({ error: "Nguồn gửi yêu cầu không được phép." }, 403);
  const limited = await rateLimit(request, env, "requests", 5, 3600);
  if (!limited.allowed) return json({ error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." }, limited.error ? 503 : 429);

  const parsed = await readJson(request, 8_000);
  if (parsed.error) return json({ error: parsed.error }, parsed.status);
  const { name, email, details } = parsed.value;
  const safeName = clean(name, 80), safeEmail = clean(email, 160), safeDetails = clean(details, 2000);
  if (!safeName || !safeEmail || !safeDetails || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    return json({ error: "Vui lòng cung cấp tên, email hợp lệ và mô tả yêu cầu." }, 400);
  }
  if (/[\r\n]/.test(safeEmail)) return json({ error: "Email không hợp lệ." }, 400);

  const id = "OG-" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  if (!env.DB) return json({ id, mode: "demo", note: "Chưa cấu hình D1; yêu cầu chưa được lưu trên máy chủ." }, 202);
  try {
    await env.DB.prepare("INSERT INTO requests (id, name, email, details, created_at, status) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, safeName, safeEmail, safeDetails, new Date().toISOString(), "new").run();
    return json({ id, status: "received" }, 201);
  } catch {
    return json({ error: "Không lưu được yêu cầu. Vui lòng thử lại sau." }, 500);
  }
}
