# HAMICHEE Ordering v2

App đặt món và tích điểm dùng Next.js + Supabase. App nằm trong thư mục riêng để cùng repository với app giao việc nhưng không trộn source.

## Biến môi trường

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng phía server, bật Sensitive trên Vercel)

## Khởi tạo database

Mở Supabase → SQL Editor và chạy toàn bộ `supabase/migrations/001_ordering_v2.sql` đúng một lần. Migration có thể chạy lại an toàn; dữ liệu menu/điểm hiện có không bị ghi đè.

Tài khoản Supabase cũ được tạo sớm nhất sẽ là Admin ban đầu. Khách đăng ký mới luôn có vai trò `customer`.

## Vercel

Project `hamichee-ordering` dùng Root Directory là `ordering-app`.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run lint
npm run build
```
