-- =====================================================================
--  CÂY TRI ÂN TÂY NGUYÊN – thiết lập Supabase
--  Cách dùng: Supabase > SQL Editor > New query > dán toàn bộ file > Run
--  TRƯỚC KHI CHẠY: thay 'EMAIL_QUAN_TRI@example.com' (4 chỗ, dùng Ctrl+H thay tất cả) bằng email admin của bạn.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.gratitude_messages (
  id              uuid primary key default gen_random_uuid(),
  sender_name     text,
  is_anonymous    boolean not null default false,
  recipient_type  text not null
                  check (recipient_type in ('thay_co','mai_truong','bai_hoc','nguoi_truyen_cam_hung')),
  recipient_name  text,
  message         text not null check (char_length(btrim(message)) between 5 and 400),
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  created_at      timestamptz not null default now(),
  constraint sender_name_len    check (sender_name is null or char_length(sender_name) <= 30),
  constraint recipient_name_len check (recipient_name is null or char_length(recipient_name) <= 40),
  -- hoặc ẩn danh, hoặc phải có tên hiển thị
  constraint name_or_anonymous  check (is_anonymous or char_length(btrim(coalesce(sender_name,''))) >= 2)
);

create index if not exists gratitude_messages_status_created_idx
  on public.gratitude_messages (status, created_at);

-- Bật Row Level Security (bắt buộc)
alter table public.gratitude_messages enable row level security;

-- Quyền ở mức bảng: khách chỉ được đọc + thêm; admin (đã đăng nhập) được sửa/xóa
revoke all on public.gratitude_messages from anon, authenticated;
grant select, insert on public.gratitude_messages to anon;
grant select, insert, update, delete on public.gratitude_messages to authenticated;

-- Xóa policy cũ nếu chạy lại file này
drop policy if exists "khach_doc_da_duyet"   on public.gratitude_messages;
drop policy if exists "khach_gui_cho_duyet"  on public.gratitude_messages;
drop policy if exists "admin_doc_tat_ca"     on public.gratitude_messages;
drop policy if exists "admin_sua"            on public.gratitude_messages;
drop policy if exists "admin_xoa"            on public.gratitude_messages;

-- 1) Khách chỉ ĐỌC được lời nhắn đã duyệt
create policy "khach_doc_da_duyet" on public.gratitude_messages
  for select to anon, authenticated
  using (status = 'approved');

-- 2) Khách chỉ GỬI được lời nhắn ở trạng thái chờ duyệt
create policy "khach_gui_cho_duyet" on public.gratitude_messages
  for insert to anon, authenticated
  with check (status = 'pending');

-- 3) Chỉ tài khoản admin (đúng email) mới đọc tất cả, duyệt/từ chối, xóa
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

-- (Tuỳ chọn) Duyệt nhanh bằng SQL nếu không dùng trang admin.html:
--   update public.gratitude_messages set status = 'approved' where status = 'pending';
