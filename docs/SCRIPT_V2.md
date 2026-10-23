# VỌNG ÂM — Kịch bản v2

> **Trạng thái (2026-10-23):** đã duyệt. Giữ tên **VỌNG ÂM**. Làm theo lộ trình §8, bắt đầu từ Đêm 1.
> - **Đã làm:**
>   - Đêm 1 v2: mâm cơm có chén thứ năm, mặt sau tờ dặn, ảnh nhỏ trong hộp bánh quy, hộp thuốc, xấp lịch tháng Bảy,
>     mảnh trang #1, tiếng gõ theo chỗ đứng, tin nhắn giả sau tiếng gõ thứ ba, ba nén nhang, kẻ săn đuổi nhớ đường,
>     tin cuối đêm.
>   - Hệ thống 2 (chỉ phần mảnh trang), 3, 4 (phần thắp nhang), 7 (phần nhớ đường).
>   - Hồi tưởng: bỏ "mắt người", thêm góc nhìn thứ hai, hai chiếc dép, *"Dạ."*.
>   - Ngõ 4: biển rao vặt (trộm chó, fan T1, fan MU, thông cống, cho thuê phòng, rút tiền thẻ tín dụng).
> - **Chưa làm:**
>   - Hệ thống: hộp hỏi đáp, dấu vết lựa chọn qua các đêm, điểm nhãn giữ phím, kẻ săn đuổi đứng chờ thay vì đuổi.
>   - Kịch bản: các chương còn lại theo §8.

Bản này viết lại toàn bộ đường đi của game, dựa trên bản góp ý của một biên kịch khác (dán vào phiên làm việc
2026-10-23). Phần lore lấy theo `docs/STORY.md`, phần dân gian theo `docs/LORE_DEEPDIVE.md`.

Ký hiệu chi phí làm trong engine hiện tại:
- **[CÓ]**: đã có, chỉ cần sửa dữ liệu.
- **[S]**: vài giờ, chủ yếu sửa kịch bản và đạo cụ.
- **[M]**: một tới hai ngày, cần một hệ thống nhỏ mới.
- **[L]**: lớn, nên hoãn.

---

## 1. Đánh giá bản góp ý

Chẩn đoán của bản góp ý là đúng. Game đang lặp một vòng: đọc giấy, nhặt 3 món, trốn, quay về bàn thờ. Các sự kiện
lại chưa nối thành chuỗi nhân quả. Từng ý được xử lý như sau:

