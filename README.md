# Pet Town — Multiplayer Wi-Fi/LAN & bến thuyền Mỏ Neo

## Chơi chung trên nhiều máy qua Wi-Fi/LAN

1. Chọn **một máy làm máy chủ**, cài Node.js 22 trở lên và mở thư mục project.
2. Chạy `npm ci`, sau đó `npm start` (hoặc `npm run dev`).
3. Máy chủ lắng nghe trên `0.0.0.0:5500` và in các địa chỉ LAN, ví dụ `http://192.168.1.10:5500`.
4. Điện thoại và máy tính cùng Wi-Fi/LAN mở **cùng địa chỉ IP của máy chủ** trong trình duyệt. Không dùng `localhost` trên máy khác và không chạy một server riêng trên từng máy.
5. Các máy nhìn thấy cùng người chơi, quái, trận đấu và thay đổi bản đồ. Thanh trạng thái hiển thị số người online và tự kết nối lại khi mạng phục hồi.

Nếu không vào được từ thiết bị khác: kiểm tra IP LAN của máy chủ, cho phép TCP cổng 5500 trong tường lửa của máy chủ và tránh mạng khách bật cách ly thiết bị. Máy chủ cần tiếp tục chạy trong lúc chơi. Live Server chỉ phục vụ file tĩnh, không có thế giới multiplayer.

| Biến cấu hình | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Lắng nghe trên các giao diện mạng IPv4 |
| `PORT` | `5500` | Cổng HTTP và WebSocket `/ws` |
| `MAX_CLIENTS` | `64` | Số kết nối tối đa, chấp nhận 1–256 |

Ví dụ Bash: `PORT=8080 MAX_CLIENTS=32 npm start`. PowerShell: `$env:PORT=8080; $env:MAX_CLIENTS=32; npm start`.

`GET /health` trả trạng thái máy chủ, số người đang kết nối và giới hạn kết nối. Mỗi cặp PvP có trận riêng; nhiều cặp PvP và nhiều trận PvE có thể diễn ra đồng thời. Thư viện `ws` xử lý WebSocket, heartbeat và ngắt kết nối; máy chủ dọn trận khi người chơi rời đi.

Muốn chơi qua Internet, chạy cùng máy chủ trên host mà các thiết bị truy cập được và cấu hình reverse proxy HTTPS chuyển tiếp cả HTTP và WebSocket `/ws` (giữ header `Host` và hỗ trợ Upgrade). Client tự dùng WSS khi trang là HTTPS. Mã nguồn này chưa tự triển khai lên Internet; IP riêng của container cloud không phải IP Wi-Fi của máy tính tại nhà.

## Bến thuyền và người lái đò

- Từ **làng phía Tây**, đi xuống **khu phía Nam của làng**, rồi theo đường sang phải để đến **Bến thuyền Mỏ Neo** (`out-harbor`). Lối bên trái bến đưa bạn về khu nam làng.
- Asset `assets/out-harbor.png` là bản đồ 1536×1024 vẽ lại từ ảnh tham chiếu: đồng bộ phong cách rừng/cỏ/đường đất với hai map làng, bỏ khung điện thoại, giao diện và các nhân vật khác; giữ duy nhất người lái đò đội mũ xanh có biểu tượng mỏ neo.
- Đến gần người lái đò ở cầu tàu, nhấn **E**, nút **Giao tiếp**, hoặc nhấp để mở bảng chọn chuyến đi. Chọn **Thành trì Pet Town** để đi nhanh miễn phí. Người lái đò ở phía đông nam thành trì có tuyến quay lại bến.
- Máy chủ kiểm tra điểm đến, khoảng cách tới NPC và trạng thái chiến đấu trước khi chuyển map; các client khác nhận vị trí mới qua snapshot chung.
- Nước, bệ tượng, bồn hoa và chân cây có va chạm; mái nhà và tán cây che nhân vật theo độ sâu. Menu bản đồ hiển thị asset bến cùng vị trí người lái đò.
- Bến là khu an toàn, không sinh thêm quái; năm map quái cũ giữ nguyên số lượng.

