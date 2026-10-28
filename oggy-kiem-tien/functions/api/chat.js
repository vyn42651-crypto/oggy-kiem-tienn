import { json, readJson, rateLimit, originAllowed } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) return json({ error: "Nguồn gửi yêu cầu không được phép." }, 403);
  if (!env.AI_API_KEY) return json({ error: "AI_API_KEY chưa được cấu hình trong Cloudflare Pages." }, 503);

  const limited = await rateLimit(request, env, "chat", 12, 60);
  if (!limited.allowed) return json({ error: "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau một phút." }, limited.error ? 503 : 429);

  const parsed = await readJson(request, 10_000);
  if (parsed.error) return json({ error: parsed.error }, parsed.status);
  const message = typeof parsed.value.message === "string" ? parsed.value.message.trim() : "";
  if (!message || message.length > 4000) return json({ error: "Tin nhắn trống hoặc vượt quá 4.000 ký tự." }, 400);

  const endpoint = env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
  let url;
  try { url = new URL(endpoint); } catch { return json({ error: "AI_API_URL không hợp lệ." }, 500); }
  if (url.protocol !== "https:") return json({ error: "AI_API_URL phải dùng HTTPS." }, 500);

  try {
    const upstream = await fetch(url.toString(), {
      method: "POST",
      headers: { authorization: `Bearer ${env.AI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.AI_MODEL || "gpt-4o-mini",
        temperature: 0.6,
        max_tokens: 700,
        messages: [
          { role: "system", content: "Bạn là OGGY Assistant, trợ lý tiếng Việt giúp người dùng phát triển ý tưởng sản phẩm số, nội dung và tự động hóa hợp pháp. Trả lời thực tế, ngắn gọn, không hứa hẹn thu nhập, không bịa số liệu hay khẳng định lợi nhuận. Nêu rủi ro và khuyến khích kiểm chứng nhu cầu. Không yêu cầu thông tin nhạy cảm." },
          { role: "user", content: message }
        ]
      }),
      signal: AbortSignal.timeout(25_000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: "Nhà cung cấp AI trả lỗi. Kiểm tra API key, model và hạn mức." }, 502);
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return json({ error: "AI chưa trả về nội dung." }, 502);
    return json({ reply: reply.trim() });
  } catch {
    return json({ error: "Không thể kết nối nhà cung cấp AI hoặc yêu cầu đã hết thời gian." }, 502);
  }
}