| Ý của bản góp ý | Quyết định | Lý do |
| --- | --- | --- |
| Xen ba loại sự kiện: siêu nhiên, tâm lý, đời thường bất thường; chừa khoảng lặng sau mỗi cao trào | **Lấy** | Rẻ, hiệu quả nhất. Mâm cơm thêm chén, ly nước có dấu môi nhỏ đều làm bằng điều kiện `hidden` + `show` sẵn có. |
| Mỗi đêm phải đổi cách người chơi hiểu câu chuyện | **Lấy** | Khớp với thang bất ngờ đã có (LORE_DEEPDIVE §5). |
| Vật phẩm phải là bằng chứng, không chỉ là chìa khóa | **Lấy** | Ba mảnh chén thành ba ký ức; thêm **trang sổ xé làm bốn mảnh** (§4). |
| Ngõ 4: chuông gió đứng im, thùng vàng mã cháy ra tên người nhà, nhìn lên cửa sổ thì bị **vòng lại đầu ngõ** | **Lấy, sửa** | Vòng lặp đáng sợ hơn bị đuổi. Bị đuổi giữ lại cho lần nhìn lên thứ hai. |
| Mặt sau tờ dặn, nét chữ khác: "Đừng tin những gì bà dặn sau tiếng gõ thứ ba" | **Lấy, gán người viết** | Đó là **chữ của chính Út**, viết đêm 21/7. Ở Đêm cuối, chữ trên vé xe khớp với dòng này. |
| Chọn chỗ đứng khi có tiếng gõ, mỗi chỗ cho một manh mối | **Lấy, sửa** | Không dùng menu: chỗ người chơi **đang đứng** lúc nghe gõ quyết định thấy gì (điều kiện `near` sẵn có). |
| Zalo "Đừng thắp nhang", kết đêm "Con thắp nhang cho ai vậy?" | **Lấy** | Dùng để thử luật "sau tiếng gõ thứ ba". |
| Ba mảnh chén = ba ký ức; dép trẻ con trong gàu | **Lấy** | |
| "Mảnh chén thứ tư nằm trên bàn thờ", chén vỡ hai lần | **Sửa** | Chén chỉ vỡ một lần (năm 2003). Mảnh còn thiếu nằm **trong tay đứa bé dưới hòm nhỏ** và lộ ra ở Đêm cuối. |
| Luật đếm tới ba có bước chân thật và giả | **Lấy** | Thành luật học được, không phải phản xạ (§3, Đêm 2). |
| Chạng vạng có chú Tư dẫn đường, định hướng bằng tai, câu hỏi "đếm xem có mấy người" | **Lấy, sửa** | Không có mô hình NPC: chú Tư là **ngọn đèn dầu và tiếng dép** đi phía trước. |
| Câu đáp "Tại vì chú đã lấy mất một người" | **Sửa** | Chú Tư không lấy ai. Đổi thành: *"Tại vì nhà mình chưa bao giờ đếm con."* |
| Đêm 3: kệ hình nhân đổi theo từng món lấy, hóa đơn 6 con mà còn 5, mỗi hình nhân một luật | **Lấy** | Bỏ gương và camera điện thoại (đắt); thay bằng luật theo tầng và luật theo đèn pin. |
| Áo vá chỉ đỏ, "Áo của con mà", chữ "Đừng để họ đốt con lần nữa" | **Lấy, sửa** | Áo đã bị đốt, nên chữ hiện ra trên **mẩu cổ áo không cháy**, viết bằng muội than. |
| Hồi tưởng: trò trốn tìm, bóng chân dưới khe cửa, "Từ nay trong nhà chỉ có một đứa thôi", "Dạ" | **Lấy** | |
| Hồi tưởng giữ máy quay dưới gầm bàn thờ, không cho biết mình là đứa nào | **Lấy, sửa — quan trọng** | Bản đang chạy để lộ đáp án quá sớm (bế lên, "nhẹ hều", đứa kia có mắt người). Bản mới cho **cả hai góc nhìn**: hồn và vía đều nhớ đêm đó. Đáp án chỉ chốt ở Đêm cuối. |
| Đêm cuối: tìm trang xé ở nhà số 9, giếng, tiệm | **Sửa** | Đêm cuối không ra ngõ được (mở cửa chính là kết Mở cửa). Đổi sang giếng, tiệm, thọ mộc. |
| Nhà đổi bố cục mỗi lần mất điện | **Bỏ, thay** | Phải dựng lại tường và đường đi của thực thể [L]. Thay bằng **đồ vật và cửa đổi trạng thái** mỗi lần mất điện. |
| Gương phản chiếu quá khứ | **Bỏ** | Render gương thật nặng với máy yếu [L]. |
| Chọn đúng ảnh trong 25 giây; năm món đại diện năm người | **Lấy** | |
| Kết Hết: "hàng xóm nói bà sống một mình nhiều năm" | **Bỏ** | Mâu thuẫn lore: Út được bà nuôi lớn. Giữ cảnh **năm đôi dép ở căn phòng mới**. |
| Kết Thế thân thành "vòng lặp" | **Sửa** | Giữ phép thử kim (cú lật mạnh nhất); thêm cái giá ở Hậu truyện. |
| Kết Trả hồn "Bà ơi, con về rồi", bà ôm cả hai, cửa sổ nhà số 9 mở, năm đôi dép đã khô | **Lấy** | |
| Kết Mở cửa: bản sao ngồi xuống bàn có năm chén cơm | **Lấy** | Nối với mâm cơm Đêm 1. |
| Chương mới **Hậu truyện** | **Lấy** | Giỗ đầu bà, ban ngày, trong cùng căn nhà; khác nhau theo kết. |
| Kẻ săn đuổi nhớ đường đi; lựa chọn để lại dấu vết | **Lấy** | §6. |
| Đổi tên game, gọi nhân vật là "cậu", "anh", "bà ngoại"; bà còn sống ở Đêm 1 | **Bỏ** | Đổi tên là việc của bạn. Út giữ trung tính về giới. Bà đã mất trước đầu thất. |
| Thời lượng 100–145 phút | **Sửa** | Nhắm khoảng **90–110 phút**, chưa kiểm thử. Làm Đêm 1 trước để đo. |

---

## 2. Xương sống

**Sự thật (không đổi):** đêm Rằm năm 2003, nghi lễ của ông kéo **hồn** Út sang hình nhân. Bà bế đứa biết khóc (hình
nhân mang hồn), bỏ lại đứa im lặng (xác và vía). Đứa bé chết trong tủ áo, nằm hai mươi năm trong cỗ hòm nhỏ dưới gầm
bàn thờ. Người chơi là đứa bằng giấy.

**Câu hỏi người chơi mang theo, đổi theo từng chương:**

| Chương | Người chơi đang hỏi | Người chơi tin (sai) |
| --- | --- | --- |
| Mở đầu | Ai đã về trước mình? | Có một con ma giả làm mình. |
| Đêm 1 | Lời bà dặn bảo vệ mình hay giữ ai ở ngoài? | Bà đang bảo vệ mình khỏi ma. |
| Đêm 2 | Cái chén đã vỡ thế nào, bà giấu gì? | Nhà từng có một đứa trẻ chết, ma nó quay về. |
| Chạng vạng | Người dẫn mình có còn là chú Tư? | Nhà này xóa tên một đứa con. |
| Đêm 3 | Hình nhân thế mạng để cứu ai, thay ai? | Mình đang trừ tà cho đứa trẻ đó. |
| Hồi tưởng | Đêm đó ai được bế ra? | Có thể mình là đứa bị bỏ lại. |
| Đêm cuối | Mình là ai, và lần này chọn ai? | (phép thử kim trả lời) |
| Hậu truyện | Cái giá của lựa chọn là gì? | |

