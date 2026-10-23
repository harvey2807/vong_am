/**
 * Texture cho hình nhân giấy kiểu Hoa (纸扎 — đồ trát giấy): Kim Đồng áo xanh, Ngọc Nữ áo hồng,
 * hình nhân thế mạng giấy trắng. Mọi thứ vẽ bằng Canvas — giấy bồi, nếp gấp, mây lành, viền chữ hồi (回),
 * vết ố nước, chỗ rách lộ khung nan tre.
 */
import { glyph, paintedRect } from "./decorTextures";
import { speckle, type Ctx } from "./textures";

export type DollKind = "boy" | "girl" | "standIn";
/**
 * Mặt hình nhân. Thợ trát giấy không bao giờ điểm mắt (点睛) cho hình nhân — điểm mắt là cho nó hồn.
 * undotted: mắt trắng không con ngươi (đồ mã bình thường) · dotted: đã bị ai điểm mắt — nó đang nhìn ·
 * grab: con ngươi loang đen, mực đỏ chảy, miệng rách toác · blank: giấy trắng trơn (thế mạng chưa dán mặt).
 */
export type DollFace = "undotted" | "dotted" | "grab" | "blank";

interface Palette {
  robe: string;
  dark: string;
  trim: string;
  motif: string;
  trousers: string;
}

export const PALETTES: Record<DollKind, Palette> = {
  boy: { robe: "#2f6f7a", dark: "#1d4a52", trim: "#c9a23a", motif: "#9fd0c8", trousers: "#7a2a2a" },
  girl: { robe: "#c2456a", dark: "#8a2846", trim: "#d8b54a", motif: "#f3c2cf", trousers: "#3f7a4a" },
  standIn: { robe: "#e6e0d2", dark: "#bdb5a2", trim: "#cfc8b6", motif: "#d6cfbd", trousers: "#d8d1c0" },
};

/** Thớ giấy bồi + nếp gấp dọc + vết ố — lớp phủ chung cho mọi tấm giấy. */
function paperGrain(ctx: Ctx, w: number, h: number, stains: number): void {
  speckle(ctx, w, h, (w * h) / 300, "rgba(255,255,255,0.05)", 1.2);
  speckle(ctx, w, h, (w * h) / 400, "rgba(0,0,0,0.06)", 1);
  ctx.lineWidth = 1;
  for (let i = 0; i < w / 18; i++) {
    const x = Math.random() * w;
    ctx.strokeStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 30, h);
    ctx.stroke();
  }
  for (let i = 0; i < stains; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 15 + Math.random() * w * 0.12;
    const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r);
    g.addColorStop(0, "rgba(120,90,40,0.05)");
    g.addColorStop(0.85, "rgba(90,60,20,0.22)");
    g.addColorStop(1, "rgba(90,60,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Mây lành (祥云): ba vòng xoắn nối nhau. */
function cloud(ctx: Ctx, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.09);
  ctx.lineCap = "round";
  for (const [dx, r] of [[-0.55, 0.32], [0, 0.42], [0.55, 0.3]] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y, r * s, Math.PI * 0.9, Math.PI * 2.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + dx * s + r * s * 0.3, y, r * s * 0.45, Math.PI, Math.PI * 2.2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - s * 0.9, y + s * 0.3);
  ctx.quadraticCurveTo(x, y + s * 0.5, x + s * 0.9, y + s * 0.3);
  ctx.stroke();
  ctx.restore();
}

/** Viền hoa văn chữ hồi (回): dải vàng đồng với các móc vuông. */
function fretBand(ctx: Ctx, y: number, w: number, bh: number, trim: string, dark: string): void {
  ctx.fillStyle = trim;
  ctx.fillRect(0, y, w, bh);
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1.5, bh * 0.1);
  const step = bh * 1.1;
  for (let x = 0; x < w; x += step) {
    const m = bh * 0.2;
    ctx.beginPath();
    ctx.moveTo(x + m, y + bh - m);
    ctx.lineTo(x + m, y + m);
    ctx.lineTo(x + step - m, y + m);
    ctx.lineTo(x + step - m, y + bh - m);
    ctx.lineTo(x + step * 0.4, y + bh - m);
    ctx.lineTo(x + step * 0.4, y + bh * 0.45);
    ctx.lineTo(x + step * 0.65, y + bh * 0.45);
    ctx.stroke();
  }
}

