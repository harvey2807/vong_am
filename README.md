# VONG ÂM — Tiếng Gọi Sau Cánh Cửa (prototype web)

Prototype kinh dị góc nhìn thứ nhất, Babylon.js + TypeScript + Vite. Âm thanh tổng hợp bằng Web Audio.
Texture tường/trần/gỗ/gạch/đất là ảnh thật CC0 từ Poly Haven (`public/textures`, xem `CREDITS.txt`);
còn lại (gạch bông, câu đối, bùa, di ảnh, hình nhân...) vẽ bằng Canvas.

## Chạy

```bash
npm install
npm run dev        # mở http://localhost:5173
npm run build      # bản build tĩnh trong dist/
npm run play       # build rồi chạy bản gọn ở http://localhost:4173 (ổn định hơn bản dev)
npm run package    # build + nén thành vongam-web.zip để upload itch.io
```

Điều khiển: **WASD** di chuyển · **Shift** chạy · **E** tương tác / đóng giấy / ra khỏi tủ · **F** đèn pin · **Esc** tạm dừng.
Nên đeo tai nghe: tiếng gọi và tiếng gõ cửa là âm thanh 3D (HRTF).

Chơi liền mạch như một câu chuyện: màn hình chính chỉ có **Bắt đầu / Tiếp tục / Chơi lại từ đầu**. Mỗi đêm mở bằng
một **màn chuyển chương** (đoạn kể nối truyện, `intro` trong `src/core/levels.ts`); thắng thì "Tiếp tục — Đêm sau",
chết thì "Thử lại đêm này". Tiến trình lưu trong trình duyệt. Phá đảo (kết thúc thật của đêm cuối) mới mở mục
**Hồi tưởng** để chơi lại từng đêm. Thử nhanh một đêm: thêm `?dem=3` vào URL.



## Độ khó & cơ chế sinh tồn

- **Thể lực**: chạy ~5 giây thì hết hơi (không có thanh hiển thị — nghe tiếng thở dốc, viền màn hình tối lại).
  Hết hơi: không chạy được, tiếng thở thành tiếng động thực thể nghe thấy ở gần. Nghỉ ~2 giây mới chạy lại.
- **Nín thở trong tủ**: khi Người Gõ Cửa đứng nghe ngoài cửa tủ, giữ `Space`. Không nín quá 1,2 giây → nó nghe thấy;
  nín quá lâu (Dễ 11s / Thường 8s / Khó 6,5s) → sặc → bị lôi ra.
- **Độ khó** (Cài đặt): hệ số trong `src/core/difficulty.ts` cho tốc độ/tầm nhìn/tầm nghe của thực thể, tốc độ hình nhân,
  thể lực, thời gian nín thở. Tốc độ đuổi mặc định 3,1 m/s.
- **Giấy**: 5 chất liệu (`paper` trong `data/notes.json`: school vở ô li mực tím, diary sổ tay kẻ dòng, pencil bút chì,
  do giấy dó có dấu mộc, burnt cháy xém), mép rách bằng bộ lọc SVG, chia trang (`pages`, lật bằng A/D hoặc ←/→),
  `[[...]]` = dòng mực đỏ tự viết thêm sau ~3 giây đọc (kèm tiếng thì thầm sát tai). Cài đặt "Chữ trên giấy: Chữ in" để dễ đọc.
- **Action kịch bản mới**: `door` (đóng/mở cửa — đóng sầm kêu to, HUD chớp), `objective` có `glitch` (dòng nhiệm vụ bị chiếm).

## Nhân vật & bàn thờ dạng ảnh (sprite)

Con ma (Người Gõ Cửa), hai hình nhân giấy và các chân dung trên bàn thờ được cắt từ ảnh concept trong
`reference/concept/` → `public/textures/sprites/` (tách nền bằng `rembg` model u2netp, làm cứng alpha, cắt sát).
Vì là ảnh do người dùng cung cấp, **hãy chắc chắn bạn có quyền dùng chúng** trước khi phát hành.

- `src/world/sprites.ts`: `Sprite` = mặt phẳng billboard trục Y (luôn quay về người chơi), tâm xoay đặt đúng khuôn mặt;
  `setFace("normal" | "blank" | "rage" | "grab")` vẽ đè lên ảnh gốc: mặt bị xóa trắng như giấy, hốc mắt đen chảy, miệng há.