**Nhịp mỗi đêm:** yên → một chi tiết sai lệch → khám phá có mục tiêu → cao trào (bị săn) → **khoảng lặng** (đồng hồ chạy
lại, mưa, hàng xóm nói chuyện ngoài ngõ) → một chi tiết sai chỗ → kết chương. Đèn chập chờn và hù to: mỗi đêm tối đa
một lần.

---

## 3. Kịch bản từng chương

### Mở đầu — Ngõ 4: "Người đã về từ hôm trước" (6–8 phút)

**Hồi 1 — Con ngõ sai một chút** (không hù)
- Xuống xe ôm đầu ngõ. Điện thoại còn 12% pin, góc màn hình có biểu tượng pin [S].
- Chuông gió trước nhà đầu ngõ: mưa mà không lay. Nhìn vào thì có thoại: *"Mưa vầy mà cái chuông không kêu."* [S]
- Xe máy phủ bạt, hai mũ bảo hiểm, một đôi dép dưới chân chống [S].
- Miếu thổ địa: nhang mới, chân nhang mục, tro còn ướt [CÓ, sửa lời].
- Thùng vàng mã cháy không tắt trong mưa. Bên trong là **sớ khai gia cảnh** gửi Thổ Địa, liệt kê người trong nhà: Lâm
  Phúc, bà, mẹ, Út… và **dòng thứ năm cháy mất phần tên**, chỉ còn chữ "Út". Đây là di vật Biên nhận Phúc Ký, đặt cạnh
  thùng [S].

**Hồi 2 — Bà Bảy** (chỉ nghe giọng sau cửa cuốn, ánh đèn hắt ra)
- *"Ủa, con về hồi nào vậy?"* Người chơi chọn một trong ba câu: **Mới về** / **Về từ chiều** / **Con không nhớ**
  [M: hộp hỏi đáp].
- Bà Bảy khựng lại: *"Lạ thiệt. Bữa hổm con về rồi mà? Khuya lắm, con đi chân đất vô nhà bà."*
- *"Đầu ngõ con có gặp đứa nhỏ đi chân đất không?"*
- Lời dặn mập mờ: *"Qua nhà số 9, nghe gì cũng kệ. Đừng ngước lên. Người ta ngủ rồi thì không có ai đứng trên lầu hết."*
- Nếu đã chọn "Con không nhớ": thêm câu *"…Đêm đó con cũng nói y vậy."* Lưu dấu vết `said_dont_remember`.

**Hồi 3 — Nhà số 9**
- Ba lần gõ kính: lần đầu khi đi ngang cổng; lần hai **phía sau lưng** dù chưa đi hết nhà; lần ba đúng nhịp ba
  tiếng [S].
- Nhìn lên lần đầu: gương mặt sau kính mờ, **không hét**, chỉ mỉm cười chậm. Toàn bộ đèn ngõ tắt. Người chơi bị
  **đưa về đầu ngõ** [M: vòng lặp]. Lượt đi lại, mấy chỗ đã đổi:
  - xe máy quay đầu vào trong;
  - miếu có thêm một nén nhang;
  - cửa cuốn bà Bảy đóng, đèn tắt;
  - có vệt chân nhỏ ướt chạy trước mặt.

  Lưu dấu vết `stared_no9`.
- Nhìn lên lần thứ hai: bị đuổi và bắt như hiện tại [CÓ].

**Hồi 4 — Năm đôi dép**
- Năm đôi dép, đôi nhỏ ướt sũng, vệt nước nhỏ từ cổng vào tới bậc thềm [CÓ + S].
- Mở cửa: đèn phòng khách tự bật. Trên bàn **bốn ly nước, một ly còn dấu môi nhỏ** [S].
- Đóng cửa. *Cộc. Cộc. Cộc.* Lời nhắc: **"Mở cửa xem"**. Mở ra thì ngoài ngõ không ai, **đôi dép nhỏ đã biến mất**.
  Hết chương [S].

### Đêm 1 — Tiếng gõ cửa: "Luật trong nhà không đáng tin" (15–18 phút)

**Hồi 1 — Mâm cơm đầu thất** (yên → sai lệch)
- Mâm cơm cúng đầu thất: bốn chén, bốn đôi đũa. Rời phòng rồi quay lại thì có **chén thứ năm sát mép tường**, đựng
  **cháo trắng loãng**, thứ người ta cúng cô hồn [S: `hidden` + `show`]. Thoại: *"Cháo trắng… là cúng cô hồn. Ai bày
  ra đây?"*
- Lời bà dặn [CÓ]. **Mặt sau, nét chữ khác:** *"Đừng tin những gì bà dặn sau tiếng gõ thứ ba."* Chưa cho biết ai viết.
- Thạch sùng chặc lưỡi [CÓ].

**Hồi 2 — Hộp bánh quy**
- Câu đố 1607 [CÓ]. Trong hộp có thêm **tấm ảnh 2003 bản in nhỏ**: giữa bà và mẹ có một **khoảng trống vừa một đứa
  trẻ**. Mặt sau có **hai dấu bàn tay con nít in mực đen, y hệt nhau**, chữ bà ghi "Rằm Quý Mùi" [S].