/** Chỗ giấy rách: mép xé lởm chởm, bên trong tối với mấy nan tre. */
function tear(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.save();
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = s * (0.55 + Math.random() * 0.45);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7);
  }
  ctx.closePath();
  ctx.fillStyle = "#120d08";
  ctx.fill();
  ctx.strokeStyle = "rgba(235,225,200,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.clip();
  ctx.strokeStyle = "#8a7448";
  ctx.lineWidth = s * 0.12;
  for (const k of [-0.4, 0.15]) {
    ctx.beginPath();
    ctx.moveTo(x - s, y + k * s - s * 0.3);
    ctx.lineTo(x + s, y + k * s + s * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Áo giấy: nền màu, mây lành rải đều, viền chữ hồi ở gấu (dưới) và cổ (trên), ố và một chỗ rách. */
export function robeUrl(kind: DollKind, variant = 0): string {
  return paintedRect(`zhiren-robe:${kind}:${variant}`, 512, 512, (ctx, w, h) => {
    const p = PALETTES[kind];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, p.robe);
    g.addColorStop(1, p.dark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (kind !== "standIn") {
      // Thân áo trải 360° quanh lathe nên chỉ cần ít hoa văn, to.
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          cloud(ctx, (col + (row % 2) * 0.5) * (w / 4) + 30, 120 + row * 110, 40, p.motif);
        }
      }
      fretBand(ctx, h - 58, w, 40, p.trim, p.dark);
      fretBand(ctx, 0, w, 26, p.trim, p.dark);
      // Đường viền nẹp áo chạy dọc.
      ctx.fillStyle = p.trim;
      for (const x of [w * 0.25, w * 0.75]) ctx.fillRect(x - 5, 0, 10, h);
    }
    paperGrain(ctx, w, h, kind === "standIn" ? 4 : 7);
    if (variant % 2 === 1 || kind === "standIn") tear(ctx, w * (0.3 + Math.random() * 0.4), h * (0.35 + Math.random() * 0.3), 22);
  });
}

/** Quần giấy / tay áo: màu trơn với nếp gấp. */
export function plainPaperUrl(color: string, key: string): string {
  return paintedRect(`zhiren-plain:${key}:${color}`, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, 1);
  });
}

/** Giày vải đen đế trắng. */
export function shoeUrl(): string {
  return paintedRect("zhiren-shoe", 64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#151313";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e8e2d4";
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = "#a8322e";
    ctx.fillRect(w * 0.45, h * 0.2, w * 0.1, h * 0.4);
    paperGrain(ctx, w, h, 0);
  });
}

/** Tóc giấy: đen bóng với nét chải. */
export function hairUrl(): string {
  return paintedRect("zhiren-hair", 128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#0b0a0a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(90,90,100,0.35)";
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * w;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + 6, h / 2, x - 3, h);
      ctx.stroke();
    }
  });
}

/** Phướn dẫn hồn (引魂幡): giấy trắng dài, chữ đen viết dọc, tua cắt răng cưa ở đuôi. */
export function bannerUrl(): string {
  return paintedRect("zhiren-banner", 64, 256, (ctx, w, h) => {
    ctx.fillStyle = "#ece7dc";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) glyph(ctx, w * 0.18, 16 + i * 46, w * 0.64, "#151010");
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.globalCompositeOperation = "destination-out";
    for (let x = 0; x < w; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 4, h - 18);
      ctx.lineTo(x + 8, h);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    paperGrain(ctx, w, h, 1);
  });
}

