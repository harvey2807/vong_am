/**
 * Texture cho đồ trang trí: câu đối, hoành phi, bùa, lịch, vòng hoa tang, lá chuối, gạch, đất...
 * Chữ Hán trên câu đối/bùa là nét bút giả lập (không cần font CJK) — ở độ phân giải PS1 nhìn vẫn ra thư pháp.
 */
import { speckle, type Ctx } from "./textures";

const cache = new Map<string, string>();

function paintedRect(key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const url = c.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

/** Một "chữ" thư pháp: vài nét ngang, sổ, chấm, phẩy trong ô vuông. */
function glyph(ctx: Ctx, x: number, y: number, size: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  const n = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) {
    ctx.lineWidth = size * (0.06 + Math.random() * 0.07);
    const kind = Math.random();
    const ax = x + size * (0.15 + Math.random() * 0.7);
    const ay = y + size * (0.15 + Math.random() * 0.7);
    ctx.beginPath();
    if (kind < 0.35) {
      // nét ngang
      const len = size * (0.3 + Math.random() * 0.5);
      ctx.moveTo(Math.max(x + size * 0.1, ax - len / 2), ay);
      ctx.quadraticCurveTo(ax, ay - size * 0.05, Math.min(x + size * 0.9, ax + len / 2), ay + size * 0.03);
    } else if (kind < 0.65) {
      // nét sổ
      const len = size * (0.3 + Math.random() * 0.55);
      ctx.moveTo(ax, Math.max(y + size * 0.08, ay - len / 2));
      ctx.lineTo(ax + size * 0.02, Math.min(y + size * 0.92, ay + len / 2));
    } else if (kind < 0.85) {
      // nét phẩy / mác
      const dir = Math.random() < 0.5 ? -1 : 1;
      ctx.moveTo(ax, ay - size * 0.2);
      ctx.quadraticCurveTo(ax + dir * size * 0.05, ay, ax + dir * size * 0.25, ay + size * 0.22);
    } else {
      ctx.arc(ax, ay, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Câu đối đỏ chữ vàng (dọc). */
export function coupletUrl(seed: string, chars = 7): string {
  return paintedRect(`couplet:${seed}`, 48, 48 * chars + 16, (ctx, w, h) => {
    ctx.fillStyle = "#7a1410";
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 300, "rgba(20,0,0,0.25)", 2);
    ctx.strokeStyle = "#b8892e";
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    for (let i = 0; i < chars; i++) glyph(ctx, 6, 10 + i * 48, 36, "#d9ad48");
    // bạc màu từ dưới lên
    const g = ctx.createLinearGradient(0, h * 0.6, 0, h);
    g.addColorStop(0, "rgba(40,20,10,0)");
    g.addColorStop(1, "rgba(40,20,10,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Hoành phi: bảng gỗ sơn son, bốn chữ vàng nằm ngang. */
export function plaqueUrl(): string {
  return paintedRect("plaque", 256, 72, (ctx, w, h) => {
    ctx.fillStyle = "#3a0d08";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#6a1a10";
    ctx.fillRect(6, 6, w - 12, h - 12);
    ctx.strokeStyle = "#a07a2a";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    for (let i = 0; i < 4; i++) glyph(ctx, 22 + i * 56, 14, 44, "#d6a640");
    speckle(ctx, w, h, 200, "rgba(0,0,0,0.25)", 2);
  });
}

/** Bùa vàng chữ đỏ, có dấu mộc. */
export function talismanUrl(seed: string): string {
  return paintedRect(`talisman:${seed}`, 40, 120, (ctx, w, h) => {
    ctx.fillStyle = "#d4b24a";
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 120, "rgba(120,80,20,0.2)", 2);
    ctx.strokeStyle = "#9a1a10";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    for (let i = 0; i < 3; i++) glyph(ctx, 6, 8 + i * 30, 28, "#a01c12");
    ctx.fillStyle = "rgba(170,20,15,0.85)";
    ctx.fillRect(w / 2 - 8, h - 26, 16, 16);
    ctx.fillStyle = "#d4b24a";
    ctx.fillRect(w / 2 - 5, h - 23, 10, 10);
  });
}

/** Lịch bloc xé ngày: Rằm tháng Bảy — tháng cô hồn. */
export function calendarUrl(): string {
  return paintedRect("calendar", 96, 128, (ctx, w, h) => {
    ctx.fillStyle = "#8a1c14";
    ctx.fillRect(0, 0, w, 22);
    ctx.fillStyle = "#e6dfcf";
    ctx.fillRect(0, 22, w, h - 22);
    ctx.fillStyle = "#f1e6c8";
    ctx.font = "bold 11px serif";
    ctx.textAlign = "center";
    ctx.fillText("THÁNG 8 · 2024", w / 2, 15);
    ctx.fillStyle = "#a3201a";
    ctx.font = "bold 58px serif";
    ctx.fillText("18", w / 2, 82);
    ctx.fillStyle = "#2a2018";
    ctx.font = "11px serif";
    ctx.fillText("CHỦ NHẬT", w / 2, 98);
    ctx.font = "italic 10px serif";
    ctx.fillText("Âm lịch: Rằm tháng Bảy", w / 2, 114);
    speckle(ctx, w, h, 150, "rgba(60,40,20,0.12)", 2);
  });
}

/** Vòng hoa tang: hoa trắng vàng, băng đen chữ "Vô cùng thương tiếc". Có alpha. */
export function wreathUrl(): string {
  return paintedRect("wreath", 256, 320, (ctx, w, h) => {
    const cx = w / 2;
    const cy = 128;
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 70 + Math.random() * 46;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      ctx.fillStyle = Math.random() < 0.15 ? "#2f4a26" : Math.random() < 0.7 ? "#e8e2d4" : "#d9b84a";
      ctx.beginPath();
      ctx.arc(x, y, 6 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#14110f";
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // băng tang
    for (const dx of [-26, 26]) {
      ctx.fillStyle = "#0d0b0a";
      ctx.fillRect(cx + dx - 14, cy + 40, 28, h - cy - 40);
      ctx.save();
      ctx.translate(cx + dx, cy + 54);
      ctx.fillStyle = "#e0d6c0";
      ctx.font = "bold 12px serif";
      ctx.textAlign = "center";
      const words = dx < 0 ? ["VÔ", "CÙNG"] : ["THƯƠNG", "TIẾC"];
      words.forEach((wd, i) => {
        ctx.save();
        ctx.translate(0, i * 60 + 20);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(wd, 0, 4);
        ctx.restore();
      });
      ctx.restore();
    }
  });
}

/** Lá chuối: gân giữa, rách tua theo gân. Có alpha. */
export function bananaLeafUrl(): string {
  return paintedRect("bananaLeaf", 64, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#2f4a1c";
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.quadraticCurveTo(w * 1.05, h * 0.35, w * 0.6, h);
    ctx.lineTo(w * 0.4, h);
    ctx.quadraticCurveTo(-w * 0.05, h * 0.35, w / 2, 0);
    ctx.fill();
    // vệt vàng úa, mép khô
    speckle(ctx, w, h, 80, "rgba(120,110,40,0.35)", 4);
    ctx.strokeStyle = "rgba(20,30,10,0.5)";
    ctx.lineWidth = 1;
    for (let y = 8; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.lineTo(0, y + 10);
      ctx.moveTo(w / 2, y);
      ctx.lineTo(w, y + 10);
      ctx.stroke();
    }
    // rách tua
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 9; i++) {
      const y = Math.random() * h * 0.9 + 10;
      const side = Math.random() < 0.5 ? 0 : w;
      ctx.beginPath();
      ctx.moveTo(side, y);
      ctx.lineTo(w / 2 + (side ? 3 : -3), y + 4);
      ctx.lineTo(side, y + 7);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#a8a868";
    ctx.fillRect(w / 2 - 1.5, 0, 3, h);
  });
}

export function roofTileUrl(): string {
  return paintedRect("roofTile", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#3a1e14";
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const r = 90 + Math.random() * 30;
        ctx.fillStyle = `rgb(${r},${r * 0.45},${r * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(col * 16 + 8 + (row % 2) * 8, row * 16 + 10, 8, 9, 0, 0, Math.PI);
        ctx.fill();
      }
    }
    speckle(ctx, w, h, 200, "rgba(20,30,10,0.4)", 3);
  });
}

/** Vệt sáng xiên qua cửa sổ: dải mờ dần, cộng màu (additive). */
export function shaftUrl(): string {
  return paintedRect("shaft", 64, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const s = ctx.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, "rgba(0,0,0,1)");
    s.addColorStop(0.2, "rgba(0,0,0,0)");
    s.addColorStop(0.8, "rgba(0,0,0,0)");
    s.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Chấm sáng mềm cho bụi, mưa, khói. */
export function softDotUrl(): string {
  return paintedRect("softDot", 32, 32, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

export function clothUrl(): string {
  return paintedRect("cloth", 64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#cfc8b8";
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 120, "rgba(80,70,50,0.15)", 3);
    ctx.fillStyle = "rgba(90,70,40,0.25)";
    ctx.fillRect(0, h - 10, w, 10);
  });
}

/** Mạng nhện góc trần. Có alpha. */
export function cobwebUrl(): string {
  return paintedRect("cobweb", 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(220,220,215,0.5)";
    ctx.lineWidth = 0.8;
    const spokes = 9;
    for (let i = 0; i < spokes; i++) {
      const a = (i / (spokes - 1)) * (Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * w * 1.1, Math.sin(a) * h * 1.1);
      ctx.stroke();
    }
    for (let r = 10; r < w; r += 9 + Math.random() * 5) {
      ctx.beginPath();
      for (let i = 0; i < spokes; i++) {
        const a = (i / (spokes - 1)) * (Math.PI / 2);
        const rr = r * (0.9 + Math.random() * 0.15);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.quadraticCurveTo(Math.cos(a - 0.1) * rr * 0.92, Math.sin(a - 0.1) * rr * 0.92, x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(200,200,190,0.18)";
    ctx.fillRect(0, 0, w * 0.25, h * 0.25);
  });
}

/** Vàng mã: giấy vàng, ô kim nhũ giữa, dấu đỏ. */
export function jossPaperUrl(): string {
  return paintedRect("joss", 64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#c9a95a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e3c56a";
    ctx.fillRect(w * 0.25, h * 0.25, w * 0.5, h * 0.5);
    ctx.strokeStyle = "#a6201a";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    glyph(ctx, w * 0.3, h * 0.3, w * 0.4, "#9a1c14");
    speckle(ctx, w, h, 60, "rgba(80,50,10,0.25)", 2);
  });
}

/** Tro giấy cháy: loang đen xám, mép cháy cam. Có alpha. */
export function ashUrl(): string {
  return paintedRect("ash", 64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const r = Math.random() * w * 0.32;
      const a = Math.random() * Math.PI * 2;
      ctx.fillStyle = Math.random() < 0.1 ? "rgba(140,60,20,0.6)" : `rgba(${20 + Math.random() * 40},${20 + Math.random() * 35},${20 + Math.random() * 30},0.8)`;
      ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 2 + Math.random() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Áo giấy của hình nhân: giấy màu hồ dán, viền kim tuyến, hoa văn vẽ tay. */
export function effigyRobeUrl(color: string): string {
  return paintedRect(`robe:${color}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    // nếp giấy dán
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(x, 0, 2, h);
    }
    ctx.fillStyle = "#d9b44a";
    ctx.fillRect(0, h * 0.08, w, 5);
    ctx.fillRect(0, h * 0.86, w, 7);
    ctx.strokeStyle = "rgba(240,220,150,0.7)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const cx = (i + 0.5) * (w / 6);
      ctx.beginPath();
      ctx.arc(cx, h * 0.5, 6, 0, Math.PI * 2);
      ctx.moveTo(cx - 9, h * 0.62);
      ctx.quadraticCurveTo(cx, h * 0.55, cx + 9, h * 0.62);
      ctx.stroke();
    }
    speckle(ctx, w, h, 200, "rgba(0,0,0,0.12)", 2);
    // ẩm mốc loang từ gấu áo
    const g = ctx.createLinearGradient(0, h * 0.6, 0, h);
    g.addColorStop(0, "rgba(30,25,10,0)");
    g.addColorStop(1, "rgba(30,25,10,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Mặt hình nhân. "painted": trắng phấn, má đỏ, mắt một nét, môi son (đồ mã bình thường).
 * "blank": trơn trắng, chỉ còn vết hồ dán loang — Kẻ Không Có Mặt.
 * "grab": lúc áp sát — hốc mắt đen chảy mực xuống, miệng xé toạc.
 */
export function effigyFaceUrl(mode: "painted" | "blank" | "grab"): string {
  const faceless = mode !== "painted";
  return paintedRect(`effigyFace:${mode}`, 64, 80, (ctx, w, h) => {
    ctx.fillStyle = "#ece6da";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h * 0.22);
    ctx.fillRect(0, 0, w * 0.1, h * 0.6);
    ctx.fillRect(w * 0.9, 0, w * 0.1, h * 0.6);
    if (mode === "grab") {
      ctx.fillStyle = "#050303";
      ctx.strokeStyle = "rgba(5,3,3,0.85)";
      ctx.lineWidth = 2;
      for (const dx of [-0.18, 0.18]) {
        const x = w * (0.5 + dx);
        ctx.beginPath();
        ctx.ellipse(x, h * 0.44, w * 0.09, h * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x - 4 + i * 4, h * 0.48);
          ctx.lineTo(x - 4 + i * 4 + Math.random() * 2, h * (0.6 + Math.random() * 0.2));
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.72);
      ctx.quadraticCurveTo(w * 0.5, h * 0.66, w * 0.7, h * 0.72);
      ctx.quadraticCurveTo(w * 0.5, h * 1.02, w * 0.3, h * 0.72);
      ctx.fill();
      return;
    }
    if (faceless) {
      ctx.fillStyle = "rgba(170,160,130,0.35)";
      ctx.beginPath();
      ctx.ellipse(w * 0.45, h * 0.55, w * 0.2, h * 0.12, 0.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = "rgba(210,70,70,0.55)";
    for (const dx of [-0.24, 0.24]) {
      ctx.beginPath();
      ctx.arc(w * (0.5 + dx), h * 0.6, w * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 2;
    for (const dx of [-0.17, 0.17]) {
      ctx.beginPath();
      ctx.moveTo(w * (0.5 + dx) - 6, h * 0.45);
      ctx.quadraticCurveTo(w * (0.5 + dx), h * 0.42, w * (0.5 + dx) + 6, h * 0.45);
      ctx.stroke();
    }
    ctx.fillStyle = "#b01818";
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.74, w * 0.07, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Chữ than viết vội trên tường: vạch đếm người và một dòng chữ. Có alpha. */
export function charcoalUrl(): string {
  return paintedRect("charcoal", 256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(15,12,10,0.85)";
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(20 + i * 16, 14 + Math.random() * 4);
      ctx.lineTo(18 + i * 16 + Math.random() * 4, 58);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(12, 50);
    ctx.lineTo(100, 20);
    ctx.stroke();
    ctx.fillStyle = "rgba(15,12,10,0.85)";
    ctx.font = "bold 26px serif";
    ctx.save();
    ctx.translate(12, 104);
    ctx.rotate(-0.04);
    ctx.fillText("CÒN THIẾU MỘT", 0, 0);
    ctx.restore();
  });
}

/** Cửa cuốn tôn gỉ: gân ngang, vệt gỉ chảy, khóa ở chân. */
export function shutterUrl(seed: string): string {
  return paintedRect(`shutter:${seed}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#4a4d4c";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, y, w, 1);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, y + 4, w, 2);
    }
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * w;
      const len = 10 + Math.random() * 60;
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, "rgba(120,60,25,0.55)");
      g.addColorStop(1, "rgba(120,60,25,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, Math.random() * h * 0.6, 2 + Math.random() * 5, len);
    }
    speckle(ctx, w, h, 200, "rgba(20,15,10,0.3)", 2);
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(w / 2 - 6, h - 10, 12, 6);
  });
}

/** Biển hiệu nhà ngõ: nền sơn bạc màu, chữ Việt in hoa. */
export function signUrl(text: string, bg: string, fg: string): string {
  return paintedRect(`sign:${text}`, 256, 64, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = "bold 30px 'Be Vietnam Pro', 'Noto Serif', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 2);
    speckle(ctx, w, h, 260, "rgba(0,0,0,0.25)", 3);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(30,20,10,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Cửa sổ song sắt: `lit` = có đèn vàng sau rèm, không thì tối đen. */
export function barredWindowUrl(lit: boolean): string {
  return paintedRect(`window:${lit}`, 96, 96, (ctx, w, h) => {
    if (lit) {
      const g = ctx.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, "#e2b06a");
      g.addColorStop(1, "#6a4420");
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "#050606";
    }
    ctx.fillRect(0, 0, w, h);
    if (lit) {
      // rèm vải mỏng
      for (let x = 0; x < w; x += 8) {
        ctx.fillStyle = "rgba(90,50,20,0.25)";
        ctx.fillRect(x, 0, 3, h);
      }
    }
    ctx.fillStyle = "#151515";
    for (let x = 10; x < w; x += 14) ctx.fillRect(x, 0, 3, h);
    ctx.fillRect(0, h / 2 - 2, w, 4);
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, h);
  });
}

/** Gương mặt mờ sau kính cửa sổ tối (nhà số 9) — có alpha. */
export function windowFaceUrl(): string {
  return paintedRect("windowFace", 64, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.45, 2, w / 2, h * 0.45, w * 0.5);
    g.addColorStop(0, "rgba(225,218,205,0.95)");
    g.addColorStop(0.7, "rgba(170,165,155,0.7)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.45, w * 0.36, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#050404";
    for (const dx of [-0.16, 0.16]) {
      ctx.beginPath();
      ctx.ellipse(w * (0.5 + dx), h * 0.4, w * 0.08, h * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.62, w * 0.05, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    // tóc rủ
    ctx.fillStyle = "rgba(5,5,5,0.95)";
    ctx.fillRect(0, 0, w, h * 0.12);
    ctx.fillRect(0, 0, w * 0.18, h);
    ctx.fillRect(w * 0.82, 0, w * 0.18, h);
  });
}

/** Rơm khô: sợi vàng xỉn chồng chéo. */
export function strawUrl(): string {
  return paintedRect("straw", 64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#6e5a2c";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = `rgba(${150 + Math.random() * 60},${120 + Math.random() * 50},${50 + Math.random() * 30},0.7)`;
      ctx.lineWidth = 1;
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 6, y + 8 + Math.random() * 14);
      ctx.stroke();
    }
  });
}

/** Mặt bù nhìn: bao bố may túm, hai mắt than vẽ nguệch ngoạc, miệng khâu chỉ. */
export function sackFaceUrl(): string {
  return paintedRect("sackFace", 64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#8a7550";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = "rgba(50,35,15,0.15)";
      ctx.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 2) {
      ctx.fillStyle = "rgba(50,35,15,0.1)";
      ctx.fillRect(x, 0, 1, h);
    }
    ctx.fillStyle = "#0d0906";
    for (const dx of [-0.18, 0.18]) {
      ctx.beginPath();
      ctx.ellipse(w * (0.5 + dx), h * 0.42, w * 0.08, h * 0.1, dx, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#1a120a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.7);
    ctx.lineTo(w * 0.72, h * 0.7);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const x = w * (0.3 + i * 0.065);
      ctx.beginPath();
      ctx.moveTo(x, h * 0.65);
      ctx.lineTo(x, h * 0.75);
      ctx.stroke();
    }
  });
}

/** Một khóm lúa (alpha): lá mảnh xanh đậm ngả vàng ở ngọn. */
export function riceUrl(): string {
  return paintedRect("rice", 64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x0 = w / 2 + (Math.random() - 0.5) * 14;
      const x1 = x0 + (Math.random() - 0.5) * 40;
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, "#1f3416");
      g.addColorStop(0.7, "#4c6a26");
      g.addColorStop(1, "#8f8a3c");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5 + Math.random();
      ctx.beginPath();
      ctx.moveTo(x0, h);
      ctx.quadraticCurveTo(x0, h * 0.4, x1, Math.random() * h * 0.3);
      ctx.stroke();
    }
  });
}

/** Tấm bìa các-tông viết tay treo trên cọc tre ở bờ ruộng. */
export function cardboardSignUrl(lines: string[]): string {
  return paintedRect(`card:${lines.join("|")}`, 160, 120, (ctx, w, h) => {
    ctx.fillStyle = "#8c7048";
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 300, "rgba(40,25,10,0.25)", 3);
    ctx.fillStyle = "rgba(30,20,10,0.35)";
    ctx.fillRect(0, h * 0.85, w, h * 0.15);
    ctx.fillStyle = "#14100c";
    ctx.font = "bold 22px 'Patrick Hand', 'Be Vietnam Pro', sans-serif";
    ctx.textAlign = "center";
    lines.forEach((l, i) => {
      ctx.save();
      ctx.translate(w / 2, 38 + i * 32);
      ctx.rotate((Math.random() - 0.5) * 0.06);
      ctx.fillText(l, 0, 0);
      ctx.restore();
    });
  });
}
