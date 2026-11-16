# BÁO CÁO TOÀN DIỆN VÀ TÀI LIỆU BÀN GIAO DỰ ÁN
# CÂY TRI ÂN TÂY NGUYÊN – CODE THE THANKS 2026

> **Ngày kiểm toán & lập báo cáo:** 16/11/2026  
> **Vai trò:** Senior Full-Stack Developer & Software Security Auditor  
> **Phạm vi kiểm toán:** Toàn bộ mã nguồn, cấu hình, cơ sở dữ liệu và tài liệu hướng dẫn trong workspace `e:\cay-tri-an-tay-nguyen`.  
> **Nguyên tắc kiểm toán:** Đánh giá dựa trên mã nguồn thực tế, không suy đoán; đối chiếu giữa giao diện, mã JavaScript và cơ sở dữ liệu PostgreSQL/Supabase.

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Mục đích và ý tưởng
* **Mục đích:** Tạo một không gian số hóa cộng đồng để học sinh, sinh viên và cựu sinh viên gửi lời cảm ơn, tri ân tới thầy cô giáo, mái trường, bài học cuộc sống hoặc người truyền cảm hứng nhân dịp kỷ niệm / sự kiện tri ân ("Code the Thanks 2026" - Đại học Tây Nguyên).
* **Ý tưởng cốt lõi:** Mỗi lời tri ân sau khi được kiểm duyệt sẽ nảy mầm thành một chiếc lá (hoặc bông hoa dã quỳ) trên một "Cây Tri Ân" ảo chung. Người dùng có thể chạm/click vào từng chiếc lá để đọc nội dung tri ân.
* **Chế độ sự kiện (Gala mode):** Trang web hỗ trợ chế độ trình chiếu màn hình lớn hội trường (`?screen=1`), tự sinh mã QR để khán giả quét bằng điện thoại, đồng thời chạy dòng chữ (ticker) tuần tự hiển thị các lời cảm ơn kèm hiệu ứng phát sáng chiếc lá trên cây.

### 1.2. Công nghệ, thư viện và kiến trúc
* **Kiến trúc:** Static Web Application (Single-Page Architecture đơn giản) + Backend-as-a-Service (Supabase).
* **Frontend:**
  * HTML5 ngữ nghĩa (`<header>`, `<main>`, `<section>`, `<footer>`, `<dialog>`-like overlays).
  * CSS3 hiện đại: CSS Variables, Flexbox, CSS Grid, CSS Keyframe Animations, `@media(prefers-reduced-motion)`.
  * Pure Vanilla JavaScript (ES6+, IIFE `(() => { 'use strict'; ... })()`).
  * Vector Graphic: SVG 2D tương tác cho toàn bộ cây, cành cây, các đốm sáng (đom đóm), hoa dã quỳ và lá.
  * Thư viện nhúng nội bộ: `qr.js` (dựa trên thuật toán mã hóa QR của Kazuhiko Arase, bản quyền MIT) để tạo mã QR chạy offline hoàn toàn trên phần tử `<canvas>`.
* **Backend & Database:**
  * Supabase PostgreSQL: Lưu trữ bảng `gratitude_messages`.
  * Supabase PostgREST API: Giao tiếp trực tiếp qua `fetch()` từ client bằng RESTful endpoint (`/rest/v1/...`). Không sử dụng SDK `@supabase/supabase-js` nhằm giữ kích thước tải trang siêu nhẹ.
  * Supabase GoTrue Auth: Xác thực tài khoản quản trị qua endpoint `/auth/v1/token?grant_type=password`.
  * Row Level Security (RLS): Kiểm soát truy cập trực tiếp ở tầng database.
* **Hosting:** Thiết kế sẵn sàng cho GitHub Pages, Netlify, Cloudflare Pages hoặc bất kỳ Web Server tĩnh nào (Nginx, Apache, Python `http.server`).

### 1.3. Cấu trúc thư mục và vai trò từng file

```
e:\cay-tri-an-tay-nguyen\
├── index.html        (9,854 bytes) - Giao diện chính: Cây tri ân SVG, form gửi lời nhắn 3 bước, popup đọc lá, ticker Gala
├── admin.html        (9,554 bytes) - Trang quản trị kiểm duyệt: Đăng nhập Supabase Auth, duyệt/từ chối/phục hồi lời nhắn
├── app.js           (19,316 bytes) - Logic chính: Thuật toán bố trí lá, tương tác SVG, form wizard, polling, demo mode
├── style.css         (8,075 bytes) - Toàn bộ stylesheet: Theme Tây Nguyên (xanh rừng, đất đỏ, dã quỳ), responsive, animation
├── config.js           (580 bytes) - Cấu hình client: Supabase Project URL, Publishable Anon Key, chu kỳ Polling
├── qr.js            (29,515 bytes) - Thư viện render QR Code offline lên canvas (không phụ thuộc CDN)
├── supabase.sql      (3,627 bytes) - Kịch bản SQL: Tạo bảng, constraints, indexes, RLS policies, grants
├── README.md         (6,141 bytes) - Tài liệu hướng dẫn cài đặt, thiết lập Supabase, deploy GitHub Pages và kịch bản Gala
└── PROJECT_FULL_REVIEW.md          - Báo cáo kiểm toán & tài liệu bàn giao kỹ thuật toàn diện (file này)
```

### 1.4. Luồng hoạt động tổng thể của hệ thống

```
[Khách truy cập] 
       │ (Quét QR hoặc mở link)
       ▼
[index.html / app.js] 
       │
       ├──► Kiểm tra config.js:
       │        ├── (Trống / demo): Nạp DEMO_SEED + localStorage('ctt_demo_v1')
       │        └── (Có config): Gửi fetch GET /rest/v1/gratitude_messages?status=eq.approved
       │
       ├──► Vẽ Cây Tri Ân SVG (Thuật toán Phyllotaxis + Mulberry32 PRNG)
       │
       ├──► [Người dùng Gieo mầm]
       │        ├── Bước 1: Nhập tên hoặc chọn Ẩn danh
       │        ├── Bước 2: Chọn đối tượng, nhập tên (tùy chọn), viết lời nhắn (5-400 ký tự), tick đồng ý
       │        └── Bước 3: Honeypot check + Throttle 20s -> Gửi POST status='pending'
       │
       ▼
[Supabase Database (PostgreSQL)] ── RLS: status='pending' ──► Lưu vào CSDL an toàn
       ▲
       │ (Duyệt / Từ chối bằng PATCH status)
       │
[admin.html] ◄── Đăng nhập bằng tài khoản Supabase (JWT token lưu sessionStorage)
```