- Mực đen ở đây là mực điểm nhãn, sẽ trả ở Đêm 3.

**Hồi 3 — Phòng bà**
- Sổ tay của bà [CÓ]. Đây là lời nói dối viết cho Út đọc.
- **Lịch treo tường hai mươi năm**, Rằm tháng Bảy năm nào cũng khoanh đỏ, ghi "thay bùa"; năm nay không khoanh [S].
- **Hộp thuốc hạ sốt trẻ em**, nhãn "bé Út", ghi ngày tháng Bảy của nhiều năm khác nhau. Đây là những lần "lớn vọt" [S].
- **Mảnh trang xé #1** kẹp trong sổ: *"Đứa được bế ra không phải…"* [M: hệ thống mảnh trang, §4].

**Hồi 4 — Ba tiếng gõ**
- Trước tiếng gõ: Zalo của bà tới trễ từ đêm 21/7, *"Út cài then chưa con"* [CÓ].
- Tiếng gõ. **Người chơi đang đứng ở đâu thì thấy cái đó** [S, điều kiện `near`]:
  - phòng bà: bước chân dừng ngoài cửa phòng, bóng chân dưới khe;
  - phòng khách: một đôi chân trẻ con đứng cạnh bàn thờ, không có tiếng;
  - hành lang gần cửa chính: giọng mẹ gọi qua khe cửa (nhưng mẹ đang ở Đài Loan);
  - bếp: chén cháo trắng gợn sóng.
- **Sau tiếng gõ thứ ba**, Zalo "của bà": *"Đừng thắp nhang. Nó đang đứng sau lưng con."* Người chơi làm theo dòng chữ
  sau tờ dặn thì thắp nhang tiếp. Làm theo tin nhắn thì nó tới gần.

**Hồi 5 — Đi tuần**
- "Nó" đi tuần [CÓ]. Thêm **trí nhớ đường đi**: đi cùng một lối ba lần thì lần sau nó đứng chờ ở đó [M].
- **Thắp ba nén nhang**: giữ phím để thắp từng nén, mỗi nén khoảng 2 giây, trong lúc nó đi tuần [M].
- Không nhìn ảnh thờ [CÓ].

**Kết chương:** đèn sáng lại, ảnh thờ có thêm người thứ năm [CÓ]. Zalo của bà: *"Con thắp nhang cho ai vậy?"* [S].
Khoảng lặng: đồng hồ chạy lại, ngoài ngõ có tiếng xe máy chạy qua [CÓ].

### Đêm 2 — Cái giếng: "Đừng trả lời người ở dưới đó" (15–20 phút)

**Hồi 1 — Giấy chú Tư** (đổi từ chỉ chỗ sang đố) [S]
> *"Bà chia cái chén làm ba, để nó không ráp lại được ký ức: một mảnh gửi chỗ nuôi người sống, một mảnh gửi người chết
> giữ, một mảnh trả cho nước. Nếu nó đã gọi được bằng giọng người nhà, đừng nghĩ cái giếng còn giữ được nó."*

**Hồi 2 — Ba nơi, ba ký ức**
1. **Hũ gạo, ký ức người sống** [CÓ + S]: mảnh chén có vết máu khô. Kèm **sổ đong gạo của bà năm 2003**: tháng Bảy ghi
   "đong cho hai đứa nhỏ", tháng Tám ghi "một". Rời bếp thì nghe tiếng vo gạo; quay lại, nước vo gạo trong thau đỏ đục
   như nước giếng.
2. **Mộ ông, ký ức người chết** [CÓ + S]: mảnh chén nằm cạnh **một cây lược con nít**. Trên bia có dòng "cháu nội: …" bị
   cạo nhẵn. Chạm vào mảnh chén thì nghe lại buổi chiều năm xưa: tiếng chén vỡ, bà gọi *"Út đâu rồi?"*, rồi im lặng rất
   lâu.
3. **Giếng, ký ức đứa bị bỏ lại** [CÓ + S]: kéo gàu lên **một chiếc dép trẻ con**, mảnh chén và **mảnh trang xé #2**:
   *"…đứa còn thở."* Giọng "mẹ" dưới giếng tới cùng lúc tin nhắn thật của mẹ [CÓ].

**Hồi 3 — Bóng sau lưng: thật hay giả** [M]
- Luật học được, dạy qua tái bút của chú Tư: *"Bước đều ba nhịp, dừng ngay sau lưng: đếm tới ba rồi quay lại. Bước lệch
  nhịp, hay vọng ra từ trong vách: đứng yên, đừng quay."*
- Bóng thật thì làm như hiện tại. Bóng giả: quay lại là bị bắt; đứng yên 5 giây thì nó tan.

**Hồi 4 — Ghép chén**
- Đặt chén lên bàn thờ trong bóng tối [CÓ]. Chén lành lại nhưng **sứt một miếng nhỏ bằng đầu ngón tay**: *"Còn thiếu
  một miếng."* (Đêm cuối sẽ tìm thấy.)