- Người Gõ Cửa: hình ma tóc xõa cao 2,05 m; khối hình học cũ chỉ hiện khi nó giả làm Út (Đêm cuối) và rơi ra lúc bắt.
  Jumpscare áp đúng khuôn mặt ảnh vào giữa màn hình.
- Hình nhân (bàn thờ + Đêm 3/4): bé trai/bé gái giấy cỡ người thật; thức dậy → mặt trắng trơn; vồ → hốc mắt đen.
  Hình nhân thế mạng ngoài giàn hỏa (Yard) vẫn là mô hình vì cần mặc áo, dán ảnh.
- Bàn thờ: di ảnh bà (giữa, trên khám), ông và chú (hai bên) vẽ từ chân dung thật — ngả nâu, ố mép, lấm tấm;
  Đêm 3+ di ảnh bà bị cạo mặt, cào xước. Ảnh gia đình (`drawPhoto`) ghép mặt thật, viền nhòe như ảnh cũ;
  người thứ năm mờ nhòe với hốc mắt rỗng, biến thể 7 thì mọi khuôn mặt bị xóa.
- Ảnh tải không đồng bộ (`portraitsReady`); nơi nào vẽ lúc khởi động sẽ tự vẽ lại khi ảnh tới.

## Giao diện (UI)

Tham chiếu: art bible trong `reference/concept/` (thư mục này không đóng gói; chỉ các mảnh cắt trong `public/textures/sprites/`). Toàn bộ là DOM + CSS phủ trên canvas Babylon,
điều khiển từ `src/ui/Hud.ts`; không dùng framework.

- **Design token** (`src/style.css`, `:root`): bảng màu lấy mẫu từ art bible — nâu vàng gỗ cũ, gỉ sét, rêu, xanh lam lạnh,
  nâu gỗ sẫm, xám đá, đỏ máu sẫm (đỏ chỉ dùng cho khoảnh khắc quan trọng); chữ màu ngà bẩn.
- **Phông** (đóng gói trong `src/fonts/`, SIL OFL, đủ dấu tiếng Việt): Cormorant Garamond (tiêu đề), Noto Serif (thân chữ,
  phụ đề), Be Vietnam Pro (gợi ý, nhiệm vụ, cài đặt), Patrick Hand (chữ viết tay trên giấy).
- **Màn hình chính** (`src/ui/MenuBackground.ts`): cảnh hẻm mưa vẽ bằng canvas — cửa gỗ pano hé khe sáng vàng, bùa, câu đối,
  biển "NGÕ 4", dây điện, bóng đèn chập chờn. Thỉnh thoảng: bóng đi ngang sau khe cửa, cửa rung như bị gõ, hiếm hơn là
  một gương mặt nhìn ra. Mục: Tiếp tục / Trò chơi mới, Hồi tưởng (sau khi phá đảo), Cài đặt, Ghi công.
  Không có "Tải game" (chỉ một tiến trình) và "Thoát" (trình duyệt không cho trang tự đóng tab).
- **HUD**: gợi ý `[E] Hành động` dưới tâm; tâm ngắm nở thành vòng khi nhắm trúng vật; "Việc cần làm" mờ dần sau 7 giây;
  phụ đề có dải tối nền. **Giấy** là giấy cũ ố vàng chữ viết tay; **ảnh thờ** có khung gỗ.
- **Màn hình đang tải** (chỉ HTML + CSS trong `index.html`): nén nhang đỏ đầu, khói bay, mưa — hiện ngay khi trang mở,
  biến mất khi game sẵn sàng.
- **Âm thanh màn hình chính**: sau lần bấm/nhấn phím đầu tiên (trình duyệt chặn tự phát) — mưa, sấm xa sau tia chớp,
  ba tiếng gõ khớp ba nhịp rung cửa, tiếng bước chân khi bóng đi ngang, tiếng thì thầm khi gương mặt hiện ra.
- **Cài đặt** (lưu trong trình duyệt, đều có tác dụng thật): độ nhạy chuột, độ sáng, âm lượng tổng / nhạc nền & mưa /
  hiệu ứng (hai kênh Web Audio riêng), cỡ phụ đề, chất lượng hình
  (độ phân giải render + bóng đổ), nhiễu hạt phim; nút Toàn màn hình (Fullscreen API).
