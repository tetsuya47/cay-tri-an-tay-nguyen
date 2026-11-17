# LỘ TRÌNH TÍCH HỢP TỪNG BƯỚC
## UNIFIED PLATFORM INTEGRATION & DEPLOYMENT ROADMAP

> **Tài liệu:** Kế hoạch Triển khai Chi tiết và Tiêu chí Nghiệm thu Theo Từng Giai đoạn  
> **Phiên bản:** 1.0.0-PROPOSAL (Design & Preparation Phase)  
> **Ngày lập:** 17/11/2026  
> **Trạng thái:** DỰ THẢO THIẾT KẾ – CHỜ PHÊ DUYỆT (Chưa can thiệp mã nguồn)  
> **Tổng thời gian dự kiến:** 4 Tuần (Chia làm 6 Cột mốc kỹ thuật)

---

## 1. TỔNG QUAN TIẾN ĐỘ VÀ CÁC CỘT MỐC (ROADMAP OVERVIEW)

```
2026-11-17                                                                 SỰ KIỆN GALA 20/11
    │                                                                              │
    ▼                                                                              ▼
[M0: PHÊ DUYỆT] ──> [M1: MONOREPO] ──> [M2: CORE & GATEWAY] ──> [M3: BRIDGE] ──> [M4: DESKTOP] ──> [M5: TEST & SHIP]
 (Ngày 1)            (Ngày 2-3)          (Ngày 4-7)               (Ngày 8-11)      (Ngày 12-16)       (Ngày 17-21)
```

| Cột mốc | Tên cột mốc kỹ thuật | Thời lượng | Trọng tâm công việc | Đầu ra chính (Deliverables) |
| :---: | :--- | :---: | :--- | :--- |
| **M0** | **Phê duyệt Kiến trúc & Đóng băng** | 1 ngày | Đánh giá tài liệu thiết kế, xác nhận quyền sử dụng mã nguồn | 5 Tài liệu kiến trúc được ký duyệt; Bản backup toàn vẹn |
| **M1** | **Khởi tạo Monorepo & Git History** | 2 ngày | Tạo repo mới, hợp nhất 100% commit history, cấu hình pnpm workspace | `cay-tri-an-tay-nguyen-platform` với Git graph thống nhất |
| **M2** | **Tách Core & AI Gateway** | 4 ngày | Bóc tách `claude-gui-core`, `services/ai-gateway`, `packages/shared` | Packages độc lập, chạy đạt 37 bài unit tests gốc |
| **M3** | **Xây dựng Cầu nối Tích hợp** | 4 ngày | Phát triển `packages/integration`: AI Moderation, Supabase Bridge | Engine phân tích lời nhắn an toàn; Adapter Supabase JWT |
| **M4** | **Phát triển Desktop Cockpit** | 5 ngày | Tạo Unified Shell Navigation (Gratitude Space <-> AI Studio) | Ứng dụng Desktop chạy song song 2 không gian mượt mà |
| **M5** | **Kiểm thử Toàn diện & Đóng gói** | 5 ngày | Smoke test, Visual UI test, Đóng gói Windows `.exe`, CI/CD | Bộ cài đặt Windows hoàn chỉnh; GitHub Pages Live 100% |

---

## 2. CHI TIẾT TỪNG CỘT MỐC TRIỂN KHAI

