# THIẾT KẾ AN NINH VÀ PHÂN QUYỀN
## UNIFIED SECURITY & PERMISSION SPECIFICATION

> **Tài liệu:** Đặc tả Thiết kế Bảo mật, Phân quyền và Quản trị Giấy phép  
> **Phiên bản:** 1.0.0-PROPOSAL (Design & Preparation Phase)  
> **Ngày lập:** 17/11/2026  
> **Trạng thái:** DỰ THẢO THIẾT KẾ – CHỜ PHÊ DUYỆT (Chưa áp dụng code)  
> **Phạm vi bảo vệ:**  
> - Không gian 1: Báo tường Tri Ân Công cộng (`apps/gratitude-web` & Supabase Cloud)  
> - Không gian 2: Trạm Chỉ huy Đa tác tử (`apps/platform-desktop`, `packages/claude-gui-core` & AI Gateway)

---

## 1. MÔ HÌNH NGUY CƠ VÀ CÁC NGUYÊN TẮC AN NINH CỐT LÕI

Hệ thống hoạt động trong môi trường giáo dục mở, phục vụ hàng ngàn học sinh gửi tin nhắn từ mạng internet công cộng, kết hợp với các tác tử AI có khả năng thực thi tác vụ. Do đó, kiến trúc bảo mật tuân thủ nghiêm ngặt mô hình **Phòng thủ Đa tầng (Defense-in-Depth)** và **Zero-Trust (Không tin tưởng mặc định)**.

```
+---------------------------------------------------------------------------------------------------+
|                                   7 NGUYÊN TẮC BẢO MẬT BẤT BIẾN                                   |
+---------------------------------------------------------------------------------------------------+
| 1. ZERO SERVICE_ROLE     | Tuyệt đối không nhúng service_role key vào bất kỳ file mã nguồn nào    |
| 2. ZERO AUTO-MUTATION    | AI không bao giờ được tự động duyệt, sửa, hoặc xóa dữ liệu production   |
| 3. HUMAN-IN-THE-LOOP     | Mọi thay đổi trạng thái lời nhắn bắt buộc có xác nhận từ người dùng    |
| 4. CLI SHELL ISOLATION   | Mọi lệnh thực thi OS qua spawn(..., { shell: false }) chống Injection   |
| 5. IPC WHITELIST ONLY    | Renderer không có quyền mở kênh IPC tự do; contextBridge cô lập 100%   |
| 6. HARDWARE ENCRYPTION   | API Keys và JWT Token lưu cục bộ được mã hóa bằng DPAPI/safeStorage   |
| 7. IP & LICENSING GUARD  | Không công khai hoặc thương mại hóa mã nguồn khi chưa xác nhận quyền   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. BẢO VỆ CƠ SỞ DỮ LIỆU VÀ GIỮ NGUYÊN SUPABASE RLS

### 2.1. Phân định ranh giới Khóa truy cập (Key Segregation)
* **Khóa Công khai (Anon / Publishable Key):**
  * Được phép cấu hình trong `apps/gratitude-web/config.js`.
  * Chỉ có quyền duy nhất: (1) `SELECT` các bản ghi có `status = 'approved'`, (2) `INSERT` bản ghi mới với điều kiện bắt buộc `status = 'pending'`.
  * Khách truy cập web hoàn toàn không thể đọc các tin nhắn đang chờ duyệt của người khác và không thể tự duyệt tin nhắn của mình.
* **Khóa Dịch vụ Siêu cấp (Service Role Key):**
  * **TUYỆT ĐỐI BỊ CẤM:** Không được lưu trong repository, không đưa vào file `.env`, không dán vào code web và không đóng gói vào file cài đặt Desktop `.exe`.
  * Mọi thao tác quản trị phải đi qua quy trình đăng nhập tài khoản Quản trị viên (Supabase GoTrue Auth) để sinh ra **Bearer JWT Token** cá nhân có thời hạn.

### 2.2. Bảo tồn 100% Chính sách Row Level Security (RLS)
Các chính sách đã thiết lập trong `E:\cay-tri-an-tay-nguyen\supabase.sql` được duy trì nguyên vẹn:
```sql
-- 1) Khách chỉ đọc được tin nhắn đã duyệt
create policy "khach_doc_da_duyet" on public.gratitude_messages
  for select to anon, authenticated
  using (status = 'approved');

-- 2) Khách chỉ được gửi tin nhắn ở trạng thái chờ duyệt
create policy "khach_gui_cho_duyet" on public.gratitude_messages
  for insert to anon, authenticated
  with check (status = 'pending');

-- 3) Chỉ Quản trị viên đã xác thực email mới được đọc tất cả, sửa trạng thái và xóa
create policy "admin_doc_tat_ca" on public.gratitude_messages
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'khuonghotruong1513@gmail.com');