- **Bàn phím**: ↑/↓ chuyển mục, Enter chọn, Esc đóng bảng phụ.
- **Hiệu ứng giao diện gắn với sự kiện**: HUD chớp một nhịp khi có tiếng gõ / đèn chập chờn; viền tối-đỏ khi bị đuổi
  hoặc hình nhân áp sát; phụ đề "bị chạm" (`glitch` trong action `subtitle`) ở 3 khoảnh khắc. Tôn trọng
  `prefers-reduced-motion` (tắt chớp, giật, sự kiện cửa ở menu).

## Phong cách hình ảnh

Tham khảo *Thần Trùng* (chi tiết nhà Việt đời thường, chủ đề trùng tang), *Devotion* (đồ thờ cúng, TV nhiễu sóng,
bóng tối làm khung) và kinh dị Thái (ma bụi chuối). Tất cả vẫn vẽ bằng code, không có file asset:

- Hậu kỳ: điểm ảnh to kiểu PS1, nhiễu hạt, quang sai màu, vignette, **bloom**, **chỉnh màu** (bóng tối ngả xanh rêu, vùng sáng ngả vàng nến).
- **Bóng đổ từ đèn pin** (bóng thực thể chạy theo luồng đèn), **bụi lơ lửng** trong luồng đèn, **khói nhang**, **mưa** ngoài vườn.
- Đồ vật: câu đối đỏ, hoành phi, băng tang trên ảnh thờ, khăn tang, vòng hoa "Vô cùng thương tiếc", lịch bloc Rằm tháng Bảy,
  bùa vàng, mùng trắng, gương trùm khăn đỏ, TV CRT, đồng hồ quả lắc (có tiếng tích tắc), quạt trần (mất điện thì quay chậm dần), xà gỗ,
  cửa sổ chớp có vệt trăng xiên vào phòng.
- Vườn sau: giếng gạch có mái ngói và gàu kéo, bụi chuối lá rách, dây phơi áo trắng đung đưa, tường rào gạch rêu, bóng đèn hiên.

## Mở đầu — Ngõ 4 (~4–6 phút)

Màn đầu tiên của "Trò chơi mới": con hẻm mưa đêm dẫn về cửa nhà bà, dựng ngay trước mặt tiền căn nhà (`src/world/Alley.ts`).
Mặt tiền nhà một-hai tầng, cửa cuốn gỉ, biển hiệu "TẠP HÓA / SỬA XE / CẮT TÓC", xe máy, dây điện, ba bóng đèn ngõ,
miếu thổ địa, thùng đốt vàng mã còn cháy, năm đôi dép trước cửa nhà bà.

1. Bà Bảy hàng xóm sau cửa cuốn dặn: ngang **nhà số 9** thì đừng ngước lên nhìn.
2. Đi ngang nhà số 9 có tiếng đập vào kính tầng hai — cám dỗ nhìn lên.
3. Nhìn thẳng lên cửa sổ = phạm quy tắc: gương mặt hiện sau song sắt, đèn ngõ tắt, nó đuổi theo từ đầu ngõ.
4. Lật chậu bông lấy chìa khóa, mở cửa vào nhà → "Về tới nhà" → Đêm thứ nhất.

Điều kiện kịch bản mới: `near` + `nearRadius` (người chơi ở gần anchor) — nền tảng cho bản đồ ngoài trời.
Action mới: `show` (hiện/ẩn vật trong targets).

## Đêm cuối — Người thứ năm (~10–15 phút)

Cả ba thực thể trong một đêm. Người Gõ Cửa giờ mang **mặt Út** (áo sơ mi trắng, tóc ngắn — chỉ hơi quá cao);
lúc bắt người chơi, lớp mặt đó rơi ra.

1. Đọc trang cuối sổ tay bà (trên bàn thờ): người thứ năm trong ảnh là thứ đang *thành* Út; phải cắt nó khỏi ảnh mà đốt.
2. Ba tiếng gõ, **giọng của chính mình** ngoài cửa: "Tao là Út. Mày mới là đồ giả." Mất điện; "Út" đi tuần trong nhà,
   hai hình nhân chầu bàn thờ thức dậy (đêm này chúng **chỉ đi khi tắt đèn**).
