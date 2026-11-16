# Cây Tri Ân Tây Nguyên – Code the Thanks 2026

Website nơi mỗi lời cảm ơn gửi thầy cô trở thành một chiếc lá trên cây tri ân chung.

**Tính năng đã chốt**
- Quét QR là dùng được ngay trên trình duyệt điện thoại: **không tài khoản, không đăng nhập**.
- Bước 1: nhập **tên hiển thị** hoặc chọn **gửi ẩn danh**. Bước 2: chọn người nhận (Thầy cô / Mái trường / Một bài học / Người truyền cảm hứng), viết lời nhắn, tick đồng ý hiển thị. Bước 3: thông báo "Cảm ơn bạn đã gieo một mầm xanh!".
- Lời nhắn có 3 trạng thái: `pending` (chờ duyệt) → `approved` (đã duyệt) / `rejected` (từ chối). **Chỉ lời đã duyệt mới hiện thành lá trên cây.**
- Bạn tự duyệt bằng trang `admin.html` (hoặc bảng Table Editor của Supabase).
- Cây tự cập nhật mỗi 8 giây, lá mới "nảy" ra có hiệu ứng nảy mầm và bung lá sinh động. Chạm vào lá để đọc lời tri ân dạng thiệp postcard.
- Chế độ trình chiếu "Khoảnh Khắc Cây Tri Ân" cho Gala: bấm nút `✨ Khoảnh Khắc Cây Tri Ân` hoặc thêm `?moment=1` / `?screen=1` (có mã QR offline, điều khiển Tạm dừng/Tiếp tục/Trước/Sau, chiếc lá tương ứng phát sáng).

## Cấu trúc thư mục

| File | Việc |
|---|---|
| `index.html`, `style.css`, `app.js` | Website chính |
| `qr.js` | Tạo mã QR (chạy offline, dùng cho chế độ màn hình lớn) |
| `config.js` | Dán URL + khóa công khai của Supabase |
| `admin.html` | Trang kiểm duyệt (đăng nhập bằng tài khoản admin) |
| `supabase.sql` | Tạo bảng + phân quyền bảo mật (RLS) |

## Thử ngay trên máy (chưa cần Supabase)
Để trống `config.js` thì website chạy **chế độ DEMO** (dữ liệu lưu trong trình duyệt, lá hiện ngay).
- VS Code: cài tiện ích **Live Server**, chuột phải `index.html` → *Open with Live Server*.
- Hoặc mở Terminal trong thư mục này: `python -m http.server 5500` rồi vào `http://localhost:5500`.
- Muốn cây đầy lá để quay video: thêm `?fill=60` (ví dụ `http://localhost:5500/index.html?fill=60`). Chỉ có tác dụng ở chế độ demo.

## Bước 1 – Tạo nơi lưu dữ liệu (Supabase)
1. Vào https://supabase.com, đăng ký và tạo project mới (miễn phí).
2. **Tạo tài khoản admin:** *Authentication → Users → Add user → Create new user*, nhập email + mật khẩu của bạn, tick *Auto Confirm User*.
3. **Tắt đăng ký công khai:** *Authentication → Sign In / Providers (hoặc Settings) → tắt "Allow new users to sign up"*. Như vậy chỉ mình bạn có tài khoản.
4. Mở file `supabase.sql`, **thay `EMAIL_QUAN_TRI@example.com` (4 chỗ trong file, dùng Ctrl+H để thay tất cả) bằng email admin của bạn**. Sau đó vào *SQL Editor → New query*, dán toàn bộ file và bấm **Run**.
5. Lấy khóa: *Project Settings → API* (hoặc *API Keys*). Chép **Project URL** và khóa **anon / publishable**.
   - Chỉ dùng khóa **anon / publishable**. **Không bao giờ** dán khóa `service_role` hay `secret` vào mã nguồn.
6. Mở `config.js`, dán 2 giá trị vào `SUPABASE_URL` và `SUPABASE_KEY`.

## Bước 2 – Đưa lên GitHub
1. Tạo repository **public** tên `cay-tri-an-tay-nguyen` trên https://github.com.
2. Đưa toàn bộ file trong thư mục này vào repository (kéo thả trên web: *Add file → Upload files*), bảo đảm `index.html` nằm ở thư mục gốc.

## Bước 3 – Bật GitHub Pages
*Settings → Pages → Build and deployment → Deploy from a branch → Branch `main` → thư mục `/ (root)` → Save.*
Sau 1–2 phút có địa chỉ dạng `https://TEN-TAI-KHOAN.github.io/cay-tri-an-tay-nguyen/`.

## Bước 4 – Tạo QR và kiểm thử
1. Mở `https://TEN-TAI-KHOAN.github.io/cay-tri-an-tay-nguyen/index.html?screen=1` trên máy tính: trang tự vẽ mã QR trỏ tới trang gửi lời cảm ơn. Chụp màn hình QR để đặt vào poster/slide/video.
2. Dùng điện thoại (bằng **4G/5G**, không phải Wi-Fi nhà bạn) quét QR, gửi thử một lời nhắn.
3. Mở `.../admin.html`, đăng nhập, bấm **✓ Duyệt**. Vài giây sau chiếc lá xuất hiện trên cây.
4. Xóa các lời nhắn thử trong tab *Từ chối* hoặc bằng Table Editor trước khi nộp bài.

## Dùng trong ngày thi / Gala
- Máy chiếu mở `index.html?screen=1` (bấm F11 để toàn màn hình). Để `admin.html` mở sẵn trên điện thoại để duyệt tại chỗ.
- Nên duyệt trước một số lời nhắn thật để cây không trống khi lên sân khấu; trong lúc trình diễn, khán giả quét QR và bạn duyệt từng lời cho lá nở trực tiếp.
- Giữ Wi-Fi hoặc 4G dự phòng. Đã có video demo dự phòng thì mang theo.

## Bảo mật & quyền riêng tư (đã làm sẵn)
- Row Level Security: khách chỉ **đọc** được lời đã duyệt và chỉ **gửi** được lời ở trạng thái chờ duyệt. Chỉ email admin mới đọc toàn bộ, duyệt và xóa.
- Ràng buộc ở máy chủ: lời nhắn 5–400 ký tự, tên ≤ 30 ký tự, phải có tên hoặc ẩn danh.
- Ô bẫy bot, giới hạn 20 giây giữa hai lần gửi trên cùng một trình duyệt; nội dung hiển thị bằng `textContent` nên không chèn được mã độc.
- Không thu email, số điện thoại, họ tên đầy đủ. Tên thầy cô là ô tùy chọn, bạn nên loại bỏ lời có họ tên thầy cô nếu chưa được đồng ý (thể lệ mục VI).
- Hạn chế còn lại: giới hạn tốc độ ở phía máy chủ chưa có (gói miễn phí). Nếu bị spam, vào Supabase xóa hàng loạt trong tab *Từ chối* hoặc tạm đóng quyền gửi.

## Hỏi nhanh
- **Lá không hiện sau khi gửi?** Đúng thiết kế: phải chờ bạn duyệt trong `admin.html`.
- **Admin báo lỗi/không thấy lời nhắn?** Kiểm tra email trong `supabase.sql` trùng với email đăng nhập, và đã chạy lại file sau khi sửa.
- **Cần đổi tần suất cập nhật?** Sửa `POLL_MS` trong `config.js`.