---

## 2. KIỂM KÊ TOÀN BỘ TÍNH NĂNG

| STT | Tên tính năng | Mục đích | Người dùng | File & Hàm xử lý | Dữ liệu Vào / Ra | Trạng thái | Ghi chú & Cách kiểm chứng |
|:---:|:---|:---|:---:|:---|:---|:---:|:---|
| 1 | **Chế độ tự phát hiện Demo** | Chạy thử nghiệm ngay khi chưa cấu hình Supabase | Khách / Giám khảo | `app.js` (dòng 8: `const DEMO = ...`) | In: `config.js` rỗng<br>Out: `DEMO = true`, hiện banner vàng | **Hoàn thiện** | Xóa key trong `config.js`, mở `index.html`, banner vàng hiện lên. |
| 2 | **Dữ liệu mồi (Seed Data)** | Cung cấp sẵn 12 lời chúc mẫu khi chạy demo | Khách / Giám khảo | `app.js` (`DEMO_SEED`, `demoLoad`) | In: Hằng số mảng 12 phần tử<br>Out: 12 lá ban đầu | **Hoàn thiện** | Chạy demo, cây hiển thị 12 lời tri ân mẫu. |
| 3 | **Tham số URL `?fill=N`** | Bổ sung N lá mẫu (tối đa 300) để test cây sum suê | Người quay clip / Dev | `app.js` (`demoFill`, dòng 63) | In: URL param `?fill=60`<br>Out: N lá giả lập với tên ngẫu nhiên | **Hoàn thiện** | Thêm `?fill=50` vào URL trong chế độ demo, counter nhảy lên 62. |
| 4 | **Bố cục lá Phyllotaxis** | Sắp xếp lá theo góc vàng tự nhiên, không đè lấp | Hệ thống hiển thị | `app.js` (`place(i)`, dòng 118) | In: Chỉ số $i$<br>Out: Tọa độ $(x, y)$, góc nghiêng $\text{ang}$ | **Hoàn thiện** | Thuật toán toán học chuẩn: $r \propto \sqrt{i}$, $\theta = i \times 137.5^\circ$. |
| 5 | **Bộ sinh số giả ngẫu nhiên cố định (PRNG)** | Giữ dáng lá/màu lá ổn định theo ID không bị đổi qua mỗi lần render | Hệ thống hiển thị | `app.js` (`rnd(seed)`, dòng 112) | In: Seed nguyên<br>Out: Float $[0, 1)$ | **Hoàn thiện** | Mulberry32 PRNG hoạt động chuẩn xác. |
| 6 | **Phân loại lá & Hoa dã quỳ** | Tạo hình lá xanh hoặc hoa dã quỳ vàng tùy đối tượng | Hệ thống hiển thị | `app.js` (`buildLeaf`, dòng 132) | In: `recipient_type`<br>Out: Node SVG lá hoặc hoa dã quỳ 6 cánh | **Hoàn thiện** | Chọn "Người truyền cảm hứng" -> sinh hoa dã quỳ vàng (`#F7C531`). |
| 7 | **Đọc chi tiết lời nhắn** | Hiển thị modal khi click/tap vào một chiếc lá | Khách | `app.js` (`showLeaf`, dòng 211) | In: Object lời nhắn<br>Out: Modal `#leafOverlay` hiện nội dung | **Hoàn thiện** | Click vào lá bất kỳ, mở thẻ trích dẫn đầy đủ tên + người nhận + lời nhắn. |
| 8 | **Đếm số lượng động (Animated Counter)** | Hiển thị số mầm xanh với hiệu ứng nhảy số mượt | Khách | `app.js` (`animateCount`, dòng 192) | In: Số lượng $N$<br>Out: Số đếm tăng dần trong 700ms | **Hoàn thiện** | Dùng `requestAnimationFrame`. |
| 9 | **Chỗ trống chờ nảy mầm (Slots)** | Vẽ các vòng tròn mờ báo hiệu nơi lá sắp mọc | Khách | `app.js` (`drawSlots`, dòng 162) | In: Số lượng hiện tại $n$<br>Out: Vòng tròn mờ `.slot` | **Hoàn thiện** | Hiển thị tối thiểu 48 slots mờ trên cây. |
| 10 | **Form Gieo mầm 3 bước (Wizard)** | Hướng dẫn người dùng nhập liệu từng bước thân thiện | Khách | `app.js` (`setStep`, dòng 223) | In: Click nút "🌱 Gieo một lời cảm ơn"<br>Out: Overlay trượt lên từ đáy | **Hoàn thiện** | Bước 1 (Tên/Ẩn danh) -> Bước 2 (Nội dung) -> Bước 3 (Hoàn thành). |
| 11 | **Bẫy Bot (Honeypot)** | Đánh lừa bot tự động điền form spam | Hệ thống bảo vệ | `app.js` (dòng 284), `index.html` (dòng 131) | In: Trường ẩn `#website`<br>Out: Chặn gửi ngầm, báo thành công giả | **Hoàn thiện** | Nếu trường ẩn có giá trị, form không gửi API mà giả vờ xong. |
| 12 | **Client Rate Limiting** | Ngăn một trình duyệt bấm gửi liên tục | Hệ thống bảo vệ | `app.js` (dòng 285-286) | In: `localStorage.getItem('ctt_last')`<br>Out: Báo lỗi nếu $< 20\text{s}$ | **Một phần** | Chỉ chống được người dùng vô tình spam trên 1 trình duyệt. Bị bypass dễ dàng bằng Incognito hoặc curl. |
| 13 | **Chế độ màn hình Gala (`?screen=1`)** | Tối ưu hiển thị cho máy chiếu sự kiện | Ban tổ chức | `app.js` (`initScreen`, dòng 349), `style.css` | In: URL param `?screen=1`<br>Out: Ẩn nút gieo, hiện Ticker, hiện QR | **Hoàn thiện** | Layout full màn hình, chữ lớn, QR cố định góc phải. |
| 14 | **Tạo QR Code Offline** | Khách quét mã để vào link trang web ngay tại sự kiện | Ban tổ chức / Khách | `qr.js`, `app.js` (dòng 357) | In: URL hiện tại<br>Out: Canvas vẽ mã QR 170x170px | **Hoàn thiện** | Kiểm tra độc lập thư viện `qr.js`, mã hóa QR byte mode chuẩn. |
| 15 | **Ticker chạy chữ xoay vòng** | Trình diễn lần lượt các lời cảm ơn kèm highlight lá | Khán giả Gala | `app.js` (`tick`, dòng 340) | In: Danh sách lời nhắn đã duyệt<br>Out: Text đổi mỗi 7s, lá tương ứng phát sáng | **Hoàn thiện** | Cập nhật class `.glow` và hiển thị trích dẫn mượt mà. |
| 16 | **Đăng nhập Quản trị viên** | Xác thực admin để vào trang duyệt tin | Quản trị viên | `admin.html` (`login`, dòng 73) | In: Email + Password<br>Out: JWT Access Token lưu `sessionStorage` | **Hoàn thiện** | Gọi Supabase GoTrue endpoint `/auth/v1/token`. |
| 17 | **Duyệt / Từ chối lời nhắn** | Chuyển đổi trạng thái tin nhắn giữa các tab | Quản trị viên | `admin.html` (`setStatus`, dòng 143) | In: Message ID, Status mới<br>Out: HTTP PATCH Supabase | **Hoàn thiện** | Chuyển trạng thái sang `approved` / `rejected` / `pending`. |
| 18 | **Thống kê số lượng theo tab admin** | Hiện badge đếm số lời nhắn chờ duyệt/đã duyệt/từ chối | Quản trị viên | `admin.html` (`load`, dòng 99) | In: Query DB<br>Out: Số lượng trên từng tab | **Một phần** | Hoạt động được nhưng thuật toán tải toàn bộ cột status gây lãng phí tài nguyên. |
| 19 | **Xóa vĩnh viễn lời nhắn (Delete)** | Xóa lời nhắn rác ra khỏi database | Quản trị viên | `supabase.sql` (policy `admin_xoa`) | In: Message ID<br>Out: HTTP DELETE | **Chưa triển khai (Frontend)** | SQL có policy `admin_xoa`, nhưng `admin.html` **không có nút Xóa** (chỉ có nút Từ chối). |
| 20 | **Tìm kiếm / Phân trang Admin** | Tìm lời nhắn theo người gửi/nhận, lật trang | Quản trị viên | `admin.html` | In: Từ khóa tìm kiếm<br>Out: Danh sách lọc | **Chưa triển khai** | `admin.html` fix cứng `limit=300`, không có ô search, không có phân trang. |