**Kết chương:** vệt nước trên nền nhà chảy ngược từ bàn thờ ra phía giếng [S]. Điện thoại nhận một đoạn **ghi âm 0:03**:
giọng con nít, *"Bà ơi… lần này bà ẵm con nghe."* [S]. Ngoài sân có tiếng chú Tư bắt đầu đếm.

### Chạng vạng — Gốc đa: "Người dẫn đường" (8–10 phút)

**Hồi 1 — Đi theo đèn dầu** [M: vật dẫn đường]
- Chú Tư là **ngọn đèn dầu đung đưa và tiếng dép lẹp xẹp** ở phía trước. Người chơi tụt lại thì đèn dừng chờ. *"Đi sát
  chú. Ai gọi cũng đừng thưa."*
- Chú đếm *một, hai, ba, bốn* mỗi khi qua một cột mốc, thay cho đếm theo giờ như hiện tại.
- Cảnh vật lệch đi: bụi chuối đổi bên, một con bù nhìn quay lưng [S].

**Hồi 2 — Tắt đèn, đi bằng tai**
- Bật đèn pin thì bù nhìn thức [CÓ].
- Một lúc sau có **tiếng dép giả** vọng từ phía sau hoặc từ giữa ruộng. Đi theo nó là lội xuống nước, sát bù nhìn.
  Dấu hiệu thật là ánh đèn dầu, chỉ còn mờ mờ [M].

**Hồi 3 — Giọng mẹ dưới ruộng** [CÓ]
- Trả lời thì bù nhìn **quay đầu đứng nhìn**, chưa đuổi ngay; chú Tư đếm tới *"năm"*, lần đầu tiên.

**Hồi 4 — Gốc đa**
- *"Tới rồi. Cháu đếm giúp chú coi có mấy người."* Bóng người ở rìa ánh đèn, mỗi góc nhìn một số khác. Chọn **Bốn** /
  **Năm** / **Không đếm** [M: hộp hỏi đáp]. Lưu dấu vết `counted_4`, `counted_5` hoặc `counted_none`.
  - Bốn: chú gật đầu, quay đi.
  - Năm: chú đứng im rất lâu, rồi nói *"…Ừ. Năm."*
  - Không đếm: tiếng đếm vọng từ trên cành cây.
- Chú quay lại, mặt trơn như giấy [CÓ]: *"Sao cháu đếm thiếu?"* (hoặc *"Sao cháu biết?"* nếu đã đếm năm). Giọng con
  nít trong gốc đa: *"Tại vì nhà mình chưa bao giờ đếm con."* Rồi *"…Sáu."* [CÓ].

**Kết chương:** tỉnh dậy ngoài sân. Trên cổ tay có **dấu son đỏ Phúc Ký**, con dấu ông đóng lên cổ tay mỗi hình nhân đã
xong [S]. Ở Đêm 3, người chơi sẽ thấy hình nhân nào cũng có dấu này.

### Đêm 3 — Hình nhân: "Thứ chỉ đi khi mình không nhìn" (15–20 phút)

**Hồi 1 — Tiệm Phúc Ký**
- Giấy thầy Sáu [CÓ]; bỏ chỉ chỗ cụ thể, để ở phần gợi ý.
- Ban đầu **mọi hình nhân trên kệ đều quay mặt vào tường**. Mỗi món lấy được là một thay đổi [M]:
  - món thứ nhất: một con quay mặt ra cửa;
  - món thứ hai: một con biến mất;
  - món thứ ba: trên kệ còn một khoảng trống cỡ con nít.
- **Hóa đơn trên quầy:** "Đám bà, đặt 6 hình nhân, đã giao 6." Đếm trong nhà chỉ có 5 [S].
- Cổ tay hình nhân nào cũng có dấu son đỏ, giống dấu trên tay mình [S].

**Hồi 2 — Mỗi hình nhân một luật** [M]
- Hình nhân thường: đi khi không bị nhìn [CÓ].
- Hình nhân trên gác: đứng yên khi mình ở trên gác; mỗi lần mình xuống rồi lên lại, nó gần đầu cầu thang hơn một đoạn.
- Hình nhân con nít (con thế thân cũ): **chỉ đi khi đèn pin tắt**. Ngược với con thường, nên người chơi phải tính lúc
  nào bật đèn.

**Hồi 3 — Chiếc áo cũ**
- Áo sơ mi trắng **vá chỉ đỏ ở cổ**, giống áo đứa trẻ trong ảnh hộp bánh quy [S].
- Lấy áo xong, trong tủ có tiếng con nít: *"Áo của con mà."* Mở tủ lại chỉ còn **cái móc trống đang đung đưa** [S].
- Trong đường may cổ áo có **mảnh trang xé #3**: *"Đứa còn thở thì bà bỏ lại dưới gầm bàn thờ."*
- Ảnh trong rương trên gác [CÓ].

**Hồi 4 — Nghi thức ngoài vườn** [CÓ + M]
- Lúc làm lễ, hình nhân hiện dọc hàng rào và cửa sổ, đổi tư thế lần lượt từng con. Lửa bén thì tất cả quay mặt vào nhà.
- Một giọng người lớn: *"Đúng rồi. Lần này phải đốt đứa đó."* Trong nhà có tiếng con nít khóc.
- Đầu ngón tay mình cháy xém, không đau [CÓ].