3. Lấy kéo trong hộp may của bà (trên giường). Quy tắc 4 xuất hiện thêm một lần.
4. **Bật cầu dao** ở tường bếp → đèn sáng 25 giây (hình nhân đứng im), nhưng tiếng cầu dao kéo "Út" tới bếp.
   Gỡ ảnh thờ **khi đèn còn sáng** (đèn tắt mà nhìn ảnh = quy tắc 3).
5. Cắt người thứ năm, đốt trong thau vàng mã cạnh bàn thờ.

Ba kết thúc: đốt được (kết thúc thật), **mở cửa cho chính mình** (giọng bà, giọng mẹ lần lượt dụ mở cửa), hoặc bị bắt.

## Chạng vạng — Gốc đa đầu làng (~6–10 phút, giữa Đêm 2 và Đêm 3)

Bản đồ ngoài trời đầu tiên (`src/world/Fields.ts`, khoảng 60 × 74 m): ruộng lúa nước (4000 khóm lúa dùng thin instances),
bờ ruộng gấp khúc, lũy tre bao quanh, nghĩa địa và cây đa cổ thụ rễ phụ rủ xuống. Không đèn — chỉ trăng, đom đóm dọc bờ
ruộng và lồng đèn đỏ treo trên cành đa (không bị sương che, làm đèn hiệu nhìn thấy từ đầu làng). Tiếng dế kêu cả cánh đồng.

- **Bù nhìn rơm đội nón lá** (`src/entity/Scarecrow.ts`) — ngược với hình nhân: **bật đèn pin thì chúng thức**;
  con nào không nằm trong chùm sáng thì lội ruộng tiến lại, con đang bị rọi thì đứng im. Tắt đèn: tất cả đứng im.
  Bãi đất quanh gốc đa là đất thờ — chúng không theo vào.
- **Lội ruộng**: ra khỏi bờ thì đi chậm còn ~55%, bước chân thành tiếng nước.
- Tiếng chú Tư đếm "một… hai… ba… bốn" vọng từ gốc đa (chỉ đường + đồng hồ đếm ngược).
- Giọng mẹ gọi từ dưới ruộng: trả lời → mọi bù nhìn nổi giận, đi cả trong tối 12 giây.
- Tới gốc đa: chú Tư đếm "…năm", rồi quay lại — mặt trơn trắng như giấy.

Kỹ thuật: id màn là `2.5` để so sánh tiến trình theo số vẫn đúng; action mới `scarecrows` (`rage`).

## Đêm 3 — Hình nhân (~8–12 phút)

"Kẻ Không Có Mặt": nhà quen mà lạ — vải trắng trùm đồ đạc, chữ than "CÒN THIẾU MỘT" trên tường, ảnh thờ năm người không ai còn mặt,
di ảnh bà bị cạo trắng mặt, vàng mã vương khắp sàn. Hình nhân giấy (đồ mã đám tang) đứng khắp nhà.

1. Đọc giấy thầy Sáu trên bàn thờ: chú Tư đã "mất hồn"; phải đốt một hình nhân thế mạng thay mình.
2. Hình nhân mất mặt và **chỉ di chuyển khi không ai nhìn** (trong khung hình + không bị che + đủ sáng).
   Đèn sáng thì chúng nhích chậm; đèn chập chờn/tắt thì lao nhanh — bật đèn pin mà nhìn. Chạm vào là chết.
   Chỉ con trong vòng 7 m mới biết bạn ở đâu. Trốn trong tủ thì chúng đứng im.
3. Gom: ảnh của Út (ngăn kéo tủ đầu giường), áo cũ (tủ áo), hộp diêm (hộp thiếc dưới bếp). Đủ thì mất điện hẳn.
4. Ra vườn: mặc áo, dán ảnh cho hình nhân thế mạng, rồi đốt.

## Đêm 2 — Cái giếng (~8–12 phút)