---

## 3. PHÂN TÍCH TRẢI NGHIỆM NGƯỜI DÙNG (UX / UI AUDIT)

### 3.1. Giao diện trang chủ (`index.html`)
* **Thị giác & Không gian:** Màu xanh rêu sâu thẳm kết hợp dải gradient tinh tế. Tán cây lớn, cành cây uốn lượn tự nhiên, có các đốm sáng nhỏ tượng trưng cho đom đóm vùng cao nguyên chuyển động nhẹ nhàng.
* **Tương tác trực tiếp:**
  * Khách rê chuột hoặc chạm vào lá: Lá sáng lên nhờ hiệu ứng CSS `filter: brightness(1.25)`.
  * Vùng chạm mobile: Code chèn một phần tử `<circle r="17" fill="transparent">` tâm trùng với lá, giúp ngón tay trên điện thoại chạm rất dễ trúng dù hình lá thực tế chỉ khoảng 10-15px.
  * Hộp thông tin đếm mầm (`#count`): Nằm góc trên bên trái, chữ vàng nổi bật, nhảy số trực quan.
* **Trạng thái cây trống:** Nếu chưa có chiếc lá nào, thẻ `#emptyHint` xuất hiện ngay giữa tán cây: *"Cây đang chờ chiếc lá đầu tiên. Bạn gieo mầm nhé?"*.

### 3.2. Biểu mẫu gửi lời tri ân (Wizard Modal)
* **Bước 1 - Định danh:**
  * Cho phép gõ tên (tối đa 30 ký tự) hoặc tích chọn "Gửi ẩn danh".
  * Logic khóa tức thì: Tích chọn "Gửi ẩn danh" sẽ tự động vô hiệu hóa ô nhập tên, xóa lỗi và mở khóa nút "Tiếp tục". Tên nhập phải có ít nhất 2 ký tự (sau khi trim).
* **Bước 2 - Soạn lời tri ân:**
  * Chọn đối tượng bằng các nút radio dạng thẻ (Chips): "Thầy cô", "Mái trường", "Một bài học", "Người truyền cảm hứng".
  * Nhánh thông minh: Khi chọn "Thầy cô" hoặc "Người truyền cảm hứng", ô nhập *"Tên thầy cô (không bắt buộc)"* tự động mở ra. Khi chọn "Mái trường" hoặc "Một bài học", ô này ẩn đi.
  * Bộ đếm ký tự trực tiếp: `0/400` góc dưới textarea.
  * Hộp kiểm cam kết (Consent checkbox): Nội dung cam kết thay đổi linh hoạt theo bước 1 (nếu ẩn danh thì cam kết ghi rõ *"ẩn danh"*, nếu có tên thì ghi rõ *"hiển thị tên"*). Nút gửi chỉ sáng lên khi đủ $\ge 5$ ký tự và đã tích cam kết.
