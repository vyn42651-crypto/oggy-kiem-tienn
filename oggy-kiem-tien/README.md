# OGGY Kiếm Tiền — Cloudflare Pages

Bản starter website tiếng Việt, giao diện tối/xanh neon, responsive, có nhật ký dự án, sổ thu chi minh họa, biểu mẫu yêu cầu, chatbot AI và các trang điều khoản/quyền riêng tư mẫu.

> **Không phải nền tảng tài chính hoặc hệ thống kế toán hoàn chỉnh.** Các số liệu khởi tạo là minh họa; không có cam kết thu nhập. Nhật ký và giao dịch trong trình duyệt vẫn là dữ liệu cục bộ. Không nhập mật khẩu, dữ liệu thanh toán hay thông tin nhạy cảm.

## Những gì đã hoàn thiện trong mã nguồn

- Responsive UI và chế độ sáng/tối.
- Nhật ký và giao dịch demo lưu trong `localStorage`.
- Chatbot gọi nhà cung cấp AI từ Cloudflare Pages Function; khóa API chỉ ở biến bí mật phía máy chủ.
- Biểu mẫu yêu cầu có xác thực đầu vào và lưu vào D1 nếu database được gắn.
- Rate limit D1 theo cửa sổ thời gian cho chat và biểu mẫu; chỉ lưu SHA-256 digest của IP, không lưu IP thô.
- Security headers, CSP, chặn framing, tắt cache cho API.
- API sổ cái công khai tắt mặc định; chỉ bật bằng `PUBLIC_LEDGER=true` nếu thật sự muốn công khai các dòng giao dịch.
- Trang `privacy.html` và `terms.html` là **mẫu cần rà soát**, chưa thay thế tư vấn pháp lý.

## 1. Chạy thử trên máy

Yêu cầu Node.js 20+.

```bash
npm install
npm run check
npm run dev
```

Mở URL local do Wrangler in ra. Không mở `index.html` bằng `file://` nếu muốn thử các API.

## 2. Tạo D1 và gắn vào Pages

1. Cloudflare Dashboard → **Storage & databases → D1 SQL Database** → tạo database `oggy-kiem-tien-db`.
2. Mở Console của database, chạy toàn bộ nội dung `schema.sql`.
3. Vào **Workers & Pages → project → Settings → Functions → D1 database bindings**, thêm binding tên chính xác `DB` trỏ tới database vừa tạo.
4. Nếu dùng Wrangler CLI, điền `database_id` thật vào `wrangler.toml` và bỏ comment phần `[[d1_databases]]`.
5. Redeploy. Nếu D1 đã gắn mà chưa chạy `schema.sql`, bộ giới hạn tốc độ có thể từ chối yêu cầu; hãy kiểm tra bảng `rate_limits`.

D1 lưu biểu mẫu yêu cầu và hỗ trợ rate limiting. Giao dịch trên giao diện hiện **chưa đồng bộ** vào D1, vì vậy vẫn chỉ là demo cục bộ. Không bật API sổ cái công khai nếu bảng có dữ liệu riêng tư.

## 3. Cấu hình chatbot AI

Trong Cloudflare Pages → project → **Settings → Variables and Secrets**, tạo các biến sau ở môi trường Production (và Preview nếu cần):

- `AI_API_KEY` — tạo dạng **Secret**, không commit vào Git.
- `AI_MODEL` — tên model mà API key/tài khoản của bạn có quyền dùng; mặc định `gpt-4o-mini`.
- `AI_API_URL` — không bắt buộc; mặc định OpenAI Chat Completions API. Chỉ dùng endpoint HTTPS của nhà cung cấp bạn tin cậy.
- `SITE_ORIGIN` — tùy chọn, ví dụ `https://ten-site.pages.dev`, để cho phép đúng origin khi cần.

Không bao giờ đặt API key trong `app.js`, HTML, `localStorage`, hoặc biến có thể đọc từ trình duyệt. API key AI có thể phát sinh chi phí theo mức sử dụng; hãy đặt hạn mức ở nhà cung cấp.

## 4. Triển khai Cloudflare Pages

### Khuyên dùng: kết nối Git

1. Tạo repository riêng và đẩy các file trong thư mục dự án lên Git.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Chọn repository.
4. Build command: để trống; Build output directory: `.`.
5. Cấu hình D1 và Secrets theo các phần trên rồi deploy.

### Dùng Wrangler CLI

```bash
npm install
npx wrangler login
npm run check
npm run deploy
```

Bạn phải tự xác thực Cloudflare bằng tài khoản của mình. Tôi không thể triển khai vào tài khoản của bạn hoặc tạo bí mật API từ cuộc trò chuyện này.

## 5. API hiện có

- `GET /api/health` — trạng thái cấu hình, không trả về bí mật.
- `POST /api/chat` — gửi `{ "message": "..." }`; cần `AI_API_KEY`.
- `POST /api/requests` — gửi `{ "name": "...", "email": "...", "details": "..." }`.
- `GET /api/ledger` — tắt mặc định; chỉ đọc tối đa 200 dòng khi `PUBLIC_LEDGER=true` và D1 đã cấu hình.

## 6. Trước khi đưa vào vận hành công khai

- Rà soát `privacy.html`/`terms.html`, thêm email liên hệ và chính sách lưu/xóa dữ liệu phù hợp.
- Thử trong cả Preview và Production: `/api/health`, chat AI, gửi form, kiểm tra dữ liệu D1 và hành vi khi AI/D1 lỗi.
- Bật Cloudflare Turnstile hoặc biện pháp chống bot phù hợp nếu form bị spam; rate limiting D1 hiện là lớp cơ bản, không thay thế WAF/anti-abuse chuyên dụng.
- Không có trang quản trị, đăng nhập người dùng, thanh toán, hoặc API tạo/sửa/xóa giao dịch trên máy chủ trong phiên bản này. Cần thiết kế và kiểm tra riêng trước khi lưu dữ liệu tài chính thật.
- Thiết lập sao lưu D1, theo dõi chi phí AI, và quy trình xử lý yêu cầu xóa dữ liệu.

## Cấu trúc chính

```text
index.html             Giao diện chính
styles.css             Giao diện và responsive
app.js                 Tương tác phía trình duyệt
privacy.html            Mẫu thông báo quyền riêng tư
terms.html              Mẫu điều khoản
_headers                Security headers cho Pages
functions/_middleware.js Security headers cho Functions
functions/_shared/security.js xác thực đầu vào, origin, rate limit
functions/api/chat.js   Chatbot AI
functions/api/requests.js Form yêu cầu + D1
functions/api/ledger.js  Sổ cái (tắt công khai mặc định)
schema.sql              Bảng D1
wrangler.toml           Cấu hình Cloudflare Pages
```