1. Tỉnh dậy trong phòng bà, trời mưa. Đọc **giấy chú Tư**: bà mất nhằm giờ trùng tang; phải gom 3 mảnh chén men lam đặt lên bàn thờ.
2. Mảnh 1 trong **hũ gạo** dưới bếp. Sau đó TV phòng khách **tự bật**; nhìn thẳng vào màn hình thì thấy một gương mặt.
3. Mở cửa sau ra vườn. Mảnh 2 dưới **gốc chuối** → **quy tắc 4**: bước chân tiến tới sau lưng rồi dừng. Quay lại trong 3 giây = chết.
4. Mảnh 3: **kéo gàu giếng** (đứng gần, ~6 giây). Giọng mẹ gọi từ dưới giếng, hiện lựa chọn **[E] “Dạ…?”** —
   trả lời = vi phạm **quy tắc 2**: có thứ leo lên từ giếng và đuổi theo.
5. Thoáng thấy bóng người giữa bụi chuối. Đủ 3 mảnh → ba tiếng gõ, mất điện, nó vào nhà đi săn.
   Phải về bàn thờ đặt chén trong bóng tối, không nhìn ảnh thờ (quy tắc 3).

## Đêm 1 — Tiếng gõ cửa (~5–8 phút)

1. Đọc tờ giấy bà để lại trên bàn thờ (4 quy tắc) và xem ảnh thờ: **4 người**.
2. Phòng bà bị khóa → xuống bếp lấy chìa trong hộp thiếc.
3. Khi người chơi không nhìn, ảnh lặng lẽ thành **5 người** (Lớp 1 — bất an).
4. Giọng bà gọi ngay sau lưng, kể chuyện cái chén bể mà "không ai biết" (Lớp 2 — ám ảnh).
5. Đọc sổ tay trong phòng bà → **ba tiếng gõ cửa**, đèn tắt, giọng bà xin mở cửa (Lớp 3).
6. Hai tiếng bước chân nặng, rồi **bóng người đứng cuối hành lang** (in trên vệt trăng lọt qua khe cửa).
   Vài giây sau nó bắt đầu **đi săn** trong nhà. Người chơi phải tới bàn thờ mà không bị bắt.
7. Kết thúc: **mở cửa** (xấu), **thắp nhang** ở bàn thờ (tốt), hoặc **bị bắt** (jumpscare → xấu).
   Nhìn thẳng vào ảnh thờ khi đèn tắt = vi phạm quy tắc 3 → ảnh biến đổi và nó lao tới chỗ người chơi.

### Người Gõ Cửa (`src/entity/Knocker.ts`)

| Trạng thái | Hành vi |
|---|---|
| idle | Đứng yên nhìn người chơi, đầu nghiêng dần. Chỉ đuổi nếu người chơi lại quá gần. |
| patrol | Đi giữa các điểm tuần tra; ~35% lần chọn phòng người chơi đang ở. Thỉnh thoảng gọi "Út ơi…" (chỉ khi ở gần). |
| investigate | Thấy thoáng qua hoặc nghe tiếng chạy (≤ 9 m) / tiếng đi (≤ 2.5 m) → tới kiểm tra. |
| search | Đứng nhìn quanh. Nếu người chơi trốn trong tủ ngay đó → đứng trước cửa tủ, thở, dụ "bà thấy con rồi". |
| chase | Đuổi thẳng khi còn thấy (2.9 m/s, chạy 3.3 m/s nhanh hơn chút). Mất dấu → tới chỗ thấy lần cuối rồi lục soát. |
| caught | Mặt áp sát camera + tiếng rít, Director chạy `ending_caught`. |

- **Tầm nhìn**: 6 m trong tối, 12 m nếu bật đèn pin. Góc nhìn 110°. Trong 2.6 m là đuổi ngay.
- **Tủ áo** (phòng bà): trốn được sau khi có tiếng gõ cửa. Chui vào khi nó **đang thấy mình** → nó lôi ra.
- Nó **tự mở cửa phòng bà** nếu cần đi qua (dừng một nhịp, cửa kêu cót két — dấu hiệu cho người chơi).
- Tìm đường bằng đồ thị điểm đặt tay (`House.buildNav`), không dùng navmesh — nhà nhỏ nên đơn giản và chắc hơn.
- Mọi thông số (tốc độ, tầm nhìn, tầm nghe, thời gian lục soát, câu dụ) nằm trong `src/data/knocker.json`.

## Cấu trúc