/** Lồng đèn giấy đỏ với chữ "奠" (viếng) giả nét. */
export function lanternUrl(): string {
  return paintedRect("zhiren-lantern", 128, 64, (ctx, w, h) => {
    ctx.fillStyle = "#b0201c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(60,0,0,0.5)";
    for (let x = 0; x < w; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (const x of [w * 0.18, w * 0.68]) glyph(ctx, x - 12, h * 0.2, 26, "#1a0606");
    ctx.fillStyle = "#d6a636";
    ctx.fillRect(0, 0, w, 5);
    ctx.fillRect(0, h - 5, w, 5);
  });
}

/**
 * Mặt trên một ảnh trải quanh khối cầu (equirect 512×256), tâm mặt ở `u` = 0.75 (phía +z của sphere Babylon).
 * Phấn trắng, má hồng tròn, mày lá liễu, môi anh đào; Ngọc Nữ có chấm đỏ giữa trán và tóc mái bằng.
 */
export function dollFaceUrl(kind: DollKind, mode: DollFace): string {
  return paintedRect(`zhiren-face:${kind}:${mode}`, 512, 256, (ctx, w, h) => {
    const cx = w * 0.75;
    const cy = h * 0.52;
    ctx.fillStyle = "#e4dccb";
    ctx.fillRect(0, 0, w, h);
    // Tóc phía sau đầu và đỉnh đầu (phần mặt sau của khối cầu).
    ctx.fillStyle = "#0b0a0a";
    ctx.fillRect(0, 0, w, h * (kind === "girl" ? 0.36 : 0.3));
    ctx.fillRect(0, 0, w * 0.55, h * 0.8);
    if (kind === "girl") {
      // Tóc mái bằng.
      ctx.fillRect(cx - 70, 0, 140, cy - 36);
      ctx.strokeStyle = "rgba(80,80,90,0.5)";
      for (let x = cx - 68; x < cx + 70; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, cy - 70);
        ctx.lineTo(x + 1, cy - 37);
        ctx.stroke();
      }
    }
    if (mode === "blank") {
      paperGrain(ctx, w, h, 2);
      return;
    }
    // Nét vẽ phóng to quanh tâm mặt — trên khối cầu nhỏ, nét mảnh sẽ biến mất.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.3, 1.3);
    ctx.translate(-cx, -cy);
    // Má hồng tròn đậm — dấu hiệu dễ nhận nhất của hình nhân.
    for (const dx of [-38, 38]) {
      const g = ctx.createRadialGradient(cx + dx, cy + 12, 2, cx + dx, cy + 12, 22);
      g.addColorStop(0, "rgba(232,52,78,0.85)");
      g.addColorStop(0.6, "rgba(232,70,90,0.45)");
      g.addColorStop(1, "rgba(232,70,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + 12, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mày lá liễu.
    ctx.strokeStyle = "#141010";
    ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(cx + s * 12, cy - 26 + (mode === "grab" ? 4 : 0));
      ctx.quadraticCurveTo(cx + s * 26, cy - 36, cx + s * 42, cy - 27 - (mode === "grab" ? 6 : 0));
      ctx.stroke();
    }
    // Mắt hạnh nhân.
    for (const s of [-1, 1]) {
      const ex = cx + s * 26;
      const ey = cy - 12;
      ctx.beginPath();
      ctx.moveTo(ex - 13, ey);
      ctx.quadraticCurveTo(ex, ey - 9, ex + 13, ey);
      ctx.quadraticCurveTo(ex, ey + 7, ex - 13, ey);
      ctx.fillStyle = "#fbf8f2";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      if (mode === "dotted" || mode === "grab") {
        const r = mode === "grab" ? 6.5 : 4.2;
        ctx.fillStyle = "#050404";
        ctx.beginPath();
        ctx.arc(ex - s * 1.5, ey - 0.5, r, 0, Math.PI * 2);
        ctx.fill();
        if (mode === "dotted") {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillRect(ex - s * 1.5 + 1, ey - 3, 1.5, 1.5);
        }
      }
      if (mode === "grab") {
        // Mực đỏ chảy từ khóe mắt.
        ctx.strokeStyle = "rgba(150,10,14,0.9)";
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(ex - 4 + i * 7, ey + 4);
          ctx.lineTo(ex - 4 + i * 7 + (Math.random() - 0.5) * 3, ey + 30 + Math.random() * 30);
          ctx.stroke();
        }
        ctx.strokeStyle = "#141010";
      }
    }
    // Mũi: một nét móc nhỏ.
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + 2);
    ctx.quadraticCurveTo(cx + 3, cy + 9, cx - 4, cy + 10);
    ctx.stroke();
    // Miệng.
    if (mode === "grab") {
      ctx.fillStyle = "#0a0404";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 34, 13, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a01020";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Vết rách giấy kéo từ khóe miệng lên má.
      ctx.strokeStyle = "#120808";
      ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 11, cy + 30);
        ctx.lineTo(cx + s * 22, cy + 24);
        ctx.lineTo(cx + s * 34, cy + 18);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#c0122c";
      ctx.beginPath();
      ctx.ellipse(cx - 3.5, cy + 26, 5, 3.4, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 3.5, cy + 26, 5, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy + 29.5, 5.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(40,0,0,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 28);
      ctx.quadraticCurveTo(cx, cy + 30.5, cx + 7, cy + 28);
      ctx.stroke();
    }
    if (kind === "girl") {
      ctx.fillStyle = "#d0102a";
      ctx.beginPath();
      ctx.arc(cx, cy - 32, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    paperGrain(ctx, w, h, 2);
  });
}

/** Mảnh giấy di vật: giấy ố vàng, vài hàng chữ, dấu son đỏ của tiệm Phúc Ký ở góc. */
export function relicPaperUrl(): string {
  return paintedRect("relic-paper", 128, 160, (ctx, w, h) => {
    ctx.fillStyle = "#cdbb8e";
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) glyph(ctx, 10 + col * 22, 12 + row * 19, 16, "rgba(30,20,12,0.75)");
    ctx.fillStyle = "#a3201a";
    ctx.fillRect(w - 38, h - 40, 28, 28);
    ctx.strokeStyle = "#e9d6b0";
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 34, h - 36, 20, 20);
    paperGrain(ctx, w, h, 3);
    // Mép cháy sém.
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    g.addColorStop(0, "rgba(40,20,5,0)");
    g.addColorStop(1, "rgba(40,20,5,0.75)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