**Kết chương:** trong đống tro còn **mẩu cổ áo không cháy**, chữ muội than: *"Đừng đốt con lần nữa."* [S].

### Hồi tưởng — Rằm năm Quý Mùi: "Hai đứa trẻ" (10–12 phút)

Góc nhìn Út sáu tuổi [CÓ], không có đèn pin [S], đèn dầu.

**Hồi 1 — Chiều Rằm** (sinh hoạt bình thường)
- Đếm dép trước cửa: **bốn đôi** [S].
- Mâm cúng cô hồn ngoài hiên có **cháo trắng**, giống chén thứ năm ở Đêm 1 [S].
- Nghe bà và mẹ nói chuyện trong bếp: *"Thầy nói nó không qua được đêm nay."* Mẹ khóc [S].
- Ông trong tiệm bào cỗ hòm nhỏ "cho con búp bê" [CÓ].
- Con hình nhân trùm khăn đỏ [CÓ]. Hỏi bà thì bà nói: *"Búp bê của ông. Đừng đụng."*

**Hồi 2 — Trốn tìm, rồi điểm nhãn** [M]
- Mẹ chơi trốn tìm với Út. Mẹ đếm, mỗi lần tìm được một chỗ thì đếm tiếp từ một số khác: *"một, hai, ba…"*, rồi
  *"bốn, năm…"*. Giọng đếm càng lúc càng không giống mẹ.
- Ông gọi vào tiệm: *"Út, lại đây ông chỉ cái này."* Ông cầm tay Út **điểm hai chấm mực lên mắt con hình nhân**. Người
  chơi giữ phím để chấm từng mắt. Chấm xong: hình ảnh nhòe đôi trong một nhịp, và từ lúc đó tiếng bước chân là tiếng giấy.
- Đây là lời giải cho cây bút điểm nhãn ở Đêm 3: chính người chơi đã làm.

**Hồi 3 — Ba tiếng gõ** [CÓ + S]
- Ông ra canh cửa: *"Nhà này không có đứa nhỏ nào hết."* Giọng ngoài cửa: *"…Có. Hai đứa."* Thấy bóng chân dưới khe cửa.
- Mẹ đếm *"…sáu"*. Út chui xuống gầm bàn thờ; đã có một đứa nằm sẵn, mặc áo sơ mi trắng vá chỉ đỏ.

**Hồi 4 — Hai góc nhìn** [M]
1. Gần sáng, bà chui xuống. Góc nhìn **được bế lên**: *"Sao con nhẹ hều vậy Út."* Màn hình tối.
2. Góc nhìn **trở lại dưới gầm bàn thờ**, chỉ quay đầu được. Có hai chiếc dép nhỏ; **một chiếc được nhặt lên**. Ngoài
   phòng, bà nói: *"Từ nay trong nhà chỉ có một đứa thôi."* Im lặng rất lâu. Rồi ngay sát bên cạnh: *"Dạ."*
- Bỏ chi tiết "đứa kia mở mắt, mắt người" vì nó để lộ đáp án. Người chơi đã ở **cả hai** chỗ, chưa biết mình là đứa nào.

**Chuyển chương:** tỉnh dậy ở hiện tại, **nằm dưới gầm bàn thờ**, tay cầm **một chiếc dép nhỏ ướt sũng**.

### Đêm cuối — Người thứ năm: "Đừng bắt bà chọn lại" (20–25 phút)

**Hồi 1 — Dưới gầm bàn thờ**
- Bắt đầu dưới gầm bàn thờ, khăn đỏ phủ trước mặt, chui ra [S].
- Trang sổ cuối của bà [CÓ]. Bên dưới có thêm một dòng **bằng chữ của chính mình**: *"Bà đã chọn sai một lần. Đừng bắt
  bà chọn lại."*
- Ba việc: kéo [CÓ], **nhận ra tấm ảnh thật** (Hồi 3), và tùy chọn tìm **mảnh trang #4**.

**Hồi 2 — Nhà đổi mỗi lần mất điện** [M]
- Không đổi tường. Mỗi lần mất điện:
  - cửa phòng bà đổi đóng/mở;
  - mâm cơm có thêm chén;
  - hình nhân đứng ở chỗ khác;
  - ảnh thờ đổi biến thể.
- "Nó" mang mặt Út, **không đuổi ngay**. Nó đứng chờ ở những chỗ người chơi từng nghe giọng con nít ở các đêm trước.
  Nhìn nó quá lâu thì mặt nó thành **mặt Út sáu tuổi** [M].
- **Dấu vết lựa chọn** [M]:
  - đã trả lời giếng ở Đêm 2: nước dâng tới miệng giếng, phải kéo gàu trong lúc giọng kia gọi;
  - đã gõ lại hòm ở Đêm 2: cỗ hòm trốn được bị đóng đinh từ đầu;
  - `stared_no9`: thỉnh thoảng có tiếng móng tay gõ kính trên cửa sổ phòng khách.