create policy "admin_sua" on public.gratitude_messages
  for update to authenticated
  using      ((auth.jwt() ->> 'email') = 'khuonghotruong1513@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'khuonghotruong1513@gmail.com');

create policy "admin_xoa" on public.gratitude_messages
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'khuonghotruong1513@gmail.com');
```

---

## 3. LƯU TRỮ VÀ MÃ HÓA KHÓA BẢO MẬT BẰNG PHẦN CỨNG (SAFE STORAGE)

Ứng dụng Desktop Cockpit kế thừa trọn vẹn giải thuật mã hóa từ module `src/main/security/secret-box.ts` của Claude GUI:

### 3.1. Cơ chế mã hóa OS-Level
* **Trên Windows:** Tận dụng công nghệ **Windows Data Protection API (DPAPI)** thông qua Electron `safeStorage`. Dữ liệu được mã hóa bằng khóa mật mã gắn chặt với người dùng Windows đang đăng nhập (`CryptProtectData`).
* **Trên macOS:** Sử dụng hệ thống **Apple Keychain**.
* **Trên Linux:** Tích hợp **Secret Service API / GNOME Keyring**.

### 3.2. Cấu trúc lưu trữ an toàn
* Khóa sau khi mã hóa được lưu dưới định dạng chuỗi an toàn: `enc:v1:<base64-ciphertext>`.
* Khi hệ điều hành không hỗ trợ mã hóa phần cứng (hoặc máy chủ không có màn hình), hệ thống **từ chối lưu khóa** thay vì ghi văn bản thô ra ổ đĩa:
```typescript
export function encryptSecret(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Hệ điều hành không hỗ trợ mã hóa an toàn phần cứng (safeStorage unavailable). Từ chối lưu khóa.')
  }
  const buffer = safeStorage.encryptString(plaintext)
  return `enc:v1:${buffer.toString('base64')}`
}
```

---

## 4. AN TOÀN THỰC THI CLI VÀ NGĂN CHẶN COMMAND INJECTION

Các tính năng chạy tác vụ hệ thống (kế thừa từ `claude-gui-core`) tuân thủ nghiêm ngặt các quy tắc an toàn tiến trình:

1. **Vô hiệu hóa Shell hoàn toàn (`shell: false`):**
   * Trong `packages/claude-gui-core/src/runner/cli-runner.ts`, tiến trình con được khởi tạo bằng `child_process.spawn(binary, args, { shell: false })`.
   * Việc không sử dụng shell (`cmd.exe` hoặc `/bin/sh`) đảm bảo các ký tự đặc biệt nguy hiểm như `&`, `|`, `;`, `$`, `` ` `` không bao giờ bị phân tích như một lệnh nối tiếp.
2. **Tham số hóa mảng đối số (Argv Sanitization):**
   * Prompt của người dùng và các cờ tham số được truyền dưới dạng các phần tử độc lập trong mảng `args`.
   * Ví dụ: `['--print', '--output-format', 'stream-json', '--', userPrompt]` - chuỗi prompt nằm sau ký hiệu `--` ngăn chặn kẻ xấu chèn thêm flag dòng lệnh.
3. **Tuyệt đối không cấp quyền thực thi CLI cho Trình duyệt Web:**
   * Browser của Không gian 1 (Website Cây Tri Ân) chạy trên GitHub Pages hoàn toàn không có cầu nối nào tới máy chủ để chạy CLI.
   * Chỉ có ứng dụng Desktop Cockpit cài trên máy tính cá nhân của quản trị viên mới có quyền gọi các CLI đã cài đặt tại máy đó.

---

## 5. BẢO VỆ TẦNG IPC VÀ CÔ LẬP NGỮ CẢNH (IPC HARDENING)

Kiến trúc Electron trong `apps/platform-desktop` duy trì mô hình bảo mật cấp độ cao nhất của Chromium:

```
+-------------------------------------------------------------------------------------+
| RENDERER PROCESS (React 19 Frontend)                                                |
| - contextIsolation: true                                                            |
| - nodeIntegration: false                                                            |
| - window.api (Chỉ chứa các hàm wrapper tĩnh có kiểm tra kiểu dữ liệu)               |
+------------------------------------------+------------------------------------------+
                                           | (Chỉ đi qua contextBridge an toàn)
                                           v
+-------------------------------------------------------------------------------------+
| PRELOAD BARRIER (src/preload/index.ts)                                              |
| - Không để lộ require, process, Buffer hay ipcRenderer tự do                         |
| - Whitelist Channel Mapping: IPC.ask, IPC.approveMessage, IPC.settingsGet           |
+------------------------------------------+------------------------------------------+
                                           | (ipcRenderer.invoke với Payload chuẩn)
                                           v
+-------------------------------------------------------------------------------------+
| MAIN PROCESS (Node.js 22 Runtime)                                                   |
| - Input Validator (Kiểm tra UUID, Regex, Độ dài chuỗi)                              |
| - Result<T> Standardized Response                                                   |
| - Permission Request Handler: Từ chối tất cả ngoại trừ Micro có xác minh            |
+-------------------------------------------------------------------------------------+
```