```
src/
  core/Game.ts              Vòng lặp, trạng thái (menu/pause/playing/ended), pointer lock, hậu kỳ PS1
  director/HorrorDirector   Cờ tiến trình + tension; quyết định KHI NÀO sự kiện xảy ra
  director/types.ts         Định dạng sự kiện (điều kiện + chuỗi hành động)
  entity/Knocker.ts         Người Gõ Cửa: máy trạng thái, nhìn/nghe, truy đuổi, jumpscare
  entity/NavGraph.ts        Đồ thị điểm dẫn đường + Dijkstra
  entity/Stalker.ts         Bóng Sau Lưng — quy tắc 4 (bước chân dừng sau lưng)
  core/levels.ts            Danh sách các đêm: vị trí bắt đầu, cờ có sẵn, ảnh thờ, mưa
  world/Decor.ts            Đồ trang trí nhà Việt có tang
  world/Yard.ts             Vườn sau: giếng, bụi chuối, dây phơi, tường rào
  world/Alley.ts            Ngõ 4: mặt tiền, cửa cuốn, biển hiệu, xe máy, dây điện, nhà số 9
  world/Fields.ts           Cánh đồng: ruộng, lúa, bờ, lũy tre, nghĩa địa, cây đa, chú Tư
  entity/Scarecrow.ts       Bù nhìn rơm — thức theo ánh đèn pin
  world/Fx.ts               Hạt: bụi, mưa, khói nhang, lửa
  world/Funeral.ts          Bàn thờ tang: di ảnh, hạc, nến, cơm cúng, vàng mã, mạng nhện, hình nhân; dựng cảnh Đêm 3
  entity/Effigy.ts          Mô hình hình nhân giấy + "Kẻ Không Có Mặt" (đi khi không bị nhìn)
  world/decorTextures.ts    Texture câu đối, bùa, lịch, vòng hoa, lá chuối, gạch, đất...
  world/House.ts            Dựng nhà, đồ vật, cửa, đèn, tủ áo (chỗ trốn), điểm dẫn đường
  world/textures.ts         Texture vẽ bằng code + ảnh thờ (biến thể 4/5/6)
  player/Player.ts          Di chuyển FPS, va chạm, đèn pin, tiếng bước chân
  interaction/Interaction   Raycast từ tâm màn hình
  audio/AudioSystem.ts      Âm nền, drone theo tension, tiếng gõ/thì thầm/sting 3D
  ui/Hud.ts                 Phụ đề, giấy đọc, màn hình bắt đầu/tạm dừng/kết thúc
  data/night0.json          ★ Kịch bản mở đầu (Ngõ 4)
  data/night1.json          ★ Kịch bản Đêm 1 — chỉnh nhịp độ ở đây, không cần sửa code
  data/night2.json          ★ Kịch bản Đêm 2
  data/night2_5.json        ★ Kịch bản Chạng vạng (gốc đa)
  data/night3.json          ★ Kịch bản Đêm 3
  data/night4.json          ★ Kịch bản đêm cuối
  data/notes.json           ★ Nội dung tờ giấy, sổ tay
  data/knocker.json         ★ Thông số Người Gõ Cửa
```

### Viết sự kiện mới (`src/data/night1.json`, `night2.json`)

```json
{
  "id": "ten_su_kien",
  "when": { "all": ["co_can_co"], "none": ["co_cam"], "delay": 10, "hidden": "photo" },
  "actions": [
    { "type": "sound", "sound": "whisper", "at": "behindPlayer" },
    { "type": "subtitle", "text": "“…”", "duration": 4, "voice": true },
    { "type": "wait", "seconds": 2 },
    { "type": "setFlag", "flag": "co_moi" }
  ]
}
```

- Điều kiện: `all`, `none`, `delay` (giây kể từ khi điều kiện cờ thỏa), `hidden` (mục tiêu ngoài tầm nhìn), `look` (đang nhìn thẳng mục tiêu, ≤ 4 m), `visible` (mục tiêu trong tầm nhìn, mọi khoảng cách).
- Hành động: `wait`, `subtitle`, `setFlag`, `sound` (`knock|whisper|sting|creak|rattle|click|step|heavyStep|breath|shriek`, `at` = `behindPlayer` hoặc anchor), `photo`, `lights` (`on|off|flicker|blackout`), `tension`, `ending`,
  `entity` (`do`: `appear|patrol|alert|grab|disguise|vanish`, `at` = anchor), `objective` (dòng nhiệm vụ góc trái), `choice` (hiện [E] `text` trong `seconds` giây, bấm thì bật `flag`),
  `footstepsBehind` (quy tắc 4 → cờ `rule4_broken` / `rule4_kept`), `tv` (`off|static|face`), `effigies` (`wake|sleep`), `ending` có thể kèm `next` (số đêm kế tiếp).