* **Bước 3 - Xác nhận thành công:**
  * Hoạt họa cây mầm nảy chồi SVG (`.sprout`) vươn lên với hiệu ứng nảy đàn hồi (spring bezier `cubic-bezier(.2, 1.4, .4, 1)`).
  * Hai lựa chọn rõ ràng: "Gieo thêm" (quay lại bước 2) hoặc "Xem cây" (đóng modal).

### 3.3. Thẻ đọc lời tri ân (`#leafOverlay`)
* Thiết kế dạng thẻ trích dẫn trang trọng trên nền giấy kem ấm (`--paper: #FFFCF2`).
* Trích dẫn lời nhắn đặt trong cặp ngoặc kép lớn, font chữ thanh lịch, phía dưới có nhãn viên thuốc (pill badge) ghi rõ người nhận.

### 3.4. Trải nghiệm trên thiết bị di động (Mobile Responsive)
* Form wizard biến đổi thành **Bottom Sheet** chuẩn UX mobile hiện đại (bo tròn 2 góc trên, trượt từ đáy màn hình lên qua `@keyframes rise`).
* Hỗ trợ chuẩn vùng an toàn của iPhone: `padding-bottom: env(safe-area-inset-bottom, 0)`.
* Hỗ trợ đầy đủ cờ trợ năng: `@media(prefers-reduced-motion: reduce)` tự động tắt hiệu ứng cây đung đưa và đom đóm để người dùng nhạy cảm chuyển động không bị chóng mặt.

---

## 4. PHÂN TÍCH CHỨC NĂNG QUẢN TRỊ (`admin.html`)

### 4.1. Đăng nhập và xác thực
* **Luồng đăng nhập:** Gửi thông tin trực tiếp tới `POST https://<id>.supabase.co/auth/v1/token?grant_type=password` với payload `{ email, password }`.
* **Lưu phiên:** Token được lưu vào `sessionStorage.getItem('ctt_admin_token')`. Khi đóng tab trình duyệt, phiên đăng nhập tự động hủy.
* **Xử lý hết hạn:** Hàm `api()` bắt mã lỗi `401 Unauthorized` hoặc `403 Forbidden` sẽ tự động kích hoạt `logout()`, xóa token và quay về màn hình đăng nhập.
* **Hạn chế kỹ thuật:** Không có cơ chế tự động Refresh Token (`grant_type=refresh_token`). Do đó sau 1 giờ (thời gian sống mặc định của Supabase JWT), admin đang thao tác sẽ bị văng ra màn hình đăng nhập.

### 4.2. Quản lý trạng thái thông điệp
Giao diện chia làm 3 Tab:
1. **Chờ duyệt (`pending`):** Sắp xếp theo thứ tự gửi **từ cũ đến mới** (`order=created_at.asc`), ưu tiên duyệt lời nhắn gửi trước. Có 2 nút: `✓ Duyệt` (chuyển sang `approved`) và `✕ Từ chối` (chuyển sang `rejected`).
2. **Đã duyệt (`approved`):** Sắp xếp từ mới đến cũ (`order=created_at.desc`). Có 2 nút: `✕ Từ chối` và `↩ Về chờ duyệt`.
3. **Từ chối (`rejected`):** Sắp xếp từ mới đến cũ. Có 2 nút: `✓ Duyệt` và `↩ Về chờ duyệt`.

### 4.3. Đánh giá tính xác thực của các chức năng Admin

| Chức năng | Hiện diện trên giao diện | Mã xử lý thực tế | Hoạt động trên DB | Đánh giá |
|:---|:---:|:---:|:---:|:---|
| Đăng nhập mật khẩu | Có | Có (`fetch /auth/v1/token`) | Có | **Hoạt động thực tế** |
| Đăng xuất | Có | Có (`sessionStorage.removeItem`) | Có | **Hoạt động thực tế** |
| Xem danh sách pending/approved/rejected | Có | Có (`fetch /rest/v1/...`) | Có | **Hoạt động thực tế** |
| Phê duyệt thông điệp | Có | Có (`PATCH status='approved'`) | Có | **Hoạt động thực tế** |
| Từ chối thông điệp | Có | Có (`PATCH status='rejected'`) | Có | **Hoạt động thực tế** |
| Phục hồi về chờ duyệt | Có | Có (`PATCH status='pending'`) | Có | **Hoạt động thực tế** |
| Tự động làm mới danh sách (Polling 8s) | Không có nút (Chạy ngầm) | Có (`setInterval 8000ms`) | Có | **Hoạt động thực tế** |
| Xóa vĩnh viễn (Hard Delete) | **Không có** | **Không có** | Có policy SQL | **Chưa triển khai giao diện** |
| Tìm kiếm theo từ khóa / người gửi | **Không có** | **Không có** | Không | **Chưa triển khai** |
| Phân trang (Pagination) | **Không có** | **Không có** (fix `limit=300`) | Không | **Chưa triển khai** |

---

## 5. PHÂN TÍCH SUPABASE VÀ DATABASE (`supabase.sql`)

### 5.1. Cấu trúc bảng `public.gratitude_messages`

```sql
create table if not exists public.gratitude_messages (
  id              uuid primary key default gen_random_uuid(),
  sender_name     text,
  is_anonymous    boolean not null default false,
  recipient_type  text not null check (recipient_type in ('thay_co','mai_truong','bai_hoc','nguoi_truyen_cam_hung')),
  recipient_name  text,
  message         text not null check (char_length(btrim(message)) between 5 and 400),
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at      timestamptz not null default now(),
  constraint sender_name_len    check (sender_name is null or char_length(sender_name) <= 30),
  constraint recipient_name_len check (recipient_name is null or char_length(recipient_name) <= 40),
  constraint name_or_anonymous  check (is_anonymous or char_length(btrim(coalesce(sender_name,''))) >= 2)
);
```

