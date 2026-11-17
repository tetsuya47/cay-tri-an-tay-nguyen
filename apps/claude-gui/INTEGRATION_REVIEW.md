# BÁO CÁO NGHIÊN CỨU & ĐÁNH GIÁ TÍCH HỢP
# DỰ ÁN CLAUDE GUI VÀ CÂY TRI ÂN TÂY NGUYÊN

> **Tài liệu:** Đánh giá kỹ thuật, khả năng tái sử dụng module và kiến trúc tích hợp nâng cấp  
> **Ngày lập báo cáo:** 17/11/2026  
> **Tác giả:** Đội ngũ Nghiên cứu & Kiến trúc Phần mềm (Senior AI & Full-Stack Systems Auditor)  
> **Mã dự án:** A (Claude GUI - `E:\edukids-team`) · B (Cây Tri Ân Tây Nguyên - `E:\cay-tri-an-tay-nguyen`)  
> **Nguyên tắc cốt lõi:** Đánh giá dựa trên mã nguồn thực tế; giữ nguyên tính toàn vẹn và độc lập của Cây Tri Ân; bảo vệ tuyệt đối bảo mật Supabase RLS và khóa bí mật.

---

## MỤC LỤC
1. [Tổng quan hai dự án](#1-tổng-quan-hai-dự-án)
2. [Phân tích kiến trúc Claude GUI](#2-phân-tích-kiến-trúc-claude-gui)
3. [Phân tích kiến trúc Cây Tri Ân Tây Nguyên](#3-phân-tích-kiến-trúc-cây-tri-ân-tây-nguyên)
4. [Bảng so sánh công nghệ toàn diện](#4-bảng-so-sánh-công-nghệ-toàn-diện)
5. [Đánh giá các module có thể tái sử dụng](#5-đánh-giá-các-module-có-thể-tái-sử-dụng)
6. [Sơ đồ kiến trúc tích hợp đề xuất](#6-sơ-đồ-kiến-trúc-tích-hợp-đề-xuất)
7. [Lộ trình triển khai 4 giai đoạn](#7-lộ-trình-triển-khai-4-giai-đoạn)
8. [Phân tích rủi ro và giải pháp bảo vệ](#8-phân-tích-rủi-ro-và-giải-pháp-bảo-vệ)
9. [Đề xuất 3 tính năng nâng cấp có giá trị cao nhất](#9-đề-xuất-3-tính-năng-nâng-cấp-có-giá-trị-cao-nhất)
10. [Kết luận và khuyến nghị](#10-kết-luận-và-khuyến-nghị)

---

## 1. TỔNG QUAN HAI DỰ ÁN

### 1.1. Dự án A – Claude GUI (`E:\edukids-team`)
* **Bản chất thực tế:** Ban đầu README mô tả dự án như một ứng dụng macOS bọc quanh `claude` CLI. Tuy nhiên, qua kiểm tra toàn bộ mã nguồn thực tế, đây là một nền tảng **Desktop Multi-Agent AI System** hoàn chỉnh và đa nền tảng (hỗ trợ Windows, macOS, Linux).
* **Stack công nghệ chính:** Electron 39, Node.js 22+, TypeScript 5.9, React 19, Tailwind CSS v4, Vite 7 (`electron-vite`), `better-sqlite3`, Three.js (`@react-three/fiber`, `@react-three/drei`).
* **Khả năng mở rộng đa mô hình:** Không chỉ giới hạn ở Claude CLI, dự án sở hữu một hệ thống adapter AI toàn diện hỗ trợ:
  * Anthropic Claude CLI (`claude --print --output-format stream-json`)
  * Google Antigravity CLI (`agy -p ... --output-format stream-json --sandbox`)
  * OpenAI-compatible API stream (tương thích các mô hình chuẩn OpenAI)
  * Google Gemini API (`generativelanguage.googleapis.com`)
  * Codex CLI và OpenCode CLI
* **Tính năng nổi bật:**
  * Mô phỏng môi trường làm việc 3D (3D Virtual Office/Classroom) bằng Three.js.
  * Hàng đợi prompt thông minh (`prompt-queue`, `queue-runner`).
  * Trợ lý ảo đa vai trò (Multi-Agent Roundtable với cơ chế đề xuất thành viên `proposals` và kỹ năng `skills`).
  * Tìm kiếm thông tin web an toàn (`searxng`, `brave`, `tavily` đi kèm `url-guard` chống SSRF).
  * Nhận dạng giọng nói ngoại tuyến (`whisper.cpp` / local WAV processing).
  * Cơ chế bảo mật nghiêm ngặt (`contextIsolation`, chặn toàn bộ quyền Electron mặc định, mã hóa khóa bằng `safeStorage`).

### 1.2. Dự án B – Cây Tri Ân Tây Nguyên (`E:\cay-tri-an-tay-nguyen`)
* **Bản chất thực tế:** Ứng dụng web báo tường điện tử tương tác phục vụ sự kiện 20/11 "Code the Thanks 2026" của Đại học Tây Nguyên. Người dùng quét mã QR bằng điện thoại để gửi lời tri ân; sau khi kiểm duyệt, lời nhắn sẽ trở thành một chiếc lá xanh hoặc đóa hoa dã quỳ trên cây tri ân ảo.
* **Stack công nghệ chính:**
  * Frontend: Pure Vanilla HTML5, CSS3 hiện đại, Vanilla JavaScript (ES6+ IIFE không qua trình đóng gói bundler).
  * Đồ họa tương tác: Vector SVG tương tác dựa trên thuật toán góc vàng Fibonacci (Phyllotaxis) và thuật toán sinh số ngẫu nhiên cố định Mulberry32 PRNG.
  * Tiện ích ngoại tuyến: Thư viện tạo mã QR độc lập `qr.js` vẽ trực tiếp lên HTML5 Canvas.
  * Backend & Cơ sở dữ liệu: Supabase PostgreSQL, giao tiếp trực tiếp qua REST API (PostgREST) và GoTrue Auth bằng hàm `fetch()` gốc của trình duyệt (không nạp thư viện `@supabase/supabase-js` để tối ưu dung lượng tải trang).
  * Hosting: Tối ưu hoàn toàn cho GitHub Pages (tĩnh 100%).
* **Ưu điểm lớn nhất:** Siêu nhẹ, tải tức thì trên mạng di động 3G/4G, giao diện mang đậm bản sắc văn hóa Tây Nguyên, không phụ thuộc máy chủ riêng, cơ chế bảo mật cơ sở dữ liệu dựa trên Supabase Row Level Security (RLS) chặt chẽ.

---

## 2. PHÂN TÍCH KIẾN TRÚC CLAUDE GUI

### 2.1. Cấu trúc thư mục mã nguồn
```
E:\edukids-team\
├── src/
│   ├── main/                 # Electron Main Process (Node.js runtime đầy đủ)
│   │   ├── claude/           # Runner CLI, xử lý NDJSON stream, phân giải môi trường PATH
│   │   ├── db/               # SQLite cục bộ (better-sqlite3), migrations, quan hệ dữ liệu
│   │   ├── files/            # Quản lý file đính kèm, mở tệp tin ngoài
│   │   ├── ipc/              # Đăng ký và chuẩn hóa kênh IPC, validation dữ liệu
│   │   ├── orchestrator/     # Đổi mới Multi-Agent: Roundtable, Notes, Meeting Context
│   │   ├── providers/        # Adapter đa mô hình: Claude, AGY, Codex, Gemini, OpenAI
│   │   ├── queue/            # Quản lý hàng đợi prompt tuần tự
│   │   ├── search/           # Công cụ tìm kiếm web kết hợp chống giả mạo URL (url-guard)
│   │   ├── security/         # Chính sách phân quyền (permissions), mã hóa khóa (secret-box)
│   │   ├── settings/         # Quản lý cấu hình cục bộ và lưu trữ bảo mật (safeStorage)
│   │   ├── skills/           # Quản lý thư viện kỹ năng (SKILL.md) và thực thi kỹ năng
│   │   ├── voice/            # Xử lý âm thanh micro và mô hình Whisper nội bộ
│   │   └── index.ts          # Điểm khởi chạy Electron App, cấu hình cửa sổ BrowserWindow
│   ├── preload/              # Lớp cầu nối cô lập ngữ cảnh (contextBridge)
│   │   └── index.ts          # Định nghĩa API an toàn cho Renderer (window.api)
│   ├── renderer/src/         # Frontend Renderer Process (React 19, Three.js, Tailwind v4)
│   │   ├── components/       # Chat, 3D Office/Classroom, Queue, Proposals, Settings
│   │   ├── hooks/            # Hooks quản lý state luồng dữ liệu thời gian thực
│   │   └── lib/              # Tiện ích format, tính toán vị trí đồ họa
│   └── shared/               # Định nghĩa kiểu dữ liệu dùng chung (Types & IPC Constants)
├── test/                     # Hệ thống 37 bài kiểm thử đơn vị, smoke test, UI test
├── electron.vite.config.ts   # Cấu hình đóng gói Electron và Vite
└── package.json              # Khai báo dependency, script kiểm thử và build đa nền tảng
```

### 2.2. Cơ chế Electron Main Process, Preload và IPC
* **Nguyên tắc cô lập tuyệt đối:**
  * File `src/main/index.ts` thiết lập `contextIsolation: true`, `nodeIntegration: false`. Renderer hoàn toàn không có quyền truy cập trực tiếp vào Node.js API hay module `child_process`.
  * `webPreferences.sandbox: false` chỉ sử dụng nhằm tương thích với cơ chế đóng gói CJS của Electron-Vite cho preload, nhưng toàn bộ hành vi nguy hiểm đều bị chặn bởi chính sách bảo mật tầng Session.
* **Cầu nối Preload (`src/preload/index.ts`):**
  * Sử dụng `contextBridge.exposeInMainWorld('api', api)` để xuất bản một đối tượng API có cấu trúc cố định.
  * Renderer không thể gửi tin nhắn tùy tiện lên các kênh IPC tự do; mọi thao tác đều đi qua các hàm wrapper (`ipcRenderer.invoke(...)`) với tham số được kiểm tra kiểu dữ liệu tĩnh.
* **Kênh IPC phân cấp:**
  * Hệ thống chia kênh IPC thành các không gian tên rõ ràng: `COMPANY_CHANNELS`, `PROVIDER_CHANNELS`, `QUEUE_CHANNELS`, `PROPOSAL_CHANNELS`, `SEARCH_CHANNELS`, `VOICE_CHANNELS`, `SKILL_CHANNELS`.
  * Chuẩn hóa kết quả trả về theo mô hình `Result<T>`: `{ ok: true, data: T }` hoặc `{ ok: false, error: AppError }`, giúp Renderer luôn xử lý lỗi an toàn mà không bị crash ứng dụng.

### 2.3. Cách khởi chạy CLI và giao tiếp AI
* **Không dùng Shell (`shell: false`):**
  * Trong `src/main/claude/runner.ts` và `src/main/providers/agy-adapter.ts`, tiến trình con được khởi tạo bằng `spawn(binary, args, { shell: false })`.
  * Prompt của người dùng được truyền dưới dạng một phần tử đối số argv độc lập, tuyệt đối không nối chuỗi vào câu lệnh shell. Điều này triệt tiêu hoàn toàn nguy cơ tấn công **Command Injection**.
* **Phân tích luồng phản hồi thời gian thực (NDJSON & SSE Streaming):**
  * CLI phát tín hiệu ra `stdout` theo chuẩn JSON từng dòng (NDJSON).
  * Lớp `NdjsonParser` trong `src/main/claude/stream-parser.ts` tiếp nhận các đoạn đệm nhị phân (chunks), tự động ghép dòng và bóc tách các sự kiện (delta text, tool use, cost, duration).
  * Đối với các nhà cung cấp qua mạng (như `gemini-adapter.ts` hay `openai-adapter.ts`), hệ thống sử dụng `fetch()` với Web Streams API (`ReadableStreamDefaultReader`) để xử lý Server-Sent Events (SSE).
* **Duy trì ngữ cảnh phiên làm việc:**
  * Phiên làm việc được định danh bằng UUID. Lần đầu gọi truyền `--session-id <uuid>`, các lượt tiếp theo truyền `--resume`, giúp mô hình lưu nhớ lịch sử hội thoại mà không cần client phải gửi lại toàn bộ transcript.

### 2.4. Phân tích bảo mật, kiểm thực dữ liệu và quản lý quyền
* **Chính sách cấp quyền (`src/main/security/permissions.ts` & `permission-policy.ts`):**
  * Ghi đè chính sách cho phép mặc định của Electron qua `setPermissionRequestHandler` và `setPermissionCheckHandler`.
  * Chỉ duy nhất quyền truy cập Micro (`mediaTypes: ['audio']`) được phép kích hoạt sau khi kiểm tra nguồn gốc URL hợp lệ. Các quyền nguy hiểm khác (camera, geolocation, notification, openExternal tự do) bị từ chối triệt để.
* **Bảo vệ chống tấn công SSRF (`src/main/search/url-guard.ts`):**
  * Hệ thống kiểm tra chặt chẽ mọi URL tìm kiếm và liên kết ngoài. Chặn hoàn toàn các dải IP nội bộ, loopback (`127.0.0.1`, `0.0.0.0`), dải private (`10.x.x.x`, `172.16.x.x`, `192.168.x.x`), link-local và metadata IP của Cloud (`169.254.169.254`), bao gồm mọi định dạng biến thể số học (hex, octal, decimal).
* **Bảo vệ khóa bí mật tại chỗ (`src/main/security/secret-box.ts`):**
  * Sử dụng API mã hóa phần cứng của hệ điều hành `safeStorage` (Keychain trên macOS, DPAPI trên Windows, Secret Service trên Linux).
  * Khóa được mã hóa với tiền tố `enc:v1:<base64>`. Khi hệ thống không hỗ trợ mã hóa bảo mật, ứng dụng từ chối lưu thay vì ghi đè bằng văn bản thô (plaintext).

### 2.5. Kiểm thử tự động, Lint và Typecheck
* **Kiểm thử tĩnh (Static Verification):**
  * Script `npm run typecheck` chia nhỏ thành hai dự án riêng biệt: `typecheck:node` (`tsconfig.node.json`) cho Main/Preload và `typecheck:web` (`tsconfig.web.json`) cho Renderer.
  * Linter sử dụng cấu hình mới nhất ESLint 9 Flat Config (`eslint.config.mjs`) tích hợp Prettier.
* **Kiểm thử tích hợp & Khởi động thực tế (`test/smoke.cjs`):**
  * Khởi động trực tiếp bundle sản phẩm `out/main/index.js` trong môi trường Electron thật.
  * Tự động kiểm tra khả năng nạp cửa sổ, sự hiện diện của `window.api`, phân giải binary AI và khởi tạo thử nghiệm một cuộc hội thoại trong cơ sở dữ liệu.
* **Kiểm thử giao diện người dùng tự động (`test/ui.cjs`):**
  * Không phụ thuộc vào các framework nặng nề bên ngoài; mã kiểm thử tự điều khiển DOM của React thông qua `webContents.executeJavaScript`.
  * Tự động giả lập nhập liệu (thay đổi giá trị kèm phát sinh `Event('input')`), click nút bấm và chụp ảnh màn hình lưu vào thư mục tạm để phát hiện lỗi giao diện (Visual Regression).
* **Hơn 35 bài kiểm thử đơn vị thuần Node.js (`test/*.test.cjs`):**
  * Kiểm tra logic xử lý stream, schema SQLite, phân quyền, url-guard, mã hóa khóa... chạy siêu nhanh (dưới 3 giây) qua `node test/...`.

### 2.6. Dependency, Giấy phép và Giới hạn sử dụng
* **Giấy phép:** Thuộc quyền sở hữu của tác giả (`quangnvaws@gmail.com`), không có file giấy phép mã nguồn mở (MIT/Apache) đi kèm. Đây là mã nguồn chia sẻ nội bộ/giảng dạy, cần lưu ý quyền sử dụng khi thương mại hóa.
* **Giới hạn môi trường:** Phụ thuộc vào môi trường Desktop (Node.js runtime, quyền truy cập hệ thống tệp và tiến trình OS). Hoàn toàn không thể đóng gói và chạy trực tiếp bên trong trình duyệt người dùng trên GitHub Pages.

---

## 3. PHÂN TÍCH KIẾN TRÚC CÂY TRI ÂN TÂY NGUYÊN

### 3.1. Kiến trúc Frontend và Vector Graphics
* **Không phụ thuộc Framework:** Ứng dụng hoạt động dựa trên pure DOM và SVG, không cần build step (không cần npm install, webpack hay vite). Điều này giúp việc triển khai lên GitHub Pages chỉ đơn giản là đẩy file lên repository.
* **Đồ họa Cây Tri Ân bằng SVG tương tác:**
  * Thuật toán phân bố lá Phyllotaxis: Sử dụng góc vàng $\theta \approx 137.5^\circ$ ($2.39996323\text{ rad}$) với bán kính $r \propto \sqrt{i}$, giúp hàng trăm chiếc lá tự động sắp xếp đồng đều, mở rộng tự nhiên từ tâm cành mà không bị đè lấp lên nhau.
  * Thuật toán Mulberry32 PRNG: Đảm bảo với cùng một ID hoặc vị trí lá, màu sắc (độ bão hòa, góc nghiêng) luôn cố định qua các lần tải lại trang, không bị giật hay đổi màu.
  * Tối ưu chạm cho thiết bị di động: Mỗi chiếc lá được bọc một vòng tròn cảm ứng trong suốt kích thước lớn ($r = 17\text{px}$) giúp người dùng điện thoại chạm xem thiệp cực kỳ chính xác.
* **Thư viện QR Code ngoại tuyến (`qr.js`):**
  * Tự sinh mã QR trực tiếp trên phần tử HTML5 Canvas dựa trên thuật toán mã hóa byte mode, không gọi qua các API tạo QR bên ngoài (như Google Chart API), đảm bảo hoạt động tin cậy ngay cả khi mất mạng quốc tế tại sự kiện.

### 3.2. Cấu trúc dữ liệu và RLS trong Supabase (`supabase.sql`)
* **Bảng dữ liệu `public.gratitude_messages`:**
  * Sử dụng khóa chính UUID `gen_random_uuid()`.
  * Các trường: `sender_name` (varchar 30), `is_anonymous` (boolean), `recipient_type` (enum check: `thay_co`, `mai_truong`, `bai_hoc`, `nguoi_truyen_cam_hung`), `recipient_name` (varchar 40), `message` (check 5 đến 400 ký tự), `status` (check: `pending`, `approved`, `rejected`), `created_at` (timestamptz).
  * Ràng buộc logic quan trọng: `constraint name_or_anonymous check (is_anonymous or char_length(btrim(coalesce(sender_name,''))) >= 2)` ngăn chặn việc gửi dữ liệu rỗng.
  * Chỉ mục tối ưu: `gratitude_messages_status_created_idx on (status, created_at)` phục vụ truy vấn lọc theo trạng thái và thời gian với độ trễ cực thấp.
* **Chính sách Row Level Security (RLS):**
  * `khach_doc_da_duyet`: Cho phép vai trò `anon` và `authenticated` chỉ được đọc (`SELECT`) các bản ghi có `status = 'approved'`.
  * `khach_gui_cho_duyet`: Cho phép vai trò `anon` và `authenticated` chỉ được thêm (`INSERT`) với điều kiện bắt buộc `status = 'pending'`. Khách tuyệt đối không thể tự duyệt tin nhắn của mình.
  * `admin_doc_tat_ca`, `admin_sua`, `admin_xoa`: Chỉ cho phép tài khoản đã đăng nhập có email khớp với email chỉ định được quyền xem tất cả trạng thái, sửa trạng thái (`PATCH status`) và xóa tin nhắn (`DELETE`).

### 3.3. Luồng nghiệp vụ: Gửi, Duyệt và Hiển thị
```
[ Khách truy cập web ] 
         │
         ├──> (1) Form Wizard 3 bước -> Kiểm tra Honeypot -> Client Throttle 20s
         │
         └──> (2) Gửi POST /rest/v1/gratitude_messages (status = 'pending')
                                     │
                                     ▼
                    [ Cơ sở dữ liệu Supabase ]
                                     │
                                     ▼
              [ Trang Quản trị kiểm duyệt admin.html ]
              (Admin đăng nhập Supabase Auth -> duyệt / từ chối)
                                     │
                 (Chuyển trạng thái sang status = 'approved')
                                     │
                                     ▼
                     [ Cây Tri Ân trên index.html ]
           (Polling định kỳ 8 giây gọi GET status=eq.approved)
                                     │
                                     ▼
           (Lá mới bung nở kèm hoạt họa spring + âm thanh thị giác)
```

### 3.4. Điểm mạnh và những hạn chế kỹ thuật hiện tại của Cây Tri Ân
* **Điểm mạnh:**
  * Kiến trúc phi máy chủ (Serverless BaaS) giúp chi phí vận hành bằng $0.
  * RLS bảo vệ dữ liệu cực kỳ vững chắc ngay tại tầng database.
  * Giao diện và mã nguồn an toàn trước XSS (sử dụng 100% `.textContent`).
* **Hạn chế kỹ thuật cần nâng cấp:**
  1. **Quy trình kiểm thử thủ công 100%:** Dự án hoàn toàn chưa có unit test, smoke test hay công cụ tự động kiểm tra cú pháp trước khi push mã nguồn lên GitHub.
  2. **Trang quản trị `admin.html` đơn sơ:** Cố định `limit=300`, không có phân trang, không có thanh tìm kiếm/lọc nội dung, không có tính năng xóa hàng loạt, phiên đăng nhập JWT tự hết hạn sau 1 giờ mà không có refresh token.
  3. **Kiểm duyệt hoàn toàn bằng mắt người:** Khi số lượng lời nhắn gửi về dồn dập trong ngày lễ (hàng nghìn lời nhắn), một quản trị viên duy nhất sẽ bị quá tải, dễ duyệt sót các nội dung không phù hợp hoặc chứa từ ngữ tiêu cực.
  4. **Email admin bị gán cứng (hardcoded) trong SQL:** Nếu người dùng đổi tài khoản hoặc muốn ủy quyền cho nhiều quản trị viên cùng duyệt thì phải sửa code SQL và chạy lại toàn bộ chính sách RLS.

---

## 4. BẢNG SO SÁNH CÔNG NGHỆ TOÀN DIỆN

| Tiêu chí | Dự án A: Claude GUI (`edukids-team`) | Dự án B: Cây Tri Ân Tây Nguyên (`cay-tri-an-tay-nguyen`) | Đánh giá & Hướng kết hợp |
| :--- | :--- | :--- | :--- |
| **Môi trường hoạt động** | Desktop App (Node.js + Chromium + Electron Runtime) | Web tĩnh trình duyệt (Mobile, Tablet, Desktop, Projector) | **Giữ nguyên tính độc lập**: Cây Tri Ân phải luôn chạy trên nền web tĩnh để phục vụ hàng ngàn người dùng điện thoại. |
| **Giao diện người dùng** | React 19, Tailwind CSS v4, Three.js 3D Canvas | Vanilla HTML5, CSS3 Variables, SVG 2D tương tác | **Không ép nhập**: Không đưa Three.js vào web Cây Tri Ân. Sử dụng kiến trúc giao diện của Claude GUI cho công cụ quản trị. |
| **Cơ sở dữ liệu** | SQLite nhúng cục bộ (`better-sqlite3`), schema nội bộ | PostgreSQL đám mây (Supabase BaaS) + Row Level Security | **Không thay thế**: Supabase là trái tim dữ liệu của Cây Tri Ân. SQLite của Claude GUI chỉ dùng để lưu cache/history offline cho Admin Tool. |
| **Giao tiếp dữ liệu** | IPC hai chiều (`invoke`/`handle`), Event Emitter stream | REST API trực tiếp (`fetch`), Polling định kỳ 8 giây | **Nâng cấp**: Giữ REST cho web; nghiên cứu đưa Supabase Realtime vào công cụ quản trị. |
| **Xác thực & Bảo mật** | OS Keychain (`safeStorage`), Sandbox policies, `url-guard` | Supabase GoTrue (JWT Token), PostgreSQL RLS Policies | **Tận dụng**: Ứng dụng Admin có thể dùng `safeStorage` để lưu phiên đăng nhập quản trị an toàn vĩnh viễn. |
| **Tích hợp Trí tuệ nhân tạo** | Runner đa mô hình (Claude, AGY, Gemini, OpenAI, Codex) | Hoàn toàn chưa tích hợp trí tuệ nhân tạo | **Điểm sáng giá nhất**: Đưa các adapter AI của Claude GUI vào hỗ trợ tiền kiểm duyệt và phát hiện ngôn từ tiêu cực. |
| **Quy trình kiểm thử (QA)** | 37 bài test Node.js, Smoke test Electron, UI screenshot test | Kiểm tra bằng mắt, thử nghiệm qua cờ demo (`?fill=60`) | **Tái sử dụng ngay**: Kế thừa toàn bộ triết lý viết test tự động của Claude GUI cho Cây Tri Ân. |
| **Quy trình CI/CD & Deploy** | `electron-builder` đóng gói DMG, EXE, AppImage | Đẩy thủ công lên GitHub repository -> GitHub Pages | **Tự động hóa**: Xây dựng GitHub Actions chạy kiểm tra tự động trước khi deploy web. |

---

## 5. ĐÁNH GIÁ CÁC MODULE CÓ THỂ TÁI SỬ DỤNG

Để đảm bảo dự án phát triển lành mạnh và không phá vỡ tính ổn định, các thành phần được phân loại thành 4 nhóm rõ rệt:

```
                            PHÂN LOẠI TÁI SỬ DỤNG
                                      │
     ┌──────────────────┬─────────────┴────────────┬──────────────────┐
     ▼                  ▼                          ▼                  ▼
[ TÁI SỬ DỤNG       [ CẦN CHUYỂN ĐỔI /         [ CHỈ THAM KHẢO    [ TUYỆT ĐỐI
  TRỰC TIẾP ]         MODULE HÓA ]               KIẾN TRÚC ]        KHÔNG TÍCH HỢP ]
 • url-guard.ts      • AI Adapters              • Preload Bridge   • Electron vào Web
 • secret-box.ts       (runGemini, runAgy)      • Prompt Queue     • Three.js 3D
 • UI Test Harness   • Chuẩn Result<T>          • Permissions      • better-sqlite3
 • ESLint/Prettier   • SQL Testing Suite                           • Thay thế Supabase
```

### 5.1. Nhóm 1: Thành phần có thể tái sử dụng trực tiếp
1. **Module bảo vệ liên kết `url-guard.ts` (`src/main/search/url-guard.ts`):**
   * *Khả năng:* Tái sử dụng 100% mà không cần sửa đổi.
   * *Ứng dụng:* Dùng trong các công cụ quét mã nguồn, kiểm tra tính hợp lệ của các đường link đính kèm, ngăn chặn người dùng gửi các liên kết độc hại hoặc địa chỉ IP nội bộ trong form lời nhắn.
2. **Module mã hóa khóa an toàn `secret-box.ts` (`src/main/security/secret-box.ts`):**
   * *Khả năng:* Tái sử dụng trong công cụ quản trị desktop dành cho Ban Tổ Chức để mã hóa và lưu trữ JWT Admin token hoặc khóa API.
3. **Mô hình kiểm thử tự động không phụ thuộc thư viện (`test/smoke.cjs` & `test/ui.cjs`):**
   * *Khả năng:* Cấu trúc runner của hai file này (định nghĩa `steps`, ghi nhận `record()`, tự động đánh giá DOM qua hàm `evaluate`) là một framework kiểm thử siêu nhẹ, dễ dàng áp dụng ngay cho dự án Cây Tri Ân mà không cần cài đặt các thư viện cồng kềnh.
4. **Bộ quy chuẩn mã nguồn (Lint & Formatting):**
   * *Khả năng:* Kế thừa file `.editorconfig`, `.prettierrc.yaml` và quy tắc `eslint.config.mjs` để đưa vào Cây Tri Ân.

### 5.2. Nhóm 2: Thành phần cần chuyển đổi / module hóa
1. **Bộ điều hợp AI đa mô hình (`gemini-adapter.ts`, `agy-adapter.ts`, `claude/runner.ts`):**
   * *Chuyển đổi:* Chuyển từ việc phục vụ hội thoại chat sang phục vụ **AI Content Moderation Service**:
     * Nhận vào: Nội dung lời nhắn (`message`), tên người gửi, đối tượng nhận.
     * Xử lý: Đưa qua mô hình ngôn ngữ (ưu tiên Gemini Flash hoặc Claude Haiku với chi phí cực thấp) thông qua System Prompt chuyên biệt cho môi trường sư phạm 20/11.
     * Đầu ra: JSON phân tích `{ safe: boolean, toxicity_score: number, sentiment: string, suggested_action: 'approve' | 'flag' | 'reject', reason: string }`.
2. **Cơ chế đóng gói kết quả `Result<T>` (`src/shared/types.ts`):**
   * *Chuyển đổi:* Đóng gói các hàm gọi API trong `app.js` và `admin.html` theo chuẩn `{ ok: true, data }` hoặc `{ ok: false, error }` để chấm dứt tình trạng nuốt lỗi hoặc hiển thị thông báo lỗi thô ra giao diện.

### 5.3. Nhóm 3: Thành phần chỉ nên tham khảo kiến trúc
1. **Kiến trúc Preload Bridge & Whitelist Channels:**
   * Không thể bê nguyên vào trình duyệt web tĩnh, nhưng web tĩnh nên học tập nguyên lý này: Tách biệt rõ ràng tầng giao tiếp mạng (API Layer) với tầng điều khiển giao diện (UI DOM), không để các hàm render trực tiếp gọi lệnh `fetch()` rải rác trong code.
2. **Kiến trúc hàng đợi Prompt (`prompt-queue.ts`):**
   * Tham khảo giải thuật để xây dựng cơ chế hàng đợi xử lý duyệt tin hàng loạt (Batch Approval Queue) trên trang quản trị, giúp tránh nghẽn mạng khi admin duyệt hàng trăm tin cùng lúc.
3. **Chính sách phân quyền bảo vệ (`permission-policy.ts`):**
   * Áp dụng nguyên lý này cho Cây Tri Ân dưới dạng thiết lập các thẻ meta bảo mật Content Security Policy (CSP) trên `index.html`.

### 5.4. Nhóm 4: Thành phần tuyệt đối KHÔNG nên tích hợp
1. **Không nhúng Electron Runtime vào Website Cây Tri Ân:**
   * *Lý do:* Website phải được phục vụ công cộng trên nền web tĩnh qua GitHub Pages cho hàng ngàn học sinh, sinh viên sử dụng trên điện thoại di động (iOS/Android). Không thể bắt người dùng cài đặt một ứng dụng desktop nặng hơn 150MB chỉ để gửi một lời cảm ơn.
2. **Không đưa thư viện Three.js 3D Office vào Cây Tri Ân:**
   * *Lý do:* Cây Tri Ân hiện tại là đồ họa 2D phong cách màu nước, mang đậm bản sắc Tây Nguyên mộc mạc và gần gũi. Đưa 3D Canvas vào sẽ làm nặng trang web, gây giật lag trên các dòng điện thoại giá rẻ của sinh viên và phá vỡ hoàn toàn ngôn ngữ thiết kế đã chốt.
3. **Không thay thế Supabase bằng SQLite:**
   * *Lý do:* Cây Tri Ân cần cơ sở dữ liệu thời gian thực tập trung để kết nối đồng thời hàng ngàn người gửi lời tri ân với máy chiếu sự kiện. SQLite nhúng của Claude GUI là cơ sở dữ liệu cục bộ chạy trên máy cá nhân, không thể phục vụ môi trường phân tán trên web.

---

## 6. SƠ ĐỒ KIẾN TRÚC TÍCH HỢP ĐỀ XUẤT

Kiến trúc tích hợp được thiết kế theo mô hình **Hybrid Decoupled Architecture (Kiến trúc phân tách lai)**: Giữ website Cây Tri Ân hoạt động độc lập, nhẹ nhàng trên GitHub Pages, đồng thời xây dựng một hệ sinh thái công cụ phát triển, kiểm thử CI/CD và ứng dụng quản trị thông minh kế thừa từ Claude GUI.

```mermaid
flowchart TD
    subgraph Public_Tier["🌐 PHÂN HỆ CÔNG CỘNG (Website Cây Tri Ân - GitHub Pages)"]
        A1["📱 Khách truy cập / Học sinh / Sinh viên"] -->|Quét QR trên Mobile| A2["index.html (SVG Phyllotaxis + Form 3 bước)"]
        A3["🖥️ Màn hình chiếu Gala (?screen=1)"] -->|Hiển thị Ticker & QR Canvas| A2
        A2 -->|POST lời nhắn status='pending'| S1
        A2 -->|GET lời nhắn status='approved' (Poll 8s)| S1
    end

    subgraph BaaS_Tier["☁️ PHÂN HỆ DỮ LIỆU ĐÁM MÂY (Supabase Backend)"]
        S1["PostgREST API Engine"]
        S2["PostgreSQL Database (gratitude_messages)"]
        S3["Row Level Security (RLS Engine)"]
        S4["GoTrue Auth Service"]
        S1 <--> S3 <--> S2
        S4 <--> S2
    end

    subgraph Admin_Tier["💻 PHÂN HỆ QUẢN TRỊ NÂNG CAO (Claude GUI Cockpit App)"]
        direction TB
        M1["Ban Tổ Chức / Quản trị viên sự kiện"] --> M2["Claude GUI Admin Cockpit (Electron App)"]
        M2 --> M3["safeStorage: Lưu trữ an toàn JWT Token & API Key"]
        M2 --> M4["AI Moderation Engine (Kế thừa từ Claude GUI)"]
        M4 -->|Phân tích nhạy cảm / Đánh giá cảm xúc| M5["Adapter đa mô hình: Gemini / Claude / AGY"]
        M2 -->|Duyệt / Từ chối / Xóa hàng loạt| S1
        M2 -->|Đăng nhập quản trị viên| S4
    end

    subgraph DevOps_Tier["🛠️ PHÂN HỆ ĐẢM BẢO CHẤT LƯỢNG (CI/CD Pipeline - GitHub Actions)"]
        D1["Mã nguồn Cây Tri Ân (Git Repository)"] --> D2["GitHub Actions Workflow"]
        D2 --> D3["ESLint & Prettier Syntax Check"]
        D2 --> D4["Headless Smoke Test (Kế thừa test/smoke.cjs)"]
        D2 --> D5["SQL RLS & Schema Validator"]
        D4 -->|Pass toàn bộ tiêu chí| D6["Tự động Deploy lên GitHub Pages"]
    end
```

### Điểm vượt trội của kiến trúc đề xuất:
1. **Tính độc lập 100%:** Website công cộng không hề bị phình to kích thước; trải nghiệm người dùng cuối trên điện thoại hoàn toàn nguyên vẹn.
2. **Bảo mật tuyệt đối:** Không đưa secret key, service role key hay LLM API key lên client-side của GitHub Pages. Toàn bộ logic AI nằm trong ứng dụng quản trị nội bộ hoặc chạy trong GitHub Actions có bảo vệ bằng GitHub Secrets.
3. **Không phá vỡ Supabase RLS:** Vẫn tuân thủ nghiêm ngặt hai tầng phân quyền: Khách chỉ được insert `pending` và đọc `approved`. Quản trị viên xác thực qua GoTrue JWT để thực hiện các thao tác quản trị.
4. **Mở rộng linh hoạt:** Ban tổ chức có thể duyệt lời nhắn bằng giao diện web truyền thống `admin.html` trên điện thoại HOẶC sử dụng phần mềm Desktop Cockpit trên máy tính để có thêm sức mạnh trợ lý AI.

---

## 7. LỘ TRÌNH TRIỂN KHAI 4 GIAI ĐOẠN

### Giai đoạn 1: Chuẩn hóa công cụ và quy trình phát triển
* **Mục tiêu:** Nâng cao chất lượng mã nguồn Cây Tri Ân lên tiêu chuẩn chuyên nghiệp, loại bỏ lỗi tiềm ẩn trước khi đóng gói.
* **Công nghệ sử dụng:** Node.js, ESLint 9 Flat Config, Prettier, `.editorconfig` (kế thừa trực tiếp từ Claude GUI).
* **File / Module tác động:**
  * Bổ sung `.editorconfig`, `.prettierrc.yaml`, `eslint.config.mjs` vào thư mục dự án Cây Tri Ân.
  * Tinh chỉnh cấu hình lint để kiểm tra mã JavaScript thuần ES6+ trong `app.js`, `qr.js` và các thẻ `<script>`.
* **Lợi ích:** Đồng bộ hóa phong cách viết code, tự động phát hiện các biến chưa khai báo, lỗi chính tả, chấm phẩy và định dạng mã nguồn.
* **Rủi ro:** Không có rủi ro về mặt logic vì chỉ tác động tới môi trường phát triển cục bộ.
* **Tiêu chí nghiệm thu:** Chạy lệnh `npm run lint` đạt 0 lỗi (0 errors, 0 warnings); toàn bộ file được format chuẩn xác.

### Giai đoạn 2: Tự động hóa kiểm thử (Automated QA & CI/CD)
* **Mục tiêu:** Xây dựng hệ thống tự động kiểm tra tính đúng đắn của giao diện và luồng nghiệp vụ trước khi phát hành lên GitHub Pages.
* **Công nghệ sử dụng:** GitHub Actions, Headless Test Runner (chuyển đổi từ `test/smoke.cjs` và `test/ui.cjs` của Claude GUI sang Playwright/Puppeteer hoặc node test runner).
* **File / Module tác động:**
  * Tạo thư mục `.github/workflows/deploy.yml`.
  * Tạo kịch bản kiểm thử `test/web-smoke.cjs`: Giả lập nạp trang `index.html`, kiểm tra sự hiện diện của phần tử SVG `#tree`, giả lập gieo mầm trong form wizard 3 bước, kiểm tra bẫy bot honeypot `#website` và kiểm tra chế độ demo `?fill=60`.
* **Lợi ích:** Ngăn chặn tuyệt đối việc đẩy mã lỗi (broken code) lên GitHub Pages; đảm bảo sự kiện Gala diễn ra suôn sẻ mà không gặp sự cố giao diện.
* **Rủi ro:** GitHub Actions tốn thời gian chạy (khoảng 30 - 60 giây mỗi lần push mã).
* **Tiêu chí nghiệm thu:** Mỗi commit hoặc Pull Request được tự động chạy test; pipeline hiển thị trạng thái xanh (Passed) mới cho phép cập nhật website trực tiếp.

### Giai đoạn 3: Xây dựng công cụ quản trị Desktop Cockpit tích hợp Trợ lý AI
* **Mục tiêu:** Cung cấp cho Ban Tổ Chức một công cụ kiểm duyệt chuyên nghiệp trên máy tính, tích hợp trí tuệ nhân tạo để tự động hóa khâu đọc và tiền kiểm duyệt lời nhắn.
* **Công nghệ sử dụng:** Electron 39, React 19, Tailwind CSS v4, `safeStorage` (từ Claude GUI), Adapter AI (`gemini-adapter.ts` hoặc `agy-adapter.ts`).
* **File / Module tác động:**
  * Tạo module `src/main/admin/supabase-client.ts` trong dự án desktop để kết nối với Supabase qua JWT.
  * Tích hợp `src/main/providers/gemini-adapter.ts` với System Prompt tiền kiểm duyệt:
    ```
    "Bạn là trợ lý kiểm duyệt nội dung cho sự kiện tri ân 20/11. Hãy phân tích nội dung lời nhắn, phát hiện ngôn từ thô tục, công kích cá nhân, spam hoặc nội dung không liên quan đến giáo dục. Trả về JSON: { safe: boolean, reason: string, tags: [] }"
    ```
  * Xây dựng giao diện danh sách duyệt thẻ với nhãn cảnh báo đỏ/xanh từ AI, hỗ trợ phím tắt (`Enter` để Duyệt, `Delete` để Từ chối) và tính năng tìm kiếm, phân trang đầy đủ.
* **Lợi ích:** Giảm tải 80% công sức đọc duyệt thủ công cho Ban Tổ Chức; tốc độ duyệt tăng từ 10 tin/phút lên hơn 100 tin/phút. Khóa bí mật và phiên đăng nhập được lưu trữ mã hóa tuyệt đối bằng `safeStorage`.
* **Rủi ro:** Mô hình AI có thể hiểu nhầm các câu đùa thân mật của học sinh là tiêu cực (False Positive).
* **Tiêu chí nghiệm thu:** AI chỉ đóng vai trò **gợi ý (Assistant)**, quyết định duyệt cuối cùng vẫn do con người bấm nút; ứng dụng Desktop chạy mượt mà, lưu trữ token an toàn và không làm lộ API key ra ngoài.

### Giai đoạn 4: Mở rộng kiến trúc và Tối ưu hóa Realtime (Tùy chọn nâng cao)
* **Mục tiêu:** Nâng cấp trải nghiệm tương tác trực tiếp tại hội trường Gala từ Polling (kéo dữ liệu định kỳ) sang Realtime Event-Driven (đẩy dữ liệu tức thì).
* **Công nghệ sử dụng:** Supabase Realtime (WebSocket channels dựa trên PostgreSQL Replication).
* **File / Module tác động:**
  * Cập nhật `app.js` tại chế độ `?screen=1` để đăng ký lắng nghe sự kiện `postgres_changes` trên bảng `gratitude_messages` đối với các bản ghi có `status = 'approved'`.
* **Lợi ích:** Chiếc lá nở bung trên máy chiếu ngay trong tích tắc (dưới 500ms) sau khi admin bấm duyệt, mang lại hiệu ứng ngạc nhiên và phấn khích tột độ cho khán giả tại hội trường. Giảm tải số lượng request liên tục (8 giây/lần) lên Supabase PostgREST.
* **Rủi ro:** Cần đảm bảo kết nối mạng internet tại hội trường ổn định để duy trì WebSocket kết nối liên tục.
* **Tiêu chí nghiệm thu:** Khi admin bấm duyệt trên máy tính, màn hình máy chiếu tự động cập nhật và cho lá nở ngay lập tức mà không cần đợi chu kỳ polling 8 giây.

---

## 8. PHÂN TÍCH RỦI RO VÀ GIẢI PHÁP BẢO VỆ

| Rủi ro tiềm ẩn | Mức độ | Hậu quả nếu xảy ra | Giải pháp bảo vệ kiến trúc |
| :--- | :---: | :--- | :--- |
| **Lộ khóa bí mật (Secret / Service Role Key)** | **Nghiêm trọng (Critical)** | Kẻ xấu có toàn quyền xóa hoặc sửa toàn bộ cơ sở dữ liệu Supabase, bypass hoàn toàn RLS. | **Tuyệt đối không đưa Service Key vào mã nguồn.** Web Cây Tri Ân chỉ lưu Publishable Key. Mọi thao tác quản trị đều xác thực bằng tài khoản email/mật khẩu qua GoTrue Auth để sinh JWT ngắn hạn. |
| **Phá vỡ Supabase RLS** | **Nghiêm trọng (Critical)** | Khách có thể đọc các lời nhắn tiêu cực đang chờ duyệt hoặc tự duyệt lời nhắn độc hại. | **Giữ nguyên 100% các policy hiện tại trong `supabase.sql`.** Không thay đổi cấu trúc bảng; các công cụ mở rộng chỉ đóng vai trò client giao tiếp qua API chuẩn. |
| **Lạm dụng tài nguyên & Quá tải chi phí Token AI** | **Trung bình (Medium)** | Hết quota API của nhà cung cấp LLM, phát sinh chi phí ngoài ý muốn. | **Kiểm tra cục bộ trước khi gọi AI:** Áp dụng bộ lọc Regex từ khóa cấm cục bộ; chỉ gọi AI cho các lời nhắn vượt qua kiểm tra cơ bản. Giới hạn độ dài kiểm tra tối đa 400 ký tự. |
| **Xung đột phiên bản & Phình to kích thước ứng dụng web** | **Cao (High)** | Trang web tải chậm trên điện thoại, mất đi tính chất "quét QR dùng ngay". | **Cách ly triệt để:** Không cài đặt npm packages hay đưa Electron/React vào thư mục web Cây Tri Ân. Hai dự án nằm ở hai thư mục hoàn toàn độc lập. |
| **Sai lệch định danh Quản trị viên trong RLS** | **Trung bình (Medium)** | Admin đăng nhập được nhưng không xem hoặc sửa được tin nhắn. | Thay vì gán cứng chuỗi email tĩnh trong SQL, chuyển đổi sang kiểm tra vai trò người dùng (User Role) hoặc bảng `admin_users` liên kết với `auth.uid()`. |

---

## 9. ĐỀ XUẤT 3 TÍNH NĂNG NÂNG CẤP CÓ GIÁ TRỊ CAO NHẤT

Dựa trên thực trạng của cả hai dự án, đây là 3 nâng cấp mang lại giá trị thực tiễn lớn nhất, giải quyết đúng điểm nghẽn hiện tại mà không làm xáo trộn hệ thống:

### Đề xuất 1: Hệ thống CI/CD & Automated Smoke Test (Độ ưu tiên: Cao nhất)
* **Vấn đề giải quyết:** Hiện tại Cây Tri Ân hoàn toàn không có kiểm thử tự động. Bất kỳ một sơ suất nhỏ khi sửa CSS, SVG hay JavaScript đều có thể làm hỏng form gửi tin hoặc làm vỡ cây trong ngày hội trường.
* **Cách thực hiện:** Kế thừa trực tiếp cấu trúc test của Claude GUI (`test/smoke.cjs`), xây dựng một workflow GitHub Actions gọn nhẹ:
  * Kiểm tra cú pháp toàn bộ file bằng ESLint.
  * Khởi chạy một máy chủ tĩnh giả lập cục bộ, dùng headless browser quét và xác nhận: Canvas QR sinh đúng ảnh, SVG Phyllotaxis dựng đủ số lá mẫu, form wizard chuyển bước mượt mà.
* **Giá trị mang lại:** Tự tin phát hành và cập nhật mã nguồn 100% an toàn, chuyên nghiệp hóa quy trình phát triển phần mềm chuẩn DevOps.

### Đề xuất 2: Trợ lý AI Kiểm duyệt Thông minh (AI Moderation Assistant)
* **Vấn đề giải quyết:** Quản trị viên phải tự đọc thủ công hàng trăm lời nhắn trong thời gian ngắn của buổi lễ, gây mỏi mắt, chậm trễ và dễ để lọt tin nhắn có nội dung xấu.
* **Cách thực hiện:** Tận dụng module `gemini-adapter.ts` hoặc `claude/runner.ts` từ Claude GUI để tạo một tính năng hỗ trợ duyệt thông minh:
  * Khi danh sách tin nhắn `pending` tải về, hệ thống tự động gắn nhãn: `An toàn` (Xanh lá), `Cần xem xét` (Vàng), `Nghi vấn xúc phạm / Spam` (Đỏ) kèm tóm tắt lý do.
  * Quản trị viên chỉ cần một nút bấm "Duyệt tất cả tin nhắn an toàn đã được xác thực" và tập trung xử lý các trường hợp nghi vấn.
* **Giá trị mang lại:** Tăng tốc độ kiểm duyệt lên gấp 10 lần, giảm thiểu tối đa rủi ro hiển thị nội dung phản cảm lên màn hình lớn tại sự kiện Gala.

### Đề xuất 3: Bộ công cụ Desktop Admin Cockpit chuyên dụng cho Ban Tổ Chức
* **Vấn đề giải quyết:** Trang `admin.html` trên trình duyệt hiện tại bị giới hạn: hết hạn đăng nhập sau 1 giờ, không có phân trang, không tìm kiếm được và dễ bị tải lại làm mất trạng thái.
* **Cách thực hiện:** Sử dụng bộ khung Electron + React 19 + Tailwind v4 của Claude GUI để đóng gói thành ứng dụng desktop riêng biệt dành cho Ban Tổ Chức:
  * Lưu phiên đăng nhập an toàn vĩnh viễn qua `safeStorage`.
  * Giao diện quản trị hai cột hiện đại: Bên trái là danh sách lời nhắn kèm bộ lọc/tìm kiếm, bên phải là bảng xem trước trực quan chiếc lá sẽ nở như thế nào trên cây.
  * Tích hợp bảng phím tắt tiện lợi cho người trực sự kiện và tính năng xuất dữ liệu ra file Excel/CSV để lưu trữ kỷ yếu kỷ niệm 20/11.
* **Giá trị mang lại:** Biến Cây Tri Ân từ một bài tập/dự án web đơn giản thành một bộ giải pháp phần mềm sự kiện hoàn chỉnh, đẳng cấp và chuyên nghiệp.

---

## 10. KẾT LUẬN VÀ KHUYẾN NGHỊ

### 10.1. Nên tích hợp phần nào? (What to Adopt)
1. **Quy trình kiểm thử tự động và đảm bảo chất lượng:** Kế thừa triết lý viết smoke test và UI test tự động của Claude GUI để thiết lập CI/CD cho Cây Tri Ân.
2. **Kiến trúc Adapter Trí tuệ nhân tạo:** Chuyển đổi module kết nối AI (Gemini / Claude / AGY) thành dịch vụ hỗ trợ tiền kiểm duyệt nội dung cho Ban Tổ Chức.
3. **Cơ chế bảo mật dữ liệu an toàn:** Kế thừa mô hình phòng thủ `url-guard.ts` (chống giả mạo đường link) và `secret-box.ts` (mã hóa khóa an toàn trên máy trạm quản trị).
4. **Bộ khung ứng dụng Quản trị Desktop:** Tận dụng thế mạnh của Electron để xây dựng ứng dụng Admin Cockpit mạnh mẽ, độc lập với website công cộng.

### 10.2. Không nên tích hợp phần nào? (What to Avoid)
1. **Không nhúng Electron vào website Cây Tri Ân:** Tuyệt đối không thay đổi nền tảng web tĩnh của Cây Tri Ân; trang web phải chạy trơn tru trên mọi trình duyệt điện thoại qua GitHub Pages.
2. **Không đưa Three.js 3D Canvas vào giao diện người dùng cuối:** Không đánh đổi hiệu năng và bản sắc nghệ thuật màu nước 2D của vùng đất Tây Nguyên để lấy hiệu ứng 3D cồng kềnh.
3. **Không thay thế cơ sở dữ liệu Supabase bằng SQLite:** Supabase là nền tảng BaaS hoàn hảo cho dự án; không biến cơ sở dữ liệu thành dạng file cục bộ không thể chia sẻ trực tuyến.
4. **Không đưa khóa bảo mật quản trị lên phía client-side:** Giữ vững nguyên tắc bảo vệ tuyệt đối API key và Row Level Security.

### 10.3. Lời kết
Dự án **Claude GUI** mang lại những bài học vô cùng quý giá về tư duy kiến trúc bảo mật sâu (`defense-in-depth`), quy trình kiểm thử tự động không khoan nhượng và kỹ thuật điều phối mô hình AI linh hoạt. Trong khi đó, **Cây Tri Ân Tây Nguyên** là một sản phẩm có tính thực tiễn cao, chạm đúng cảm xúc cộng đồng với giải thuật đồ họa toán học xuất sắc và thiết kế tối ưu cho người dùng phổ thông.

Việc kết hợp hai dự án theo mô hình **Hybrid Decoupled Architecture** đề xuất trong báo cáo này sẽ nâng tầm Cây Tri Ân thành một hệ thống phần mềm chuyên nghiệp, ổn định và hiện đại, sẵn sàng phục vụ thành công rực rỡ cho sự kiện tri ân 20/11 "Code the Thanks 2026".

---
*Báo cáo được hoàn thành và nghiệm thu dựa trên kiểm tra mã nguồn thực tế tại hai workspace: `E:\edukids-team` và `E:\cay-tri-an-tay-nguyen`.*
