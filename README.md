# Cơm Tấm Làng - Web app sắp lịch làm việc

App Next.js/React/TypeScript/TailwindCSS dùng để sắp lịch làm việc cho cửa hàng F&B theo file Excel mẫu của Cơm Tấm Làng.

## 1. Những quy tắc đã đưa vào app

- Ca sáng chuẩn: 05:30-14:30.
- Ca chiều mặc định: 14:00-22:00, có thể chỉnh trong trang Quy tắc.
- 5 vị trí chuẩn: Trưởng ca, Bán hàng, Phụ bếp/Bếp nướng, Bếp nướng, Phụ bếp.
- Full-time xoay ca: Linh, Nhân, Thắng, Tuấn, Danh.
- Còn lại là part-time.
- Tối đa 12 tiếng/ngày, 70 tiếng/tuần.
- Khi tạo lịch, app ưu tiên đủ vị trí quan trọng trước: Trưởng ca, Bếp nướng, Phụ bếp/Bếp nướng, Phụ bếp, sau đó đến Bán hàng.
- Nếu thiếu người, app tạo dòng cảnh báo rõ ngày, ca, vị trí.
- OCR ảnh Zalo chỉ là dữ liệu nháp. Chủ quán phải kiểm tra/sửa trước khi tạo lịch.

## 2. Định mức gợi ý đã seed sẵn

App đã seed sẵn định mức nhân sự theo thứ/ca/vị trí dựa trên tổng hợp 2 tháng gần nhất trong file mẫu, đã loại các ngày lễ dễ làm lệch số liệu.

Lưu ý dữ liệu file có một lỗi cần cảnh báo: sheet `Lịch 274 - 35` có tên giống tuần 27/04-03/05, nhưng ô ngày trong sheet đang để 04/04-10/04. Khi dùng thật, app nên cảnh báo trường hợp tên sheet và ngày trong bảng không khớp.

## 3. Cách chạy local

```bash
npm install
npm run dev
```

Mở trình duyệt tại:

```bash
http://localhost:3000
```

## 4. Cách deploy lên Vercel

1. Tạo repo GitHub mới.
2. Upload toàn bộ thư mục này lên GitHub.
3. Vào Vercel > Add New Project.
4. Chọn repo vừa upload.
5. Framework Preset: Next.js.
6. Bấm Deploy.

Mỗi lần sửa code và push lên GitHub, Vercel sẽ tự deploy lại.

## 5. Cách sử dụng

1. Vào trang `Nhập dữ liệu`.
2. Upload file Excel lịch mẫu để app đọc danh sách nhân viên/format.
3. Upload ảnh Zalo hoặc dán nội dung lịch học/lịch bận.
4. Kiểm tra bảng lịch đăng ký đã đọc.
5. Vào `Nhân viên` để chỉnh vị trí, loại nhân viên, kỹ năng.
6. Vào `Quy tắc` để chỉnh định mức từng thứ/ca/vị trí.
7. Vào `Tạo lịch`, chọn ngày thứ 2 đầu tuần, bấm `Tạo lịch`.
8. Kiểm tra cảnh báo thiếu người, chỉnh tay nếu cần.
9. Vào `Xuất lịch` để xuất Excel, in A4 hoặc copy gửi Zalo.

## 6. Cách cập nhật thêm nhân viên/ca/vị trí/định mức

- Thêm nhân viên: vào trang `Nhân viên` hoặc sửa file `lib/seed.ts`.
- Đổi full-time/part-time: chỉnh trực tiếp trong bảng nhân viên.
- Đổi ca sáng/ca chiều: vào trang `Quy tắc`.
- Đổi định mức từng thứ: vào bảng `Định mức nhân sự` trong trang `Quy tắc`.
- Thêm vị trí mới: sửa `POSITIONS` trong `lib/types.ts`, sau đó bổ sung seed trong `lib/seed.ts`.

## 7. Gợi ý nâng cấp sau

Giai đoạn 1 đang dùng LocalStorage để đơn giản, phù hợp chạy thử tại 1 cửa hàng.

Khi mở nhiều cửa hàng, nên nâng cấp:

- Database: Supabase hoặc PostgreSQL.
- Auth: phân quyền chủ quán, kế toán, quản lý vận hành.
- OCR tốt hơn: dùng Google Vision API hoặc OpenAI Vision API để đọc bảng Zalo chính xác hơn.
- Xuất Excel giống 100% file gốc: dùng API server + ExcelJS để giữ style, merge cell, border, màu sắc.