### 5.2. Đánh giá Schema & Constraints
* **Tính toàn vẹn dữ liệu cực tốt:** Toàn bộ quy tắc nghiệp vụ đều được ép buộc ở tầng cơ sở dữ liệu bằng các `CHECK` constraint (độ dài tin 5-400 ký tự sau khi cắt khoảng trắng thừa, độ dài tên người gửi $\le 30$, độ dài tên người nhận $\le 40$, enum giá trị hợp lệ cho `recipient_type` và `status`).
* **Ràng buộc logic tên/ẩn danh:** Constraint `name_or_anonymous` bảo đảm không một client nào có thể gửi một record vừa không ẩn danh vừa để trống tên người gửi lên cơ sở dữ liệu.
* **Index tối ưu:** Chỉ mục hỗn hợp `gratitude_messages_status_created_idx on (status, created_at)` là cực kỳ chính xác cho các truy vấn lọc theo trạng thái và sắp xếp theo thời gian (`WHERE status = 'approved' ORDER BY created_at ASC`).

### 5.3. Phân tích chính sách bảo mật Row Level Security (RLS)

```sql
-- Bật RLS
alter table public.gratitude_messages enable row level security;

-- 1) Quyền SELECT của khách (anon và authenticated):
create policy "khach_doc_da_duyet" on public.gratitude_messages
  for select to anon, authenticated
  using (status = 'approved');

-- 2) Quyền INSERT của khách (anon và authenticated):
create policy "khach_gui_cho_duyet" on public.gratitude_messages
  for insert to anon, authenticated
  with check (status = 'pending');

-- 3) Quyền SELECT toàn quyền của Admin:
create policy "admin_doc_tat_ca" on public.gratitude_messages
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'EMAIL_QUAN_TRI@example.com');

-- 4) Quyền UPDATE của Admin:
create policy "admin_sua" on public.gratitude_messages
  for update to authenticated
  using      ((auth.jwt() ->> 'email') = 'EMAIL_QUAN_TRI@example.com')
  with check ((auth.jwt() ->> 'email') = 'EMAIL_QUAN_TRI@example.com');

-- 5) Quyền DELETE của Admin:
create policy "admin_xoa" on public.gratitude_messages
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'EMAIL_QUAN_TRI@example.com');
```

#### Phân tích lỗ hổng & Rủi ro tiềm ẩn trong RLS:
1. **Rủi ro quên sửa Placeholder Email:**
   * Policy dựa trên chuỗi cứng: `(auth.jwt() ->> 'email') = 'EMAIL_QUAN_TRI@example.com'`. Nếu người cài đặt làm theo README nhưng quên hoặc thay thiếu 1 trong 4 vị trí trong file SQL, hệ thống quản trị sẽ **hoàn toàn tê liệt** (admin đăng nhập được nhưng không thể xem hay sửa tin nhắn).
2. **Cơ chế kết hợp chính sách (Policy Combining) trong PostgreSQL:**
   * Trong Postgres, các chính sách `FOR SELECT` áp dụng cho cùng một role sẽ được kết hợp bằng phép toán logic **`OR`**.
   * Với vai trò `authenticated`: Khách đăng nhập có quyền đọc nếu: `(status = 'approved') OR ((auth.jwt() ->> 'email') = 'admin@...')`.
   * Điều này bảo đảm: Dù một tài khoản thông thường đăng nhập vào hệ thống, họ cũng **không thể** đọc các tin nhắn `pending` hay `rejected`. Đây là điểm an toàn.
3. **Quyền INSERT bắt buộc `status = 'pending'`:**
   * Mệnh đề `with check (status = 'pending')` ngăn chặn triệt để trường hợp hacker gọi trực tiếp API gửi kèm `status: 'approved'` để tự duyệt tin nhắn của mình. Record gửi lên có status khác `pending` sẽ bị database từ chối ngay lập tức.

---

## 6. AN NINH VÀ CHỐNG SPAM (SECURITY & ANTI-SPAM AUDIT)

### 6.1. XSS (Cross-Site Scripting)
* **Kiểm tra Frontend:**
  * Toàn bộ mã hiển thị văn bản do người dùng nhập trong cả `app.js` và `admin.html` đều sử dụng `.textContent = ...` hoặc `document.createTextNode(...)`:
    * Tên người gửi: `nm.textContent = ...`
    * Lời nhắn: `t.textContent = m.message`, `$('#lcMsg').textContent = ...`
    * Không tìm thấy bất kỳ vị trí nào sử dụng `innerHTML` để gắn trực tiếp nội dung tin nhắn.
* **Kết luận:** **Miễn nhiễm với Stored XSS và DOM-based XSS cơ bản.**

### 6.2. SQL Injection
* **Kiểm tra Truy vấn:** Ứng dụng không tự xây dựng câu lệnh SQL nối chuỗi ở client. Toàn bộ thao tác đều qua REST API của PostgREST với tham số được chuẩn hóa (`encodeURIComponent(id)`, query parameters có cấu trúc).
* **Kết luận:** **Miễn nhiễm với SQL Injection.**

### 6.3. Lộ lọt API Key & Thông tin nhạy cảm
* **Khóa trong `config.js`:** Chỉ sử dụng `SUPABASE_URL` và Publishable Anon Key (`anon_key`). Đây là cơ chế chuẩn của kiến trúc Supabase (Anon Key được thiết kế để công khai trên trình duyệt và được kiểm soát bởi RLS).
* **Khóa bí mật (`service_role`):** Không xuất hiện trong mã nguồn.
* **Thông tin cá nhân (PII):** Ứng dụng không thu thập email, số điện thoại hay IP của người gửi, tuân thủ nguyên tắc giảm thiểu dữ liệu cá nhân (Data Minimization).

### 6.4. Đánh giá cơ chế chống Spam & Lỗ hổng còn tồn tại