### CỘT MỐC 0: PHÊ DUYỆT KIẾN TRÚC & ĐÓNG BĂNG MÔI TRƯỜNG (MILESTONE 0)
* **Mục tiêu:** Đảm bảo toàn bộ thiết kế được đồng thuận, không xảy ra sai sót khi bắt đầu thao tác tệp tin.
* **Các công việc cần làm:**
  1. Rà soát 5 tài liệu thiết kế: `UNIFIED_ARCHITECTURE.md`, `MIGRATION_PLAN.md`, `MODULE_MAPPING.md`, `SECURITY_DESIGN.md`, `INTEGRATION_ROADMAP.md`.
  2. Tạo bản sao lưu vật lý `E:\_BACKUPS_PRE_MIGRATION\` chứa file nén `.zip` và file Git `.bundle` của cả hai dự án.
  3. Xác nhận giấy phép và phạm vi sử dụng mã nguồn Claude GUI nội bộ cùng giảng viên.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  * Có văn bản/xác nhận phê duyệt từ người quản trị.
  * Thư mục sao lưu được kiểm tra giải nén thử nghiệm thành công.

---

### CỘT MỐC 1: KHỞI TẠO MONOREPO & BẢO TỒN LỊCH SỬ GIT (MILESTONE 1)
* **Mục tiêu:** Tạo repository mới quy tụ mã nguồn của cả hai dự án mà không làm mất lịch sử commit.
* **Các công việc cần làm:**
  1. Khởi tạo `E:\cay-tri-an-tay-nguyen-platform` với `pnpm-workspace.yaml`.
  2. Kéo Git history từ `E:\cay-tri-an-tay-nguyen` vào `apps/gratitude-web` qua `git remote add` và `git mv`.
  3. Kéo Git history từ `E:\edukids-team` qua `git merge --allow-unrelated-histories`.
  4. Hợp nhất `.gitignore`, `.editorconfig`, `eslint.config.mjs` và thiết lập `tsconfig.base.json`.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  * Lệnh `git log --graph --oneline` hiển thị đầy đủ các commit từ commit đầu tiên đến commit hiện tại (`3eb2ae7` và `8c8e7c9`).
  * Web `apps/gratitude-web/index.html` mở qua Live Server vẫn hoạt động bình thường, lá vẫn nở đầy đủ.

---

### CỘT MỐC 2: TÁCH CORE & CỔNG AI GATEWAY ĐA NGUỒN (MILESTONE 2)
* **Mục tiêu:** Biến các thành phần logic của Claude GUI thành các thư viện dùng chung độc lập với UI.
* **Các công việc cần làm:**
  1. Tạo `packages/shared`: Chứa các types, enum, hằng số IPC và đóng gói `Result<T>`.
  2. Tạo `packages/claude-gui-core`: Chuyển giao các module `orchestrator`, `cli-runner`, `queue`, `search`, `url-guard`.
  3. Tạo `services/ai-gateway`: Đóng gói `gateway.ts`, các adapter Gemini, Claude, OpenAI, Antigravity CLI và bộ điều phối model.
  4. Chuyển đổi và chạy thử nghiệm hệ thống unit tests kế thừa.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  * Lệnh `pnpm test:unit` chạy thành công toàn bộ 37 bài kiểm thử đơn vị.
  * Các package import lẫn nhau qua cơ chế `workspace:*` mà không gặp lỗi phân giải module (Module Resolution).

---

### CỘT MỐC 3: XÂY DỰNG BỘ CẦU NỐI TÍCH HỢP (MILESTONE 3)
* **Mục tiêu:** Thiết lập các kênh tương tác an toàn giữa AI và dữ liệu Cây Tri Ân.
* **Các công việc cần làm:**
  1. Viết module `packages/integration/src/supabase-bridge/`: Thực hiện các truy vấn có xác thực JWT Admin tới bảng `public.gratitude_messages`.
  2. Viết module `packages/integration/src/moderation/`: Tích hợp Gemini Flash với System Prompt kiểm duyệt sư phạm chuyên sâu.
  3. Viết module `packages/integration/src/teacher-assistant/`: Thuật toán tổng hợp cảm xúc, phân tích các chủ đề tri ân nổi bật.
  4. Viết bài kiểm thử liên thông (Integration Test) mô phỏng gửi tin nhắn giả lập -> AI quét nhãn -> Đọc kết quả gợi ý.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  * AI Moderation trả về kết quả JSON chính xác trong thời gian trung bình dưới 800ms.
  * Không phát sinh bất kỳ lỗi bảo mật nào (không có service_role key trong code).

---

### CỘT MỐC 4: PHÁT TRIỂN DESKTOP COCKPIT ĐA KHÔNG GIAN (MILESTONE 4)
* **Mục tiêu:** Hoàn thiện giao diện ứng dụng Desktop hợp nhất, cho phép chuyển đổi tức thì giữa hai không gian.
* **Các công việc cần làm:**
  1. Xây dựng Shell Navigation Header trong `apps/platform-desktop/src/renderer/App.tsx`.
  2. Tích hợp **Tab Gratitude Space**:
     * Bảng danh sách tin nhắn chờ duyệt (kèm nhãn AI xanh/đỏ).
     * Bảng xem trước trực quan Cây Tri Ân 2D.
     * Nút bật chế độ trình chiếu màn hình Gala (`?screen=1`).
     * Phím tắt duyệt nhanh (`[Enter]`: Duyệt, `[Delete]`: Từ chối).
  3. Tích hợp **Tab AI Innovation Studio**:
     * Khung chat đa tác tử, bàn tròn thảo luận, phòng học ảo 3D Three.js.
     * Bảng công cụ hỗ trợ giáo viên (phân tích số liệu, tạo bài phát biểu).
  4. Cấu hình bảo mật Electron: áp dụng `permissions.ts`, `safeStorage` mã hóa DPAPI trên Windows.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  * Chuyển đổi mượt mà giữa hai không gian mà không làm mất trạng thái (state preservation).
  * Trải nghiệm duyệt tin nhắn trực quan, tốc độ xử lý nhanh gấp 5 lần so với trang web `admin.html` cũ.

---

### CỘT MỐC 5: KIỂM THỬ TOÀN DIỆN, ĐÓNG GÓI WINDOWS & DEPLOY (MILESTONE 5)
* **Mục tiêu:** Hoàn thiện sản phẩm đóng gói sẵn sàng cho người dùng cuối và sự kiện Gala.
* **Các công việc cần làm:**
  1. Chạy Smoke Test tự động trên Electron (`npm run smoke`).
  2. Chạy UI Screenshot Regression Test (`npm run test:ui`).
  3. Đóng gói ứng dụng Windows bằng `electron-builder --win` tạo file `CayTriAnTayNguyenPlatform-Setup-1.0.0.exe`.
  4. Kiểm tra cài đặt và khởi chạy thực tế trên môi trường Windows sạch (Clean Windows 11 Machine).
  5. Thiết lập GitHub Actions Workflow tự động kiểm tra code và deploy `apps/gratitude-web` lên GitHub Pages.
* **Tiêu chí nghiệm thu (Acceptance Criteria):**
  * File cài đặt Windows chạy mượt mà, không bị Windows Defender chặn sai (false-positive).
  * Website GitHub Pages hoạt động độc lập 100%, quét mã QR trên điện thoại tải trang dưới 1.5 giây.
  * Toàn bộ tài liệu hướng dẫn sử dụng cho Ban Giám Hiệu và Ban Tổ Chức được bàn giao đầy đủ.

---

## 3. MA TRẬN PHÂN QUYỀN VÀ TRÁCH NHIỆM (RACI MATRIX)

| Nhiệm vụ chính | Trưởng nhóm Kỹ thuật (Architect) | Đội ngũ Phát triển Web (Web Dev) | Đội ngũ Trí tuệ Nhân tạo (AI Engine) | Ban Tổ Chức / Giảng viên (User) |
| :--- | :---: | :---: | :---: | :---: |
| **Phê duyệt Kiến trúc** | **R / A** | C | C | **A** |
| **Hợp nhất Git & Monorepo** | **A** | **R** | **R** | I |
| **Tách Core & AI Gateway** | A | I | **R** | I |
| **Bảo mật Supabase & RLS** | **A** | **R** | C | I |
| **Xây dựng Desktop Shell** | A | C | **R** | I |
| **Kiểm duyệt Thực tế Sự kiện** | I | I | I | **R / A** |

*(Ghi chú: R = Responsible (Người thực hiện), A = Accountable (Người chịu trách nhiệm chính), C = Consulted (Được tham vấn), I = Informed (Được thông báo))*

---

## 4. KẾ HOẠCH BÀN GIAO VÀ HƯỚNG DẪN VẬN HÀNH TẠI SỰ KIỆN GALA 20/11

1. **Chuẩn bị trước sự kiện 1 ngày:**
   * Cài đặt file `CayTriAnTayNguyenPlatform-Setup-1.0.0.exe` lên laptop chính kết nối máy chiếu hội trường.
   * Đăng nhập tài khoản Quản trị viên trong ứng dụng Desktop (phiên đăng nhập được lưu vĩnh viễn bằng DPAPI).
   * Cắm dây HDMI kết nối máy chiếu, mở cửa sổ hiển thị Cây Tri Ân ở chế độ toàn màn hình (`F11`).
2. **Trong giờ diễn ra Gala:**
   * Khán giả quét mã QR khổng lồ hiển thị ở góc màn hình chiếu để gửi lời chúc từ điện thoại.
   * Người trực máy mở Không gian Quản trị trên màn hình phụ của laptop:
     * AI tự động phân tích và gắn nhãn xanh cho các lời chúc chân thành, xúc động.
     * Người trực máy bấm `[Enter]` duyệt nhanh từng lời chúc.
     * Trong tích tắc, chiếc lá mới nảy mầm và bung nở rực rỡ trên màn hình lớn của hội trường trước sự chứng kiến của toàn thể thầy cô và sinh viên!
