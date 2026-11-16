// ===== CẤU HÌNH =====
// Để trống SUPABASE_URL / SUPABASE_KEY => website chạy ở CHẾ ĐỘ DEMO (dữ liệu lưu tạm trong trình duyệt).
// Khi đã tạo Supabase, dán "Project URL" và khóa "anon public" (hoặc "publishable") vào đây.
// TUYỆT ĐỐI KHÔNG dán khóa "service_role" / "secret" vào file này.
window.CTT_CONFIG = {
  SUPABASE_URL: "https://edimigwtfgqwtjphyemz.supabase.co",   // ví dụ: "https://abcdxyz.supabase.co"
  SUPABASE_KEY: "sb_publishable_pTw1CPuqf5DXFVqBMRw83Q_64nO7U0-",   // ví dụ: "eyJhbGciOi..." hoặc "sb_publishable_..."
  POLL_MS: 8000       // tần suất cập nhật cây (mili giây)
};