- Âm thanh thêm: `dig`, `splash`, `static`.
- Anchor có sẵn: `frontDoor`, `bedroomInside`, `altar`, `hallEnd`, `tv`, `well`, `bananaGrove`.
- Cờ do game tự bật: `chased`, `hid`, `caught`, `read_uncle_note`, `shard_rice|banana|well`, `shard_any`, `all_shards`, `cranking`, `bowl_placed`, `backdoor_open`.
  Mục tiêu cho `hidden`/`look`/`visible`: `photo`, `entity`, `tv`.

Debug trong console (chỉ chế độ dev): `game.director.set("has_key")`, `game.setLights("off")`, `game.house.setPhoto(5)`,
`game.entity("patrol")`, `game.knocker.state`.

## Chơi thử với người khác

1. `npm run package` → tạo `vongam-web.zip`. Lên [itch.io](https://itch.io): *Upload new project* → *Kind of project: HTML* →
   upload file zip → tick *This file will be played in the browser* → khung 1280×720, bật *Fullscreen button* →
   để *Draft* hoặc *Restricted* (có mật khẩu) rồi gửi link cho người chơi thử.
   (Hoặc chạy `npm run play` rồi cho người cùng mạng LAN vào bằng `vite preview --host`.)
2. Dặn người chơi: đeo tai nghe, chỉnh **Độ sáng** trong ⚙ Cài đặt ở màn hình đầu nếu thấy quá tối.
3. Cuối mỗi đêm (kết thúc nào cũng vậy) có 3 câu hỏi và nút **Tải nhật ký chơi thử** → người chơi gửi lại file `.json`.
   File gồm: thời gian chơi, số lần trốn tủ / bật đèn pin / tạm dừng, câu trả lời,
   `timeline` (mỗi cờ và sự kiện kinh dị kèm giây xảy ra) và `path` (vị trí mỗi 2 giây — biết người chơi kẹt ở đâu).
4. Đọc `timeline`: khoảng trống dài giữa hai sự kiện = đoạn có thể chán; đối chiếu với câu "lúc nào chán/kẹt".

Cài đặt (độ nhạy chuột, độ sáng, âm lượng) lưu trong trình duyệt của từng người. Người chơi thử đi theo thứ tự các đêm; muốn thử riêng một đêm thì dùng `?dem=N`.

## Bước tiếp theo (theo kế hoạch Giai đoạn A)

- [x] Tuần 3: thực thể Người Gõ Cửa có hình — bóng người cuối hành lang khi đèn tắt, máy trạng thái tuần tra/nghi ngờ/truy đuổi, chỗ ẩn nấp (tủ áo). (Dùng đồ thị điểm thay cho navmesh.)
- [x] Đêm 2 — Cái giếng: quy tắc 2 và 4, vườn sau, TV tự bật, nâng cấp đồ họa.
- [x] Đêm 3 — Hình nhân ("Kẻ Không Có Mặt"), bàn thờ tang chi tiết, texture ảnh thật.
- [x] Đêm cuối — Người thứ năm: khép lại câu chuyện, cả ba thực thể, ba kết thúc.
- [x] Chuẩn bị chơi thử: cài đặt, nhật ký chơi thử + 3 câu hỏi cuối đêm, gói zip cho itch.io.
- [ ] Đưa link cho 3–5 người chơi thử, gom file nhật ký, chỉnh nhịp độ theo dữ liệu.
- [ ] Thay âm thanh tổng hợp bằng giọng nói ghi âm thật (quan trọng nhất cho Lớp 2).
- [ ] Dựng lại nhà trong Blender, xuất glTF, "nướng" ánh sáng.
- [ ] Playtest 3–5 người, ghi lại thời điểm họ sợ / chán.
