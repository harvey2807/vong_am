/**
 * Texture vẽ bằng Canvas 2D: đủ cho phong cách low-poly/PS1 và không cần file asset.
 * Khi có texture thật, chỉ cần đổi URL trả về ở đây.
 */

import { loadImage, paintFace, SPRITES, type FaceMode } from "./sprites";

export type Ctx = CanvasRenderingContext2D;

const cache = new Map<string, string>();

export function painted(key: string, size: number, draw: (ctx: Ctx, size: number) => void): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const url = c.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

export function speckle(ctx: Ctx, w: number, h: number, count: number, color: string, maxR: number): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * maxR + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Gạch bông kiểu cũ: hoa văn đối xứng bốn phía, bạc màu và bám bẩn. */
export function tileUrl(): string {
  return painted("tile", 256, (ctx, s) => {
    const t = s / 2;
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const x = tx * t;
        const y = ty * t;
        ctx.fillStyle = "#cfc2a4";
        ctx.fillRect(x, y, t, t);
        ctx.fillStyle = "#8e4430";
        for (const [cx, cy] of [[x, y], [x + t, y], [x, y + t], [x + t, y + t]]) {
          ctx.beginPath();
          ctx.arc(cx, cy, t * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#3d6560";
        ctx.beginPath();
        ctx.moveTo(x + t / 2, y + t * 0.14);
        ctx.lineTo(x + t * 0.86, y + t / 2);
        ctx.lineTo(x + t / 2, y + t * 0.86);
        ctx.lineTo(x + t * 0.14, y + t / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#cfc2a4";
        ctx.beginPath();
        ctx.arc(x + t / 2, y + t / 2, t * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8e4430";
        ctx.beginPath();
        ctx.arc(x + t / 2, y + t / 2, t * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(40,30,20,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, t - 2, t - 2);
      }
    }
    speckle(ctx, s, s, 700, "rgba(40,30,15,0.08)", 8);
  });
}

// ---------------------------------------------------------------- ảnh thờ

interface Figure {
  x: number;
  y: number;
  scale: number;
}

/**
 * Chân dung thật (cắt từ ảnh concept, xem README) cho ảnh thờ và ảnh gia đình.
 * `faceY`: tâm mặt theo chiều cao ảnh; `cropH`: phần trên dùng được (bên dưới lẫn đồ vật khác trong concept).
 */
export const PORTRAITS = {
  ong: { url: "textures/sprites/portrait_ong.png", faceY: 0.4, cropH: 0.62 },
  ba: { url: "textures/sprites/portrait_ba.png", faceY: 0.4, cropH: 0.66 },
  me: { url: "textures/sprites/portrait_me.png", faceY: 0.42, cropH: 1 },
  chu: { url: "textures/sprites/portrait_chu.png", faceY: 0.33, cropH: 0.8 },
};
type PortraitKey = keyof typeof PORTRAITS;
const portraitImages = new Map<PortraitKey, HTMLImageElement>();

/** Xong khi mọi chân dung đã tải — nơi nào vẽ ảnh lúc khởi động thì vẽ lại sau mốc này. */
export const portraitsReady: Promise<void> = Promise.all(
  (Object.keys(PORTRAITS) as PortraitKey[]).map((k) => loadImage(PORTRAITS[k].url).then((img) => void portraitImages.set(k, img))),
).then(
  () => undefined,
  () => undefined,
);

/** Vẽ đầu + vai một chân dung, tâm mặt tại (x, y), mặt rộng ~2r, lọc ảnh cũ ngả nâu, viền mờ hòa vào nền. */
function drawPortraitHead(ctx: Ctx, key: PortraitKey, x: number, y: number, r: number, mode: FaceMode, blur = 0): boolean {
  const img = portraitImages.get(key);
  if (!img) return false;
  const p = PORTRAITS[key];
  const s = (r * 2) / (img.width * 0.42);
  const dw = img.width * s;
  const dh = img.height * p.cropH * s;
  // Vẽ ra canvas phụ rồi khoét viền mềm (destination-in) — không còn mép ô van sắc cạnh.
  const c = document.createElement("canvas");
  c.width = Math.ceil(dw);
  c.height = Math.ceil(dh);
  const o = c.getContext("2d")!;
  o.filter = `grayscale(1) sepia(0.5) contrast(1.15) brightness(0.92)${blur ? ` blur(${blur}px)` : ""}`;
  o.drawImage(img, 0, 0, img.width, img.height * p.cropH, 0, 0, dw, dh);
  o.filter = "none";
  const fy = img.height * p.faceY * s;
  paintFace(o, dw / 2, fy, r * 1.8, r * 2.1, mode);
  o.globalCompositeOperation = "destination-in";
  o.translate(dw / 2, fy + r * 0.6);
  o.scale(1, 1.45);
  const m = o.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.45);
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  o.fillStyle = m;
  o.fillRect(-dw, -dh, dw * 2, dh * 2);
  ctx.drawImage(c, x - dw / 2, y - fy);
  return true;
}

/** Thứ tự chân dung cho bốn người trong FAMILY; người lạ thứ năm mang mặt chú (Út lúc lớn?) với hốc mắt rỗng. */
const FAMILY_FACES: PortraitKey[] = ["ong", "ba", "me", "chu"];

const FAMILY: Figure[] = [
  { x: 0.22, y: 0.42, scale: 1 }, // ông
  { x: 0.41, y: 0.45, scale: 0.94 }, // bà
  { x: 0.62, y: 0.42, scale: 1 }, // mẹ
  { x: 0.8, y: 0.6, scale: 0.62 }, // Út hồi sáu tuổi
];

/**
 * variant 4: ảnh gia đình bốn người.
 * variant 5: thêm người thứ năm đứng phía sau — mặt giống nhân vật chính lúc trưởng thành.
 * variant 6: bốn người quay lưng lại, người thứ năm bước lên trước, nhìn thẳng ra ngoài.
 * variant 7: đủ năm người nhưng không ai còn mặt — Đêm 3.
 */
export function drawPhoto(ctx: Ctx, w: number, h: number, variant: number): void {
  ctx.save();
  const bg = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, h * 0.85);
  bg.addColorStop(0, variant >= 6 ? "#9c8462" : "#b39a74");
  bg.addColorStop(1, "#3e3020");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(40,28,18,0.3)";
  ctx.fillRect(0, h * 0.78, w, h * 0.22);

  if (variant === 5 || variant === 7) drawFigure(ctx, w, h, { x: 0.51, y: 0.3, scale: 0.92 }, variant === 7 ? "blank" : "stranger");
  FAMILY.forEach((f, i) => drawFigure(ctx, w, h, f, variant === 7 ? "blank" : variant >= 6 ? "back" : "face", FAMILY_FACES[i]));
  if (variant === 6) drawFigure(ctx, w, h, { x: 0.5, y: 0.4, scale: 1.45 }, "stranger");

  // Hạt, vết xước, viền giấy ảnh cũ.
  speckle(ctx, w, h, 1400, "rgba(30,20,10,0.12)", 1.2);
  speckle(ctx, w, h, 300, "rgba(240,225,200,0.12)", 1);
  ctx.strokeStyle = "rgba(235,225,205,0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.random() * 20 - 10, h);
    ctx.stroke();
  }
  ctx.strokeStyle = "#d8cbb0";
  ctx.lineWidth = Math.max(6, w * 0.03);
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

function drawFigure(ctx: Ctx, w: number, h: number, f: Figure, kind: "face" | "back" | "stranger" | "blank", portrait: PortraitKey = "chu"): void {
  const x = f.x * w;
  const y = f.y * h;
  const r = 0.07 * h * f.scale;
  const bodyW = 0.22 * h * f.scale;

  ctx.save();
  if (kind === "stranger") ctx.filter = "blur(1.2px)";

  ctx.fillStyle = kind === "stranger" ? "#1a1410" : "#2b2118";
  ctx.beginPath();
  ctx.moveTo(x - bodyW / 2, h);
  ctx.lineTo(x - bodyW * 0.42, y + r * 1.35);
  ctx.quadraticCurveTo(x, y + r * 0.7, x + bodyW * 0.42, y + r * 1.35);
  ctx.lineTo(x + bodyW / 2, h);
  ctx.closePath();
  ctx.fill();

  // Có ảnh thật thì dán mặt người thật; người lạ thì mờ nhòe và mắt là hai hốc đen.
  if (kind !== "back") {
    const mode: FaceMode = kind === "stranger" ? "rage" : kind === "blank" ? "blank" : "normal";
    if (drawPortraitHead(ctx, portrait, x, y, r, mode, kind === "stranger" ? Math.max(1, r * 0.06) : 0)) {
      ctx.restore();
      return;
    }
  }

  ctx.fillStyle = kind === "back" ? "#1c1510" : kind === "stranger" || kind === "blank" ? "#ddd4c4" : "#c4a982";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind !== "back") {
    ctx.fillStyle = "#1c1510";
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.55, r * 0.88, r * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  if (kind === "face") {
    ctx.fillStyle = "rgba(30,20,12,0.8)";
    for (const dx of [-0.32, 0.32]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y - r * 0.05, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(x - r * 0.22, y + r * 0.42, r * 0.44, Math.max(1, r * 0.06));
  } else if (kind === "stranger") {
    ctx.fillStyle = "#050302";
    for (const dx of [-0.33, 0.33]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * r, y - r * 0.02, r * 0.17, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Di ảnh trên bàn thờ: ảnh chân dung đen trắng ngả vàng, viền giấy, góc mốc; `scraped` = mặt bị cạo trắng
 * và cào xước (Đêm 3+). Trả về false nếu ảnh chưa tải xong.
 */
export function drawAltarPortrait(ctx: Ctx, w: number, h: number, key: PortraitKey, scraped: boolean): boolean {
  const img = portraitImages.get(key);
  if (!img) return false;
  const p = PORTRAITS[key];
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(0, 0, w, h);
  const m = w * 0.08;
  ctx.fillStyle = "#cfc4ae";
  ctx.fillRect(m * 0.5, m * 0.5, w - m, h - m);
  ctx.save();
  ctx.filter = "grayscale(1) sepia(0.6) contrast(1.2) brightness(0.9)";
  ctx.drawImage(img, 0, 0, img.width, img.height * p.cropH, m, m, w - 2 * m, h - 2 * m);
  ctx.restore();
  // Ố vàng ở mép, tối dần vào góc.
  const vg = ctx.createRadialGradient(w / 2, h * 0.42, w * 0.2, w / 2, h / 2, h * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(40,25,10,0.65)");
  ctx.fillStyle = vg;
  ctx.fillRect(m, m, w - 2 * m, h - 2 * m);
  speckle(ctx, w, h, 220, "rgba(30,20,10,0.18)", 1.4);
  speckle(ctx, w, h, 60, "rgba(240,230,210,0.2)", 1);
  const fx = w / 2;
  const fy = m + (h - 2 * m) * (p.faceY / p.cropH);
  const fw = (w - 2 * m) * 0.5;
  if (scraped) {
    paintFace(ctx, fx, fy, fw, fw * 1.25, "blank");
    ctx.strokeStyle = "rgba(70,18,12,0.7)";
    ctx.lineWidth = Math.max(1, w * 0.012);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(fx - fw * 0.45 + i * fw * 0.14, fy - fw * 0.6);
      ctx.lineTo(fx - fw * 0.5 + i * fw * 0.15 + (Math.random() - 0.5) * 4, fy + fw * 0.7);
      ctx.stroke();
    }
  }
  return true;
}

/** Mặt Người Gõ Cửa: trắng bệch, hốc mắt đen sâu, miệng hé — nhìn xa giống mặt người, nhìn gần thì không. */
export function drawEntityFace(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.45, w * 0.05, w / 2, h * 0.5, w * 0.5);
  g.addColorStop(0, "#e4ddd0");
  g.addColorStop(0.7, "#9c958a");
  g.addColorStop(1, "#1a1816");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.52, w * 0.36, h * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hốc mắt hẹp, xệ xuống, vệt đen chảy dài như nước mắt khô; miệng há dọc quá dài.
  ctx.fillStyle = "#050404";
  ctx.strokeStyle = "rgba(10,8,8,0.7)";
  ctx.lineWidth = Math.max(1, w * 0.025);
  for (const dx of [-0.17, 0.17]) {
    const x = w * (0.5 + dx);
    ctx.beginPath();
    ctx.ellipse(x, h * 0.42, w * 0.07, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, h * 0.44);
    ctx.lineTo(x + dx * w * 0.05, h * 0.62);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.75, w * 0.045, h * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tóc rủ che hai bên mặt.
  ctx.fillStyle = "#070605";
  ctx.fillRect(0, 0, w, h * 0.14);
  ctx.fillRect(0, 0, w * 0.17, h);
  ctx.fillRect(w * 0.83, 0, w * 0.17, h);
}

/** Mặt Út — gương mặt bình thường, hơi trắng bệch. Thứ đứng ngoài cửa đêm cuối mang mặt này. */
export function drawHumanFace(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#c9b8a2";
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.54, w * 0.36, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#14110e";
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.2, w * 0.4, h * 0.16, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(w * 0.12, h * 0.16, w * 0.76, h * 0.1);
  for (const dx of [-0.15, 0.15]) {
    ctx.fillStyle = "#2a211a";
    ctx.fillRect(w * (0.5 + dx) - 7, h * 0.4, 14, 2);
    ctx.fillStyle = "#1a1410";
    ctx.beginPath();
    ctx.arc(w * (0.5 + dx), h * 0.46, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(90,60,45,0.6)";
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.5);
  ctx.lineTo(w / 2 - 2, h * 0.62);
  ctx.stroke();
  ctx.strokeStyle = "#6a3a32";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, h * 0.73);
  ctx.quadraticCurveTo(w / 2, h * 0.76, w * 0.6, h * 0.73);
  ctx.stroke();
}