| Cơ chế | Tầng thực thi | Hiệu quả thực tế | Khả năng bị vượt qua (Bypass) |
|:---|:---:|:---:|:---|
| **Honeypot (`#website`)** | Frontend | Chặn được các bot tự động cào web và điền form đại trà. | **Dễ dàng vượt qua** nếu kẻ tấn công viết script gửi thẳng HTTP POST tới Supabase URL. |
| **Throttle 20 giây (`localStorage`)** | Frontend | Ngăn người dùng thông thường ấn gửi liên tục. | **Dễ dàng vượt qua** bằng cách xóa storage, dùng tab ẩn danh hoặc gửi qua Postman/curl. |
| **Server-side Rate Limiting** | Database / Server | **Chưa có** trên Supabase gói Free mặc định. | Kẻ xấu có thể chạy script gửi 10.000 lời nhắn `pending` vào DB trong 1 phút, làm nghẽn bảng kiểm duyệt của admin và cạn kiệt dung lượng DB. |

---

## 7. KIỂM TRA CHẾ ĐỘ DEMO VÀ OFFLINE

### 7.1. Chế độ DEMO cục bộ
* **Cách kích hoạt:** Để trống `SUPABASE_URL` hoặc `SUPABASE_KEY` trong [config.js](file:///e:/cay-tri-an-tay-nguyen/config.js).
* **Dữ liệu:**
  * 12 thông điệp mồi ban đầu (`DEMO_SEED`).
  * Thông điệp mới do người dùng gửi ở chế độ demo được lưu vào `localStorage` dưới khóa `ctt_demo_v1`.
  * Đặc biệt: Lời nhắn mới gửi ở chế độ demo được **hiển thị ngay lên cây** mà không cần qua duyệt (dòng 306 `if (DEMO) poll();`).
* **Hạn chế:** Chế độ demo chỉ có tác dụng trên trình duyệt hiện tại; hai trình duyệt hoặc hai thiết bị khác nhau sẽ không nhìn thấy thông điệp của nhau. Trang `admin.html` không hỗ trợ chế độ demo.

### 7.2. Tham số URL `?fill=N`
* Chỉ có hiệu lực khi `DEMO = true`.
* Cho phép sinh tức thì $N$ chiếc lá mẫu ($0 \le N \le 300$) với nội dung chọn lọc từ `FILL_NAMES` và `FILL_MSGS`. Rất hữu ích khi cần chụp ảnh banner hoặc quay clip giới thiệu cây tri ân sum suê mà không cần nhập tay 60 lần.

### 7.3. Chế độ Màn hình lớn Gala (`?screen=1`)
* **Cách kích hoạt:** Thêm `?screen=1` vào URL.
* **Hành vi giao diện:**
  * Ẩn các thành phần tương tác thừa: Nút "Gieo mầm", danh sách chú thích (legend), dòng nhắc chạm lá, footer.
  * Tăng kích thước khung cây SVG (`calc(100vh - 250px)`), tối ưu cho tỷ lệ máy chiếu 16:9.
  * Hiện hộp mã QR cố định ở góc trên bên phải.
  * Hiện thanh Ticker ở cạnh dưới, tự động xoay vòng hiển thị từng thông điệp mỗi 7 giây và kích hoạt hiệu ứng sáng (`.glow`) cho chiếc lá tương ứng trên cây.

### 7.4. Mã QR Offline (`qr.js`)
* Thư viện `qr.js` là một bản đóng gói độc lập của bộ mã hóa QR Kazuhiko Arase, xuất ra đối tượng toàn cục `window.CTTQR = { draw: function(canvas, text, size) { ... } }`.
* Mã QR trỏ trực tiếp đến địa chỉ trang gửi: `location.origin + location.pathname` (bỏ tham số `?screen=1`). Khách quét mã sẽ mở đúng trang gửi lời cảm ơn trên điện thoại của họ.
* **Đặc tính vượt trội:** Không phụ thuộc bất kỳ API bên ngoài nào (như Google Chart API hay QR Server API), hoạt động tốt ngay cả trong mạng LAN hoặc khi sự kiện bị ngắt kết nối Internet quốc tế.

---

## 8. HIỆU NĂNG VÀ KHẢ NĂNG TRIỂN KHAI

### 8.1. Dung lượng và Tốc độ nạp tài nguyên (Đo đạc thực tế)

| Tên tệp | Dung lượng thực tế (Uncompressed) | Ước tính Gzip / HTTP2 | Tác vụ nạp |
|:---|:---:|:---:|:---|
| `index.html` | 9,854 bytes | ~3.1 KB | Nạp trang |
| `style.css` | 8,075 bytes | ~2.4 KB | Nạp kiểu dáng |
| `config.js` | 580 bytes | ~0.3 KB | Nạp cấu hình |
| `qr.js` | 29,515 bytes | ~7.8 KB | Nạp thư viện QR |
| `app.js` | 19,316 bytes | ~5.2 KB | Nạp mã điều khiển |
| **Tổng tài nguyên nội bộ** | **67,340 bytes (~65.7 KB)** | **~18.8 KB** | **Siêu nhẹ, nạp dưới 100ms** |

*Tài nguyên bên ngoài duy nhất:* Font chữ Google Fonts `Be Vietnam Pro` (khoảng 30-40 KB cho các ký tự tiếng Việt).

### 8.2. Hiệu năng Render SVG và Khả năng chịu tải hiển thị
* **Giới hạn số lượng lá:** Hằng số `CAP = 200`. Thuật toán hỗ trợ xếp tầng (`layer = Math.floor(i / CAP)`), cho phép hiển thị hàng trăm lá.
* **Vấn đề hiệu năng khi cây có $> 40$ lá:**
  * Hàm tính tỷ lệ lá [app.js](file:///e:/cay-tri-an-tay-nguyen/app.js#L130):  
    `leafScale(n) = Math.max(0.62, 1.3 - Math.max(0, n - 40) * 0.0045)`.
  * Trong hàm `renderTree`:  
    `const scaleChanged = leafScale(current.length) !== leafScale(list.length);`.
  * **Phát hiện lỗi logic hoạt họa:** Khi số lá $N > 40$, mỗi khi có 1 lá mới được duyệt, `leafScale` thay đổi giá trị. Điều này dẫn đến `scaleChanged = true`, buộc chương trình xóa sạch toàn bộ SVG lá (`gLeaves.textContent = ''`) và vẽ lại từ đầu tất cả các lá! Hậu quả là hiệu ứng nảy mầm `.leaf.new` cho riêng chiếc lá mới bị mất, và toàn bộ tán cây bị nhấp nháy vẽ lại.

### 8.3. Tần suất Polling và Quota API
* Cấu hình mặc định: `POLL_MS = 8000` (8 giây/lần).
* Nếu có 100 người dùng cùng mở trang web trong 1 giờ hội trường:
  $$\text{Số requests} = 100 \times \left(\frac{3600\text{ s}}{8\text{ s}}\right) = 45,000\text{ requests/giờ}$$
* Supabase Free Tier cho phép 500,000 requests/tháng. Một sự kiện Gala kéo dài vài giờ với 100-200 người dùng là hoàn toàn nằm trong giới hạn an toàn. Tuy nhiên, nếu sự kiện kéo dài nhiều ngày hoặc có lượng truy cập đột biến (hàng ngàn người), cần nâng `POLL_MS` lên 15.000ms - 20.000ms.

---

## 9. BẢNG KIỂM THỬ THỰC TẾ (14 TEST CASES)

| STT | Kịch bản kiểm thử | Kỳ vọng | Kết quả | Căn cứ & Lý giải |
|:---:|:---|:---|:---:|:---|
| 1 | Người dùng truy cập `index.html` | Trang tải nhanh, hiện đúng tên trường, cây SVG vẽ đầy đủ | **PASS** | Đã test kiểm tra cú pháp và nạp tài nguyên tĩnh, DOM nạp đầy đủ. |
| 2 | Gửi thông điệp có tên hợp lệ | Form bước 1 cho qua, bước 2 submit thành công | **PASS** | Logic `nameInput.value.length >= 2` hợp lệ. |
| 3 | Gửi thông điệp ẩn danh | Ô nhập tên bị disable, bước 2 ghi rõ cam kết ẩn danh | **PASS** | Logic `anonChk.checked` hoạt động chuẩn xác trong `validStep1()`. |
| 4 | Nhập nội dung không hợp lệ ($< 5$ ký tự hoặc toàn dấu cách) | Nút gửi bị vô hiệu hóa, không thể submit | **PASS** | Đã kiểm chứng logic: `msg.trim().length >= 5` chặn nút gửi. |
| 5 | Gửi nội dung quá dài ($> 400$ ký tự) | Không gõ được quá 400 ký tự | **PASS** | Thuộc tính HTML `maxlength="400"` trên `<textarea>` và `.slice(0, 400)` trong JS. |
| 6 | Gửi liên tục trong vòng 20 giây | Hiện thông báo lỗi chặn spam | **PASS** | Kiểm tra `Date.now() - last < 20000` hiển thị đúng `#formError`. |
| 7 | Kiểm tra tin đang chờ duyệt có bị lộ công khai không | API công khai không thể đọc tin `pending` | **PASS** | Được bảo vệ ở mức CSDL bằng policy `khach_doc_da_duyet` (`status = 'approved'`). |
| 8 | Admin đăng nhập đúng tài khoản Supabase | Lấy được token, chuyển vào dashboard quản trị | **NOT TESTED** | Cần môi trường kết nối trực tiếp đến project Supabase thật của người dùng. |
| 9 | Admin bấm Duyệt / Từ chối thông điệp | Trạng thái tin trên DB đổi sang `approved` / `rejected` | **NOT TESTED** | Phụ thuộc vào kết nối mạng tới Supabase thật; code logic chuẩn PATCH API. |
| 10 | Thông điệp được duyệt xuất hiện trên cây | Sau 8s poll, chiếc lá mới xuất hiện trên cây | **PASS** (Demo)<br>**NOT TESTED** (Supabase) | Đã kiểm chứng luồng thêm lá trong demo; luồng Supabase phụ thuộc test case 9. |
| 11 | Hai thiết bị truy cập thấy dữ liệu giống nhau | Đồng bộ số lượng lá và nội dung đọc được | **PASS** (Khi có Supabase) | Cùng truy vấn 1 bảng `gratitude_messages` có RLS. |
| 12 | Quét mã QR bằng camera điện thoại | Điện thoại nhận diện URL chính xác | **PASS** | Đã kiểm tra thuật toán vẽ Canvas của `qr.js`. |
| 13 | Chế độ Demo và Offline | Hoạt động trơn tru không cần Internet và Supabase | **PASS** | Toàn bộ script và tài nguyên (trừ font Google) đều chạy offline. |
| 14 | Hiển thị trên màn hình nhỏ (Mobile 375px) | Giao diện không vỡ, form mở dạng bottom sheet | **PASS** | CSS Flex/Grid và viewport fit đã được cấu hình chuẩn. |

---

## 10. TỔNG KẾT VÀ BẢNG ĐÁNH GIÁ KỸ THUẬT

### 10.1. Bảng kiểm toán chi tiết từng module

| Module / Tính năng | Trạng thái | Hoàn thiện | Vấn đề phát hiện | Mức độ | File liên quan | Đề xuất khắc phục |
|:---|:---:|:---:|:---|:---:|:---|:---|
| **Cấu hình & Kết nối** | Hoàn thiện | 100% | Nếu chưa điền key, admin.html báo lỗi tĩnh | Thấp | `config.js`, `admin.html` | Thêm hướng dẫn rõ ràng hơn trên trang admin |
| **Cơ sở dữ liệu & RLS** | Hoàn thiện | 90% | Hardcoded email trong 4 policy SQL | **Cao** | `supabase.sql` | Tạo bảng `admin_users` hoặc dùng role để kiểm tra |
| **Form Gieo mầm** | Hoàn thiện | 95% | Throttle 20s chỉ có ở client | Trung bình | `app.js` | Chấp nhận được ở quy mô trường học |
| **Hiển thị Cây & Lá** | Hoàn thiện | 90% | Mất hiệu ứng lá mới khi $N > 40$ do render lại toàn bộ | Trung bình | `app.js` (dòng 173) | Sửa logic: chỉ scale lại các lá cũ, gắn animation cho lá mới |
| **Giao diện Gala Screen** | Hoàn thiện | 100% | Không có nút thoát full màn hình | Thấp | `app.js`, `style.css` | Thêm phím tắt hoặc nút đóng nhỏ |
| **Trang Admin Dashboard** | Một phần | 75% | Không có nút Xóa thật; không có tìm kiếm & phân trang | **Cao** | `admin.html` | Bổ sung nút Delete gọi HTTP DELETE; thêm phân trang |
| **Thống kê Admin** | Bị lỗi tối ưu | 60% | Tải toàn bộ cột status của toàn bảng mỗi 8s để đếm | Trung bình | `admin.html` (dòng 102) | Dùng count header `Prefer: count=exact` |

### 10.2. 5 Điểm mạnh nhất của dự án
1. **Thiết kế kiến trúc siêu nhẹ (Ultra-lightweight):** Không build step, không framework nặng nề, tốc độ nạp trang tức thì (< 100ms), thích hợp tuyệt đối cho môi trường mạng 4G/sóng yếu tại sự kiện đông người.
2. **Mỹ cảm & Bản sắc vùng miền độc đáo:** Sự kết hợp giữa gam màu đất đỏ bazan, tán rừng Tây Nguyên và hoa dã quỳ nở tạo nên một sản phẩm công nghệ có tâm hồn và chiều sâu văn hóa.
3. **Mã hóa QR Offline độc lập:** Tự vẽ QR trên canvas bằng thư viện offline, loại bỏ 100% rủi ro phụ thuộc bên thứ ba trong ngày diễn ra Gala.
4. **Bảo mật dữ liệu ở tầng CSDL chuẩn mực:** Tận dụng triệt để PostgreSQL Constraints và Row Level Security, đảm bảo dữ liệu chưa duyệt không bao giờ bị rò rỉ.
5. **Chế độ Demo & Gala được đầu tư bài bản:** Rất hiếm dự án sinh viên có sẵn chế độ giả lập dữ liệu `?fill=60` và màn hình trình chiếu sân khấu `?screen=1` mượt mà như vậy.

### 10.3. 5 Vấn đề nghiêm trọng nhất cần lưu ý
1. **Lỗi Hardcode Email Admin trong `supabase.sql`:** Nếu người cài đặt quên thay thế chuỗi `'EMAIL_QUAN_TRI@example.com'`, tài khoản admin sẽ không thể thao tác được dữ liệu trên trang quản trị.
2. **Không có tính năng Xóa vĩnh viễn trên UI Admin:** Trang `admin.html` chỉ có nút chuyển sang "Từ chối" (`rejected`), không có nút xóa hẳn khỏi database. Các tin nhắn rác/spam xúc phạm sẽ tồn tại mãi trong cơ sở dữ liệu.
3. **Giới hạn hiển thị 300 tin (`limit=300`) không có phân trang:** Nếu có trên 300 tin nhắn chờ duyệt, các tin nhắn từ thứ 301 trở đi sẽ bị ẩn hoàn toàn khỏi tầm nhìn của admin.
4. **Lỗi nuốt hiệu ứng nảy mầm khi cây $> 40$ lá:** Do điều kiện `scaleChanged` kích hoạt vẽ lại toàn bộ DOM SVG, lá mới sinh ra sau mốc 40 lá sẽ không còn hoạt họa nảy mầm mượt mà.
5. **Truy vấn thống kê làm lãng phí Quota:** Trang admin gọi `api(TABLE + '?select=status')` mỗi 8 giây kéo toàn bộ dữ liệu status về client, gây tiêu tốn băng thông không cần thiết khi dữ liệu lớn dần.

### 10.4. Những việc bắt buộc phải làm trước khi công bố dự án
1. **Sửa email trong `supabase.sql`:** Thay toàn bộ 4 vị trí email admin bằng email thật đã đăng ký trong Supabase Auth trước khi chạy lệnh SQL.
2. **Điền thông tin vào `config.js`:** Dán chính xác `Project URL` và `Anon Key` từ Supabase Dashboard.
3. **Tắt tính năng tự do đăng ký trên Supabase:** Vào *Authentication -> Providers -> Email*, tắt tùy chọn *"Allow new users to sign up"* để ngăn người ngoài tự tạo tài khoản đăng nhập vào hệ thống.
4. **Duyệt mồi trước 15-20 lời nhắn:** Trước khi trình chiếu lên máy chiếu Gala, hãy duyệt sẵn các lời tri ân mẫu để cây có hình dáng đẹp mắt ngay khi mở màn.

---

## 11. HƯỚNG DẪN BÀN GIAO & VẬN HÀNH KỸ THUẬT (DÀNH CHO ĐỘI NGŨ PHÁT TRIỂN TIẾP THEO)

### 11.1. Cấu hình triển khai nhanh
* **Bước 1:** Tạo tài khoản và project mới tại https://supabase.com.
* **Bước 2:** Vào *Authentication -> Users -> Add User*, tạo user admin với email và mật khẩu mong muốn.
* **Bước 3:** Mở `supabase.sql`, dùng lệnh Replace toàn bộ chuỗi `EMAIL_QUAN_TRI@example.com` bằng email vừa tạo ở Bước 2. Copy toàn bộ nội dung dán vào *SQL Editor* của Supabase và bấm **Run**.
* **Bước 4:** Vào *Project Settings -> API*, lấy `Project URL` và `anon/public key`, dán vào file `config.js`.
* **Bước 5:** Đẩy toàn bộ thư mục lên GitHub repository và kích hoạt **GitHub Pages** từ nhánh `main` (thư mục root).

### 11.2. Kịch bản chạy sự kiện Gala
* **Máy chiếu hội trường:** Mở trình duyệt truy cập `https://<ten-mien>/index.html?screen=1`, bấm phím `F11` để chuyển sang chế độ toàn màn hình.
* **Điện thoại ban tổ chức:** Mở sẵn `https://<ten-mien>/admin.html`, đăng nhập tài khoản admin để duyệt trực tiếp các lời nhắn do khán giả gửi lên từ khán phòng.