### 5.1. Danh mục kênh IPC được phép (IPC Whitelist)
Chỉ các kênh định danh trước mới được lắng nghe trong Main Process:
* `GRATITUDE_CHANNELS`: `fetchPending`, `approve`, `reject`, `batchApprove`, `getStats`.
* `AI_STUDIO_CHANNELS`: `ask`, `cancel`, `listConversations`, `createConversation`.
* `SETTINGS_CHANNELS`: `getSettings`, `setSetting`, `setApiKey`.
* `SEARCH_CHANNELS`: `searchQuery` (chạy qua `url-guard.ts`).

Mọi tin nhắn gửi lên kênh lạ đều bị hệ thống ghi log cảnh báo và ngắt kết nối ngay lập tức.

---

## 6. CHÍNH SÁCH KIỂM DUYỆT CÓ CON NGƯỜI GIÁM SÁT (HUMAN-IN-THE-LOOP)

Để bảo đảm tính trong sáng và nhân văn của sự kiện tri ân Nhà giáo, hệ thống thiết lập rào cản đạo đức AI:

1. **AI chỉ là Trợ lý phân tích (Advisory Copilot):**
   * Mô hình AI (Gemini Flash / Claude) quét lời nhắn và trả về chỉ số:
     * `toxicity_score`: Thang điểm từ 0.0 đến 1.0.
     * `sentiment`: Tích cực, Cảm động, Hoài niệm, Hài hước.
     * `flags`: Cảnh báo nếu phát hiện tên người nhạy cảm hoặc từ ngữ cấm.
2. **Không tự động chuyển trạng thái `approved`:**
   * Hệ thống **tuyệt đối không kích hoạt lệnh `UPDATE public.gratitude_messages SET status = 'approved'` tự động từ phía máy chủ**.
   * Trên giao diện Desktop Cockpit, các tin nhắn an toàn được bôi màu xanh lá, nhưng người quản trị vẫn phải bấm phím tắt `[Enter]` hoặc nút `Duyệt` để phát lệnh cập nhật.
3. **Cảnh báo kép khi Xóa (Double Confirmation for Deletion):**
   * Hành động xóa vĩnh viễn lời nhắn (`status = 'rejected'` -> `DELETE`) đòi hỏi một hộp thoại xác nhận thứ hai (Confirmation Modal), tránh việc quản trị viên vô tình làm mất kỷ niệm của sinh viên.

---

## 7. PHÒNG THỦ CHỐNG TẤN CÔNG SSRF VÀ LIÊN KẾT ĐỘC HẠI

Module `src/main/search/url-guard.ts` (kế thừa từ Claude GUI) được kích hoạt để kiểm soát toàn bộ lưu lượng mạng ra ngoài:

* **Chặn đứng địa chỉ IP nội bộ (Private / Loopback IP Ranges):**
  * `127.0.0.0/8`, `0.0.0.0/8` (Localhost).
  * `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Mạng nội bộ trường học / LAN).
  * `169.254.169.254` (AWS/GCP Cloud Metadata Service).
* **Phát hiện biến thể lẩn tránh (Evasion Bypasses):**
  * Tự động giải mã các định dạng biến thể như địa chỉ IP dạng Hex (`0x7f000001`), Octal (`017700000001`), Integer (`2130706433`), IPv6 ánh xạ IPv4 (`::ffff:127.0.0.1`), ngăn chặn kẻ xấu lợi dụng tính năng trích xuất web của AI để thăm dò máy chủ nội bộ.

---

## 8. QUẢN TRỊ BẢN QUYỀN VÀ BẢO VỆ MÃ NGUỒN (IP & LICENSING GOVERNANCE)

Theo chỉ đạo của Ban Giảng Huấn và quy định sử dụng mã nguồn được chia sẻ:

1. **Phạm vi Sử dụng Nội bộ & Học thuật:**
   * Mã nguồn dự án Claude GUI (`E:\edukids-team`) được cấp quyền cho mục đích học tập, nghiên cứu và xây dựng nền tảng nội bộ phục vụ sự kiện của Trường.
2. **Bảo mật Kho Mã Nguồn (Private Repository Enforcement):**
   * Repository hợp nhất hoặc repository chứa mã nguồn Desktop/Core bắt buộc phải được thiết lập ở chế độ **Private (Riêng tư)** trên GitHub/GitLab.
   * Chỉ có website tĩnh công cộng `apps/gratitude-web` (chỉ chứa HTML, CSS, SVG và mã kết nối Supabase Anon Key) mới được phép cấu hình Public trên GitHub Pages để người dùng quét QR.
3. **Không Phân phối Thương mại Trái phép:**
   * Tuyệt đối không tự ý đăng tải lại mã nguồn gốc của giảng viên lên các diễn đàn công cộng, không gán giấy phép thương mại khi chưa có sự xác nhận bằng văn bản của tác giả (`quangnvaws@gmail.com`).

---
*Bản thiết kế an ninh này là cam kết kỹ thuật bắt buộc. Bất kỳ sự thay đổi nào làm suy yếu các rào cản trên đều bị coi là vi phạm tiêu chuẩn chất lượng hệ thống.*
