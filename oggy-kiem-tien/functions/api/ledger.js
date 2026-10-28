import { json } from "../_shared/security.js";

// Financial rows may contain private business information. Public reads are off by default.
// Enable PUBLIC_LEDGER="true" only if the operator intentionally wants to publish these rows.
export async function onRequestGet({ env }) {
  if (env.PUBLIC_LEDGER !== "true") return json({ error: "Sổ giao dịch không được công khai." }, 404);
  if (!env.DB) return json({ error: "D1 chưa được cấu hình." }, 503);
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, date, title, type, amount, status FROM transactions ORDER BY date DESC LIMIT 200"
    ).all();
    return json({ transactions: results });
  } catch {
    return json({ error: "Không đọc được sổ giao dịch." }, 500);
  }
}
