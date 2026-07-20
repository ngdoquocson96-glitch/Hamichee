# HAMICHEE Ordering v2

App đặt món và tích điểm dùng Next.js + Supabase. App nằm trong thư mục riêng để cùng repository với app giao việc nhưng không trộn source.

## Giao hàng

- Admin tạo/cấp quyền shipper tại `/admin/shippers` và phân đơn tại `/admin/orders`.
- Shipper đăng nhập tại `/shipper`, gọi khách, mở Google Maps và cập nhật từng bước giao.
- Khi giao thành công, shipper phải chụp ảnh xác nhận; ảnh được lưu trong bucket riêng tư `ordering-delivery-proof`.
- COD dự kiến/thực thu, lịch sử giao và trạng thái được đồng bộ realtime cho Admin và khách.

## Biến môi trường

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng phía server, bật Sensitive trên Vercel)

## Khởi tạo database

Mở Supabase → SQL Editor và chạy các file trong `supabase/migrations` theo thứ tự. Với hệ thống hiện tại, chạy thêm `003_shipper_module.sql`. Migration có thể chạy lại an toàn; dữ liệu menu/điểm hiện có không bị ghi đè.

Tài khoản Supabase cũ được tạo sớm nhất sẽ là Admin ban đầu. Khách đăng ký mới luôn có vai trò `customer`.

## Vercel

Project `hamichee-ordering` dùng Root Directory là `ordering-app` và Framework Preset là `Next.js`.
Ba biến Supabase phía trên phải được bật cho cả `Production and Preview` để PR Preview có thể build và đăng nhập.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run lint
npm run build
```