- Thọ mộc của bà [CÓ]: chữ trên vé xe **giống hệt** dòng chữ sau tờ dặn ở Đêm 1.

**Hồi 3 — Hai mươi lăm giây** [M]
- Trên bàn thờ có **ba khung ảnh**: bản gốc năm 2003, một bản chụp lại, một tấm mới.
- Muốn nhận ra bản gốc phải nhớ manh mối: khoảng trống giữa bà và mẹ, hai dấu tay trên tấm ảnh nhỏ ở Đêm 1, áo vá chỉ
  đỏ ở Đêm 3.
- Bật cầu dao [CÓ], gỡ đúng ảnh. Gỡ sai thì ảnh rách, đèn tắt, nó đứng ngay trước mặt.

**Hồi 4 — Cỗ hòm nhỏ** [CÓ + S]
- Mở được khi có đủ 6 di vật **hoặc** đủ 3 mảnh trang (không chỉ dựa vào di vật nữa).
- Bên trong: bọc áo bà ba, xấp thư, **mảnh trang #4**, và **miếng sứ còn thiếu của cái chén nằm trong tay đứa bé**.

**Hồi 5 — Lựa chọn**
- Năm món đại diện năm người đặt trên bàn thờ: cái bào (ông), kim chỉ (bà), vé máy bay Đài Loan (mẹ), điện thoại (mình),
  **chiếc dép nhỏ ướt** (đứa thứ năm) [S].
- **Đốt người thứ năm:** cắt khỏi ảnh, bỏ vào thau. Đốt kèm đúng món thì tiếng khóc trong lửa dừng; kèm sai món thì vẫn
  xong lễ nhưng nghe tiếng con nít khóc trong lửa. Đi tới kết Hết hoặc Thế thân.
- **Trả hồn:** cắt đứa sáu tuổi, đặt vào hòm nhỏ **cùng chiếc dép**. Cần đã đọc cả 4 mảnh trang.
- **Mở cửa:** mở bất cứ lúc nào sau tiếng gõ.
- Sau khi đốt: tin nhắn từ số của chính mình, *"Mày đã đốt ai vậy?"*. Trên mặt kính khung ảnh vẫn in năm cái bóng [S].

### Hậu truyện — Giỗ đầu (3–5 phút, chương mới)

Một năm sau, ban ngày, cùng căn nhà, đèn sáng, không mưa [M]. Người chơi đi tới bàn thờ thắp nhang. Nhà khác nhau tùy kết:

| Kết | Hậu truyện |
| --- | --- |
| Hết | Năm đôi dép trước cửa, đôi nhỏ còn ướt. Bà Bảy: *"Năm nay con về sớm ha. Bữa hổm thấy con rồi."* Vòng lại câu mở đầu. |
| Thế thân | Mẹ ở nhà, dọn mâm bốn chén, không nhìn vào mắt mình. Chú Tư gọi "Út". Gầm bàn thờ trống. Trên ngón tay, chỗ kim đâm, dán một miếng giấy bản. |
| Trả hồn | Chơi bằng **góc nhìn đứa kia**. Ảnh thờ có Út sáu tuổi mờ dần. Trên bàn thờ có một hình nhân giấy nhỏ, mặt không vẽ mắt. Cửa sổ nhà số 9 mở, không ai đứng đó. Năm đôi dép đã khô. |
| Mở cửa | Đứng ngoài hiên. Trong nhà đèn sáng, mâm năm chén. Gõ ba tiếng. Trong nhà có giọng của chính mình: *"Đừng mở. Đêm nay đầu thất."* |

---

## 4. Trang sổ xé bốn mảnh

Đọc từng phần thì hiểu sai; đủ bốn mảnh thì ra sự thật. Mảnh trang được nhớ qua mọi lần chơi, ghép dần trong sổ tay.

| # | Ở đâu | Chữ | Đọc tới đây người chơi nghĩ |
| --- | --- | --- | --- |
| 1 | Sổ tay của bà (Đêm 1) | "Đứa được bế ra không phải…" | Bà bế nhầm một đứa nào đó. |
| 2 | Gàu giếng (Đêm 2) | "…đứa còn thở." | Đứa bà bế ra là người chết. Có thể chính mình là ma? |
| 3 | Cổ áo (Đêm 3) | "Đứa còn thở thì bà bỏ lại dưới gầm bàn thờ." | Đứa bị bỏ lại là người sống, và nó đã chết. |
| 4 | Hòm nhỏ (Đêm cuối) | "Nhưng hồn của Út theo đứa bà bế ra. Hai đứa đều là Út. Bà thương hết." | Sự thật, ngay trước phép thử kim. |

## 5. Bảng manh mối