## Multiplayer và pet hoang dã

- Server quản lý **12 pet mỗi bản đồ ngoài thành**: `out-west`, `out-west-south`, `out-north`, `out-south`, `out-east`.
- Mỗi map chia **4 cột × 3 hàng** để quái trải đều, cách nhau tối thiểu 125 đơn vị trong map; quái bị hạ/bắt sẽ respawn **sau 10 giây** ở vị trí ngẫu nhiên mới trong cùng ô phân bố (nếu bản đồ chưa đủ 12 quái).
- Client 1 vào đánh pet hoang dã: server đánh dấu pet này đang giao chiến. Client 2 sẽ thấy người chơi/pet cùng thanh HP/MP và hiệu ứng kỹ năng ngay trên bản đồ (không bị chuyển sang màn hình chiến đấu riêng).
- Không thể hai người cùng đánh một pet hoang dã. Các cặp PvP có trận riêng, không chặn những người chơi còn lại.
- **Thứ tự ra đòn** theo tốc độ (cộng cấp độ) của pet; lượt người chơi **3 giây**, nếu không chọn skill thì tự đánh thường.
- Pet hoang dã tự chọn đòn theo cấp độ; HP/MP của trận PvE xử lý ở server, không độc lập theo từng client.
- Khi thắng, client nhận EXP và quái biến mất trên mọi client. Bắt pet hoang dã có tỉ lệ cao hơn khi HP thấp/bị hiệu ứng bất lợi.

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

Chạy đủ 9 tệp kiểm thử: progression, smoke, scenes, navigation, features, shared-world, shared-sockets, effects, multiplayer. Các test khởi động/dừng máy chủ riêng trên cổng 58213, 58227 và 58241; cần để trống các cổng này.

`tests/multiplayer.mjs` kiểm tra 8 kết nối đồng thời (có kết nối qua IP mạng nếu có), hai trận PvP và hai trận PvE cùng lúc, khóa quái, giới hạn kết nối, giải phóng slot/quái khi rời mạng, tuyến đò hai chiều và đồng bộ tới người quan sát. `tests/navigation.mjs` kiểm tra đường đi tới NPC, lối sang/về bến, điểm đặt an toàn và va chạm nước/tượng. Tám kết nối là mức đã kiểm thử chức năng, chưa phải benchmark tải 64 người.

## Giới hạn prototype

- Máy chủ mặc định tối đa **64 kết nối** đồng thời; chưa có hệ thống tài khoản/DB. Reload server sẽ tạo lại vị trí quái mới. Kết nối lại tạo phiên người chơi mới, không tiếp tục trận cũ.
- Dữ liệu pet và vật phẩm của người chơi vẫn lưu cục bộ trên trình duyệt; hệ thống kiểm chứng vật phẩm/EXP chống gian lận phía server chưa hoàn thiện.
- 13 bộ VFX là sprite **thử nghiệm** theo thuật toán, có thể thay frame PNG để nâng cao chất lượng mà không phải sửa logic.
- Gameplay trên các scene placeholder và điều kiện cấp/giá pet hiện là dữ liệu thử nghiệm.


## Chỉ số và kỹ năng
- Mỗi cấp tăng HP tối đa 8, MP tối đa 5, công 2, giáp 2, tốc độ 1 và chí mạng 0,5 điểm phần trăm (tối đa 50%). MP cơ bản tùy giống pet.
- Sát thương = (sức mạnh kỹ năng + công) × 100 / (100 + giáp), nhân 1,5 khi chí mạng; làm tròn và tối thiểu 1 với đòn gây sát thương. Cường nộ nhân sát thương đòn tiếp theo.
- Mỗi giống có một hệ chính; kỹ năng chung dùng được cho mọi hệ. Pet cũ tự loại kỹ năng sai hệ khi tải. HP/MP được lưu theo phần trăm để tương thích dữ liệu cũ.
- Hiệu ứng 9 hệ có 7 khung hình mỗi hệ tại assets/effects; kỹ năng nguyên tố sử dụng hiệu ứng tương ứng.
