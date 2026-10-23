/**
 * Quảng cáo rao vặt và sơn xịt trên tường ngõ — thứ hẻm Việt nào cũng có: tem "khoan cắt bê tông, thông cống nghẹt",
 * bảng cảnh báo trộm chó, chữ sơn của fan T1, fan MU, giấy cho thuê phòng, rút tiền thẻ tín dụng.
 * Số điện thoại cố ý là số không gọi được (đầu 04 cũ) — và toàn số 4.
 */
import { paintedRect } from "./decorTextures";
import { speckle, type Ctx } from "./textures";

const FONT = "'Be Vietnam Pro', 'Noto Serif', sans-serif";

/** Chữ căn giữa, tự thu nhỏ cho vừa bề ngang. */
function fit(ctx: Ctx, text: string, x: number, y: number, maxW: number, size: number, weight = "bold"): void {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${FONT}`;
    s -= 1;
  } while (ctx.measureText(text).width > maxW && s > 6);
  ctx.fillText(text, x, y);
}

/** Giấy dán đã ố, mưa làm loang mép. */
function weather(ctx: Ctx, w: number, h: number): void {
  speckle(ctx, w, h, Math.round((w * h) / 90), "rgba(60,45,30,0.18)", 2);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(70,50,25,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Tem "khoan cắt bê tông — thông cống nghẹt": giấy vàng, chữ đỏ xanh, số toàn số 4. */
export function drainAdUrl(variant: number): string {
  return paintedRect(`ad:drain:${variant}`, 192, 72, (ctx, w, h) => {
    ctx.fillStyle = variant % 2 ? "#f2e27a" : "#f4f1e6";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#c0201a";
    fit(ctx, "KHOAN CẮT BÊ TÔNG", w / 2, h * 0.2, w - 10, 18);
    ctx.fillStyle = "#1c3f8f";
    fit(ctx, "THÔNG CỐNG NGHẸT · HÚT HẦM CẦU", w / 2, h * 0.47, w - 10, 14);
    ctx.fillStyle = "#c0201a";
    fit(ctx, "0444.444.444", w / 2, h * 0.78, w - 16, 24);
    weather(ctx, w, h);
    // Góc bị bóc mất.
    ctx.clearRect(w - 18 - variant * 6, 0, 18 + variant * 6, 10 + variant * 4);
  });
}

/** Bảng tôn sơn tay: cảnh báo trộm chó; bên dưới ai đó viết thêm bằng bút lông. */
export function dogThiefUrl(): string {
  return paintedRect("ad:dog", 256, 176, (ctx, w, h) => {
    ctx.fillStyle = "#e8e4d8";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#a3241c";
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#a3241c";
    fit(ctx, "CẢNH BÁO", w / 2, 30, w - 30, 30);
    fit(ctx, "XÓM CÓ TRỘM CHÓ", w / 2, 64, w - 30, 26);
    ctx.fillStyle = "#2a2a2a";
    fit(ctx, "BÀ CON CẢNH GIÁC · BẮT ĐƯỢC GIAO CÔNG AN", w / 2, 94, w - 30, 13);
    // Nét bút lông đen, nghiêng, viết vội.
    ctx.save();
    ctx.translate(w / 2, 136);
    ctx.rotate(-0.06);
    ctx.fillStyle = "#151515";
    fit(ctx, "Trộm luôn con nhà số 7 giùm, sủa quá trời", 0, 0, w - 34, 15, "italic 600");
    ctx.restore();
    // Rỉ sét chảy từ hai con vít.
    for (const x of [16, w - 16]) {
      ctx.fillStyle = "#3a2a20";
      ctx.beginPath();
      ctx.arc(x, 14, 3, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, 14, 0, 70);
      g.addColorStop(0, "rgba(120,60,25,0.55)");
      g.addColorStop(1, "rgba(120,60,25,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 2, 14, 4, 56);
    }
    weather(ctx, w, h);
  });
}

/** Chữ sơn xịt trên nền trong suốt: viền mờ, giọt sơn chảy. */
function spray(ctx: Ctx, text: string, x: number, y: number, maxW: number, size: number, color: string, tilt = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  fit(ctx, text, 0, 0, maxW, size, "900");
  ctx.shadowBlur = 0;
  // Giọt sơn chảy xuống từ chân chữ.
  const width = Math.min(maxW, ctx.measureText(text).width);
  for (let i = 0; i < 6; i++) {
    const dx = (Math.random() - 0.5) * width;
    ctx.fillRect(dx, size * 0.35, 2, 6 + Math.random() * size * 0.7);
  }
  ctx.restore();
}

/** Fan T1 (sơn đỏ, viền trắng): vô địch CKTG 2023 — trước mốc tháng 8/2024 của game. */
export function t1GraffitiUrl(): string {
  return paintedRect("ad:t1", 256, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    spray(ctx, "T1", w * 0.32, h * 0.38, 120, 76, "#e8e2d6", -0.08);
    spray(ctx, "T1", w * 0.32 - 3, h * 0.38 - 3, 120, 76, "#c4121f", -0.08);
    spray(ctx, "VÔ ĐỊCH CKTG 2023", w * 0.62, h * 0.7, 170, 20, "#e8e2d6", -0.05);
    spray(ctx, "FAKER BẤT TỬ", w * 0.7, h * 0.18, 120, 18, "#c4121f", 0.06);
  });
}

/** Fan MU (sơn đỏ) — và hai nét chữ khác cãi nhau ngay bên dưới. */
export function muGraffitiUrl(): string {
  return paintedRect("ad:mu", 256, 176, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    spray(ctx, "GLORY GLORY", w * 0.5, h * 0.14, 200, 22, "#d61f26", 0.04);
    spray(ctx, "MU", w * 0.42, h * 0.42, 140, 70, "#d61f26", -0.05);
    spray(ctx, "VÔ ĐỊCH FA CUP 2024", w * 0.55, h * 0.66, 190, 17, "#f1d23a", -0.03);
    // Hai người khác viết thêm, bút xóa và than.
    ctx.save();
    ctx.translate(w * 0.45, h * 0.82);
    ctx.rotate(0.04);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9e7df";
    fit(ctx, "Ngoại hạng thì đợi năm sau", 0, 0, 200, 13, "italic 600");
    ctx.rotate(-0.08);
    ctx.fillStyle = "#1b1b1b";
    fit(ctx, "Năm nào cũng đợi", 30, 20, 150, 12, "italic 600");
    ctx.restore();
  });
}

/** Giấy dán rao vặt nhỏ: cho thuê phòng, rút tiền thẻ tín dụng. */
export function smallAdUrl(kind: "room" | "card"): string {
  return paintedRect(`ad:small:${kind}`, 160, 96, (ctx, w, h) => {
    ctx.fillStyle = kind === "room" ? "#ffffff" : "#ffe3e3";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = kind === "room" ? "#123a7a" : "#b0151b";
    if (kind === "room") {
      fit(ctx, "CHO THUÊ PHÒNG", w / 2, 22, w - 12, 22);
      ctx.fillStyle = "#333";
      fit(ctx, "Có gác · Giờ giấc tự do · Không chung chủ", w / 2, 50, w - 12, 11, "600");
      // Tua số điện thoại xé được — đã bị xé gần hết.
      for (let i = 0; i < 6; i++) {
        if (i !== 2) continue;
        ctx.fillStyle = "#123a7a";
        ctx.save();
        ctx.translate(14 + i * 26, 82);
        ctx.rotate(-Math.PI / 2);
        fit(ctx, "0444…", 0, 0, 28, 8, "600");
        ctx.restore();
      }
    } else {
      fit(ctx, "RÚT TIỀN", w / 2, 24, w - 12, 24);
      fit(ctx, "THẺ TÍN DỤNG", w / 2, 50, w - 12, 18);
      ctx.fillStyle = "#333";
      fit(ctx, "Phí thấp · Nhận tiền ngay · 0444.444.444", w / 2, 76, w - 12, 10, "600");
    }
    weather(ctx, w, h);
  });
}