| Manh mối | Ở đâu | Lúc đầu tưởng là | Thật ra là | Trả ở đâu |
| --- | --- | --- | --- | --- |
| "Bữa hổm con về rồi" | Mở đầu | Bà Bảy lẫn | Út về đêm 21/7 | Vé xe (Đêm cuối) |
| Đôi dép nhỏ ướt | Mở đầu, giếng, Hồi tưởng | Ma con nít | Dép của Út thật | Món thứ năm (Đêm cuối) |
| Chữ sau tờ dặn | Đêm 1 | Ai đó cảnh báo | Chữ của chính Út | Vé xe (Đêm cuối) |
| Chén cháo trắng | Đêm 1 | Ma tự bày | Nhà cúng đứa kia như cô hồn | Mâm cúng (Hồi tưởng) |
| Hai dấu tay giống hệt | Đêm 1 | Hai đứa sinh đôi? | Một đứa thật, một đứa giấy | Chọn ảnh (Đêm cuối) |
| Hộp thuốc "bé Út" tháng Bảy | Đêm 1 | Út hay ốm | Những lần bà dán thêm giấy | Thư trong hòm nhỏ |
| Sổ đong gạo "hai đứa" rồi "một" | Đêm 2 | Có đứa chết | Đúng: đứa thật chết | Mảnh trang #3 |
| Chén sứt một miếng | Đêm 2 | Thiếu mảnh | Miếng sứ trong tay đứa bé | Hòm nhỏ |
| Dấu son đỏ trên cổ tay | Chạng vạng | Bị ma đánh dấu | Dấu Phúc Ký đóng lên hình nhân | Cổ tay hình nhân (Đêm 3) |
| Áo vá chỉ đỏ | Đêm 3 | Áo cũ của mình | Áo cả hai đứa từng mặc | Hồi tưởng, chọn ảnh |
| Điểm nhãn | Đêm 3 (bút), Hồi tưởng | Ai đó điểm mắt hình nhân | Chính tay mình | Phép thử kim |

## 6. Dấu vết lựa chọn (lưu qua các đêm)

| Dấu vết | Đặt ở | Ảnh hưởng |
| --- | --- | --- |
| `said_dont_remember` | Mở đầu | Đêm cuối có thêm thoại; thêm một dòng ở kết Thế thân. |
| `stared_no9` | Mở đầu | Đêm cuối có tiếng gõ kính; Hậu truyện Trả hồn có cửa sổ mở. |
| `answered_well` | Đêm 2 | Đêm cuối giếng đầy nước. |
| `knocked_back` | Đêm 2 | Đêm cuối hòm trốn bị đóng đinh từ đầu. |
| `counted_4` / `counted_5` / `counted_none` | Chạng vạng | `counted_5` là điều kiện mềm cho Trả hồn (thêm thoại của bà). `counted_4`: kết Hết lạnh hơn. |
| `fragments` (0–4) | Đêm 1–cuối | Đủ 4 thì mở được Trả hồn; đủ 3 thì mở được hòm nhỏ. |
| `relics` (0–6) | Mọi chương | Đủ 6 thì có kết Thế thân (giữ như cũ). |

## 7. Hệ thống cần làm

| Ưu tiên | Hệ thống | Chi phí | Dùng ở |
| --- | --- | --- | --- |
| 1 | Hộp hỏi đáp 2–4 lựa chọn (phím 1–4, khóa điều khiển) | M | Bà Bảy, đếm người, chọn ảnh, chọn món |
| 2 | Dấu vết lựa chọn và mảnh trang lưu qua các đêm (localStorage, như di vật) | S | Mọi chương |
| 3 | Vật hiện/đổi khi không nhìn (dữ liệu trên `hidden` + `show` sẵn có) | S | Chén thứ năm, ly nước, kệ hình nhân |
| 4 | Thắp nhang giữ phím; điểm nhãn giữ phím | S | Đêm 1, Hồi tưởng |
| 5 | Bóng sau lưng thật/giả | M | Đêm 2, Đêm cuối |
| 6 | Vòng lặp con ngõ (đưa về đầu ngõ + đổi đạo cụ) | M | Mở đầu |
| 7 | Kẻ săn đuổi nhớ đường; đứng chờ thay vì đuổi | M | Đêm 1, Đêm cuối |
| 8 | Đèn dầu dẫn đường + tiếng dép giả | M | Chạng vạng |
| 9 | Luật hình nhân theo tầng và theo đèn pin | M | Đêm 3 |
| 10 | Hồi tưởng: trốn tìm, góc nhìn thứ hai | M | Hồi tưởng |
| 11 | Đêm cuối: ba khung ảnh, năm món, nhà đổi khi mất điện | M | Đêm cuối |
| 12 | Hậu truyện ban ngày (bốn biến thể) | M | Chương mới |

Không làm: nhà đổi bố cục, gương thật, camera điện thoại, NPC có mô hình và hoạt ảnh đầy đủ.

## 8. Lộ trình

1. **Đêm 1 v2 làm bản mẫu:** hệ thống 1–4 và 7, cùng toàn bộ hồi của Đêm 1. Chơi thử, đo thời lượng thật, chỉnh nhịp.
2. Mở đầu và Đêm 2 (hệ thống 5, 6).
3. Chạng vạng và Đêm 3 (hệ thống 8, 9).
4. Hồi tưởng, Đêm cuối, Hậu truyện (hệ thống 10–12).
5. Chơi thử với người chưa biết cốt truyện. Cắt những đoạn chỉ kéo dài thời gian.
