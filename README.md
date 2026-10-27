# Pet Town v1.7 — Thế giới quái đồng bộ multiplayer

## Chạy trong VS Code

1. Cài Node.js 22 trở lên.
2. Mở thư mục project rồi chạy `npm run dev`.
3. Truy cập `http://localhost:5500` ở **hai tab** hoặc hai trình duyệt.
4. Mỗi tab hiển thị cùng một quần thể quái (máy chủ tạo duy nhất).

Lưu ý: Live Server không chạy máy chủ đồng bộ. Muốn test quái giống nhau trên 2 client, phải dùng `npm run dev`.

## Multiplayer và pet hoang dã

- Server quản lý **12 pet mỗi bản đồ ngoài thành**: `out-west`, `out-west-south`, `out-north`, `out-south`, `out-east`.
- Mỗi map chia **4 cột × 3 hàng** để quái trải đều, cách nhau tối thiểu 125 đơn vị trong map; quái bị hạ/bắt sẽ respawn **sau 10 giây** ở vị trí ngẫu nhiên mới trong cùng ô phân bố (nếu bản đồ chưa đủ 12 quái).
- Client 1 vào đánh pet hoang dã: server đánh dấu pet này đang giao chiến. Client 2 sẽ thấy người chơi/pet cùng thanh HP/MP và hiệu ứng kỹ năng ngay trên bản đồ (không bị chuyển sang màn hình chiến đấu riêng).
- Không thể hai người cùng đánh một pet hoang dã. Hệ thống PvP hai client từ bản cũ vẫn giữ lại.
- **Thứ tự ra đòn** theo tốc độ (cộng cấp độ) của pet; lượt người chơi **3 giây**, nếu không chọn skill thì tự đánh thường.
- Pet hoang dã tự chọn đòn theo cấp độ; HP/MP của trận PvE xử lý ở server, không độc lập theo từng client.
- Khi thắng, client nhận EXP và quái biến mất ở cả hai client. Bắt pet hoang dã có tỉ lệ cao hơn khi HP thấp/bị hiệu ứng bất lợi.

## Kỹ năng / VFX

- `assets/effects/`: 7 frame nền trong suốt cho mỗi hệ **Cỏ, Lửa, Nước, Đất, Điện, Băng, Gió, Bóng tối, Ánh sáng**, cùng **Cường nộ**, **Hồi phục**, **Hồi sinh** và **Đòn thường**.
- `src/wild-data.js`: chỉnh hệ pet, map spawn, số quái, thời gian respawn, hệ số cường nộ.
- `src/pet-data.js`: cấp mở skill, damage, MP; thú gió/ánh sáng là sprite demo đổi màu để tích hợp hiệu ứng.
- **Cường nộ** mở Lv.3, tiêu hao một lượt, tăng damage đòn kế tiếp dựa trên **bậc kỹ năng (1–5) và cấp pet**. Có thể nâng bậc tại nhà MAGIC khi đủ cấp và xu.
- Kỹ năng nguyên tố mở Lv.5 theo hệ tương ứng; pet đã đạt cấp có thể dùng ngay. Nhà MAGIC giữ kỹ năng cũ và giao diện học thử.

## Hồi phục tự nhiên

- Pet có **0 HP** hồi sinh sau 30 giây với **10 HP/10 MP**.
- Ngoài thành: đứng yên **5 giây**, sau đó hồi **10 HP và 10 MP mỗi 2 giây**; có thể nhấn **H** hoặc nút **Hồi phục** để vào trạng thái nghỉ ngay, nhưng không được di chuyển khi nghỉ.
- Trong thành: hồi tự nhiên mỗi 2 giây, không cần đợi 5 giây.
- Hồi nhanh tại NPC tóc xanh vẫn còn nguyên.
- Dùng Poke Ball và bình hồi phục được trong trận chiến pet hoang dã; vật phẩm trừ khi máy chủ xác nhận hành động.

## Kiểm thử

```bash
npm test
```

Gồm các test cũ (bản đồ, va chạm, shop, PvP) và ba test mới (`tests/shared-world.mjs`, `tests/shared-sockets.mjs`, `tests/effects.mjs`) xác nhận world chung, phân bố, tranh chấp quái, battle observer, tự đánh và hồi phục.

## Giới hạn prototype

- Máy chủ hiện giới hạn tối đa **hai kết nối** đồng thời; chưa có hệ thống tài khoản/DB. Reload server sẽ tạo lại vị trí quái mới.
- Dữ liệu pet và vật phẩm của người chơi vẫn lưu cục bộ trên trình duyệt; hệ thống kiểm chứng vật phẩm/EXP chống gian lận phía server chưa hoàn thiện.
- 13 bộ VFX là sprite **thử nghiệm** theo thuật toán, có thể thay frame PNG để nâng cao chất lượng mà không phải sửa logic.
- Gameplay trên các scene placeholder và điều kiện cấp/giá pet hiện là dữ liệu thử nghiệm.


## Chỉ số và kỹ năng
- Mỗi cấp tăng HP tối đa 8, MP tối đa 5, công 2, giáp 2, tốc độ 1 và chí mạng 0,5 điểm phần trăm (tối đa 50%). MP cơ bản tùy giống pet.
- Sát thương = (sức mạnh kỹ năng + công) × 100 / (100 + giáp), nhân 1,5 khi chí mạng; làm tròn và tối thiểu 1 với đòn gây sát thương. Cường nộ nhân sát thương đòn tiếp theo.
- Mỗi giống có một hệ chính; kỹ năng chung dùng được cho mọi hệ. Pet cũ tự loại kỹ năng sai hệ khi tải. HP/MP được lưu theo phần trăm để tương thích dữ liệu cũ.
- Hiệu ứng 9 hệ có 7 khung hình mỗi hệ tại assets/effects; kỹ năng nguyên tố sử dụng hiệu ứng tương ứng.
