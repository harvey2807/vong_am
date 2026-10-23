/**
 * Cảnh màn hình chính, vẽ bằng Canvas 2D (không dùng ảnh): con hẻm mưa đêm trước một ngôi nhà Việt cũ.
 * Cánh cửa gỗ pano hé một khe, ánh vàng yếu từ bàn thờ bên trong lọt ra, loang xuống mặt đường ướt.
 * Xung quanh lạnh và tối: tường vôi ố rêu, dây điện chằng chịt, bóng đèn vàng chập chờn, biển số nhà xanh.
 *
 * Thỉnh thoảng có "điều gì đó" sau cánh cửa: một cái bóng đi ngang làm tối khe sáng, cánh cửa khẽ rung
 * như có người gõ, hoặc — hiếm — một gương mặt trắng nhìn ra qua khe cửa. Tắt hết khi người dùng chọn
 * giảm chuyển động (prefers-reduced-motion, hoặc "Giảm chớp & rung" trong Cài đặt).
 */
import { comfort } from "../core/Settings";

type Ctx = CanvasRenderingContext2D;

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
}

const AMBER = [214, 152, 78] as const;
/** Ba tiếng gõ: giây bắt đầu của mỗi nhịp rung cửa (âm thanh phát đúng các mốc này). */
const KNOCKS = [0.2, 0.75, 1.3];

export type MenuSceneEvent = "knock" | "shadow" | "face" | "thunder";
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export class MenuBackground {
  private readonly ctx: Ctx;
  /** Giảm chớp & rung (mặc định theo hệ điều hành, đổi được trong Cài đặt): không sét, không sự kiện sau cánh cửa. */
  private get reduceMotion(): boolean {
    return comfort.calm;
  }
  private stat?: HTMLCanvasElement;
  private leaf?: HTMLCanvasElement;
  private grain: CanvasPattern[] = [];
  private drops: Drop[] = [];
  private ripples: Ripple[] = [];
  private raf = 0;
  private readonly start = performance.now();
  private last = 0;
  private w = 0;
  private h = 0;

  // Sự kiện "sau cánh cửa".
  private nextEvent = 6000;
  private event: { kind: "shadow" | "knock" | "face"; t0: number; fired: number } | null = null;
  /** Cảnh báo cho bên ngoài (Hud → âm thanh) mỗi khi có chuyện xảy ra sau cánh cửa. */
  onEvent?: (e: MenuSceneEvent) => void;
  private nextFlash = 22000;
  private flashT = -1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    for (let i = 0; i < 4; i++) {
      const g = document.createElement("canvas");
      g.width = g.height = 192;
      const gc = g.getContext("2d")!;
      const img = gc.createImageData(192, 192);
      for (let p = 0; p < img.data.length; p += 4) {
        const v = Math.random() * 255;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
        img.data[p + 3] = 22;
      }
      gc.putImageData(img, 0, 0);
      this.grain.push(this.ctx.createPattern(g, "repeat")!);
    }
    window.addEventListener("resize", () => this.resize());
    this.resize();
  }

  // ---------------------------------------------------------------- bố cục

  /** Cửa nằm lệch phải; bên trái để trống cho chữ menu. */
  private get door() {
    const { w, h } = this;
    const dh = h * 0.5;
    const dw = Math.min(w * 0.2, dh * 0.62);
    return { x: w * 0.66 - dw / 2, y: h * 0.78 - dh, w: dw, h: dh, ground: h * 0.78 };
  }

  private resize(): void {
    // Độ phân giải bằng nửa màn hình — hợp phong cách PS1 và nhẹ máy.
    this.w = this.canvas.width = Math.ceil(window.innerWidth / 2);
    this.h = this.canvas.height = Math.ceil(window.innerHeight / 2);
    this.paintStatic();
    this.paintLeaf();
    this.drops = Array.from({ length: Math.round(this.w * 0.45) }, () => this.newDrop(true));
  }

  private newDrop(anywhere = false): Drop {
    return {
      x: Math.random() * (this.w + 60) - 30,
      y: anywhere ? Math.random() * this.h : -20 - Math.random() * 40,
      len: 6 + Math.random() * 12,
      speed: 260 + Math.random() * 180,
    };
  }

  /** Tường, mái hiên, dây điện, câu đối, biển số, mặt đường — vẽ một lần mỗi khi đổi kích thước. */
  private paintStatic(): void {
    const c = document.createElement("canvas");
    c.width = this.w;
    c.height = this.h;
    const g = c.getContext("2d")!;
    const { w, h } = this;
    const d = this.door;

    // Trời đêm + tường mặt tiền vôi ố, lạnh.
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#060b0d");
    sky.addColorStop(0.5, "#121b1e");
    sky.addColorStop(1, "#0a0f10");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    const wallTop = d.y - h * 0.14;
    g.fillStyle = "#1e2729";
    g.fillRect(w * 0.3, wallTop, w * 0.7, d.ground - wallTop);
    // Vết ố, rêu, vệt nước chảy.
    for (let i = 0; i < 260; i++) {
      const x = w * 0.3 + Math.random() * w * 0.7;
      const y = wallTop + Math.random() * (d.ground - wallTop);
      g.fillStyle = Math.random() < 0.5 ? "rgba(10,16,14,0.25)" : "rgba(52,64,58,0.18)";
      g.beginPath();
      g.ellipse(x, y, 2 + Math.random() * 14, 2 + Math.random() * 10, Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = w * 0.3 + Math.random() * w * 0.7;
      const len = (d.ground - wallTop) * (0.2 + Math.random() * 0.6);
      const grad = g.createLinearGradient(0, wallTop, 0, wallTop + len);
      grad.addColorStop(0, "rgba(8,12,10,0.45)");
      grad.addColorStop(1, "rgba(8,12,10,0)");
      g.fillStyle = grad;
      g.fillRect(x, wallTop, 1 + Math.random() * 3, len);
    }
    // Chân tường rêu xanh.
    const moss = g.createLinearGradient(0, d.ground - h * 0.08, 0, d.ground);
    moss.addColorStop(0, "rgba(40,58,36,0)");
    moss.addColorStop(1, "rgba(40,58,36,0.55)");
    g.fillStyle = moss;
    g.fillRect(w * 0.3, d.ground - h * 0.08, w * 0.7, h * 0.08);

    // Khung cửa gỗ dày + bậc cửa.
    g.fillStyle = "#140b06";
    g.fillRect(d.x - d.w * 0.09, d.y - d.w * 0.12, d.w * 1.18, d.h + d.w * 0.12);
    g.fillStyle = "#2a2622";
    g.fillRect(d.x - d.w * 0.2, d.ground, d.w * 1.4, h * 0.018);

    // Mái hiên ngói ta nhô ra, gờ nhỏ giọt.
    const roofY = wallTop + h * 0.02;
    g.fillStyle = "#1a0f0b";
    g.beginPath();
    g.moveTo(w * 0.3, roofY);
    g.lineTo(w, roofY - h * 0.01);
    g.lineTo(w, roofY + h * 0.035);
    g.lineTo(w * 0.3, roofY + h * 0.045);
    g.closePath();
    g.fill();
    for (let x = w * 0.3; x < w; x += 7) {
      g.fillStyle = Math.random() < 0.5 ? "#2a1710" : "#22130d";
      g.beginPath();
      g.arc(x, roofY + h * 0.042, 4, 0, Math.PI);
      g.fill();
    }

    // Câu đối đỏ đã bạc màu hai bên cửa.
    for (const side of [-1, 1]) {
      const x = side < 0 ? d.x - d.w * 0.27 : d.x + d.w * 1.13;
      g.fillStyle = "#3a0d0a";
      g.fillRect(x, d.y + d.h * 0.06, d.w * 0.13, d.h * 0.7);
      g.fillStyle = "rgba(150,110,50,0.35)";
      for (let i = 0; i < 6; i++) g.fillRect(x + d.w * 0.035, d.y + d.h * (0.11 + i * 0.11), d.w * 0.06, d.h * 0.05);
    }

    // Biển số nhà xanh kiểu Hà Nội: "Ngõ 4" (bốn — tứ — tử).
    const px = d.x - d.w * 0.32;
    const py = d.y - d.w * 0.05;
    g.fillStyle = "#1d3a5c";
    g.fillRect(px, py, d.w * 0.22, d.w * 0.14);
    g.strokeStyle = "rgba(200,210,220,0.5)";
    g.strokeRect(px + 1.5, py + 1.5, d.w * 0.22 - 3, d.w * 0.14 - 3);
    g.fillStyle = "rgba(220,225,230,0.75)";
    g.font = `bold ${Math.max(6, d.w * 0.075)}px 'Be Vietnam Pro', sans-serif`;
    g.textAlign = "center";
    g.fillText("NGÕ 4", px + d.w * 0.11, py + d.w * 0.095);

    // Dây điện chằng chịt vắt ngang hẻm.
    g.strokeStyle = "rgba(4,6,6,0.9)";
    for (let i = 0; i < 7; i++) {
      g.lineWidth = 1 + Math.random() * 1.4;
      const y0 = h * (0.05 + Math.random() * 0.18);
      const y1 = h * (0.05 + Math.random() * 0.18);
      g.beginPath();
      g.moveTo(-10, y0);
      g.quadraticCurveTo(w * (0.3 + Math.random() * 0.4), Math.max(y0, y1) + h * (0.04 + Math.random() * 0.1), w + 10, y1);
      g.stroke();
    }

    // Mặt đường xi măng ướt.
    const road = g.createLinearGradient(0, d.ground, 0, h);
    road.addColorStop(0, "#14191a");
    road.addColorStop(1, "#070909");
    g.fillStyle = road;
    g.fillRect(0, d.ground + h * 0.018, w, h);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = "rgba(30,40,44,0.45)";
      g.beginPath();
      g.ellipse(Math.random() * w, d.ground + h * (0.05 + Math.random() * 0.17), 20 + Math.random() * 60, 3 + Math.random() * 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    this.stat = c;
  }

  /** Một cánh cửa gỗ pano: ba ô, đinh tán, vân gỗ, lá bùa vàng. */
  private paintLeaf(): void {
    const d = this.door;
    const lw = Math.max(8, Math.ceil(d.w / 2));
    const lh = Math.max(16, Math.ceil(d.h));
    const c = document.createElement("canvas");
    c.width = lw;
    c.height = lh;
    const g = c.getContext("2d")!;
    g.fillStyle = "#2c1a0e";
    g.fillRect(0, 0, lw, lh);
    for (let i = 0; i < lw; i += 2) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? "12,6,2" : "70,44,24"},${0.15 + Math.random() * 0.2})`;
      g.fillRect(i, 0, 1, lh);
    }
    g.strokeStyle = "rgba(8,4,2,0.8)";
    g.lineWidth = Math.max(1, lw * 0.04);
    for (const [y0, y1] of [[0.06, 0.34], [0.4, 0.68], [0.74, 0.94]]) g.strokeRect(lw * 0.14, lh * y0, lw * 0.72, lh * (y1 - y0));
    g.fillStyle = "rgba(160,130,80,0.4)";
    for (const y of [0.2, 0.55, 0.85]) {
      g.beginPath();
      g.arc(lw * 0.88, lh * y, Math.max(0.8, lw * 0.025), 0, Math.PI * 2);
      g.fill();
    }
    // Lá bùa vàng chữ đỏ, dán lệch.
    g.save();
    g.translate(lw * 0.5, lh * 0.2);
    g.rotate(-0.06);
    g.fillStyle = "rgba(170,140,60,0.75)";
    g.fillRect(-lw * 0.12, -lh * 0.09, lw * 0.24, lh * 0.18);
    g.fillStyle = "rgba(120,20,15,0.8)";
    for (let i = 0; i < 4; i++) g.fillRect(-lw * 0.05, -lh * 0.07 + i * lh * 0.04, lw * 0.1, lh * 0.015);
    g.restore();
    this.leaf = c;
  }

  // ---------------------------------------------------------------- vòng lặp

  run(): void {
    if (this.raf) return;
    const loop = (now: number) => {
      // Timestamp của requestAnimationFrame có thể sớm hơn lúc khởi tạo → không để thời gian âm.
      const t = Math.max(0, now - this.start);
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.draw(t, dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private draw(t: number, dt: number): void {
    const { ctx, w, h } = this;
    const d = this.door;
    ctx.drawImage(this.stat!, 0, 0);

    if (!this.reduceMotion && !this.event && t > this.nextEvent) {
      const r = Math.random();
      this.event = { kind: r < 0.5 ? "shadow" : r < 0.85 ? "knock" : "face", t0: t, fired: 0 };
      if (this.event.kind === "shadow") this.onEvent?.("shadow");
      this.nextEvent = t + 9000 + Math.random() * 9000;
    }
    const ev = this.event;
    const evT = ev ? (t - ev.t0) / 1000 : 0;
    if (ev && evT > 3.2) this.event = null;

    // Khe cửa hé: rộng ra rất chậm rồi khép lại.
    const gap = d.w * (0.035 + 0.02 * Math.sin(t / 5200) ** 2);
    // Ánh sáng bên trong: nến bàn thờ chập chờn; bóng đi ngang làm tối hẳn trong giây lát.
    let glow = 0.75 + Math.sin(t / 140) * 0.05 + Math.sin(t / 53) * 0.04;
    if (ev?.kind === "shadow") glow *= 1 - 0.85 * Math.max(0, Math.sin(Math.min(1, evT / 1.6) * Math.PI));
    let shake = 0;
    if (ev?.kind === "knock") {
      KNOCKS.forEach((k, i) => {
        const dtK = evT - k;
        if (dtK >= 0 && i >= ev.fired) {
          ev.fired = i + 1;
          this.onEvent?.("knock");
        }
        if (dtK >= 0 && dtK < 0.22) shake += Math.sin(dtK * 90) * (1 - dtK / 0.22) * 1.6;
      });
    }
    if (ev?.kind === "face" && evT > 0.4 && ev.fired === 0) {
      ev.fired = 1;
      this.onEvent?.("face");
    }

    // Ánh vàng loang ra mặt đường ướt và phản chiếu vệt dài.
    const cx = d.x + d.w / 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const spill = ctx.createRadialGradient(cx, d.ground, 0, cx, d.ground, d.w * 1.6);
    spill.addColorStop(0, rgba(AMBER, 0.32 * glow));
    spill.addColorStop(1, rgba(AMBER, 0));
    ctx.fillStyle = spill;
    ctx.fillRect(cx - d.w * 1.6, d.ground - d.h * 0.4, d.w * 3.2, h);
    const refl = ctx.createLinearGradient(0, d.ground, 0, h);
    refl.addColorStop(0, rgba(AMBER, 0.35 * glow));
    refl.addColorStop(1, rgba(AMBER, 0));
    ctx.fillStyle = refl;
    for (let i = 0; i < 4; i++) {
      const wob = Math.sin(t / 300 + i) * 1.5;
      ctx.fillRect(cx - gap / 2 + wob + (i - 1.5) * 2, d.ground + h * 0.02, gap * 0.6, h * 0.22);
    }
    // Quầng sáng quanh khe cửa.
    const halo = ctx.createRadialGradient(cx, d.y + d.h * 0.55, 0, cx, d.y + d.h * 0.55, d.h * 0.7);
    halo.addColorStop(0, rgba(AMBER, 0.18 * glow));
    halo.addColorStop(1, rgba(AMBER, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(d.x - d.w, d.y - d.h * 0.2, d.w * 3, d.h * 1.4);
    ctx.restore();

    // Bên trong khe cửa: ánh vàng + (hiếm) một gương mặt trắng nhìn ra.
    const inner = ctx.createLinearGradient(0, d.y, 0, d.ground);
    inner.addColorStop(0, rgba([120, 70, 30], glow * 0.8));
    inner.addColorStop(1, rgba(AMBER, glow));
    ctx.fillStyle = inner;
    ctx.fillRect(cx - gap / 2, d.y, gap, d.h);
    if (ev?.kind === "face" && evT > 0.4 && evT < 1.6) {
      const a = Math.min(1, (evT - 0.4) * 4) * Math.min(1, (1.6 - evT) * 4);
      const fy = d.y + d.h * 0.32;
      ctx.fillStyle = `rgba(214,206,190,${0.85 * a})`;
      ctx.beginPath();
      ctx.ellipse(cx, fy, gap * 0.42, gap * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(5,3,3,${a})`;
      ctx.beginPath();
      ctx.ellipse(cx, fy - gap * 0.06, gap * 0.1, gap * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hai cánh cửa (cánh phải rung khi có tiếng gõ).
    const leaf = this.leaf!;
    const lw = d.w / 2;
    ctx.drawImage(leaf, d.x - gap / 2 + 0, d.y, lw, d.h);
    ctx.save();
    ctx.translate(shake, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(leaf, -(d.x + d.w + gap / 2), d.y, lw, d.h);
    ctx.restore();
    // Khe sáng dưới chân cửa.
    ctx.fillStyle = rgba(AMBER, 0.55 * glow);
    ctx.fillRect(d.x, d.ground - 1.5, d.w, 1.5);

    // Bóng đèn sợi đốt treo trên dây, chập chờn; quầng vàng yếu.
    const lampX = d.x - d.w * 0.55;
    const lampY = d.y - d.h * 0.18;
    const lamp = (Math.random() < 0.012 ? 0.15 : 1) * (0.8 + Math.sin(t / 90) * 0.06);
    ctx.strokeStyle = "rgba(3,4,4,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lampX, 0);
    ctx.lineTo(lampX, lampY - 3);
    ctx.stroke();
    const lg = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, h * 0.32);
    lg.addColorStop(0, rgba([230, 170, 90], 0.38 * lamp));
    lg.addColorStop(0.15, rgba([200, 130, 60], 0.12 * lamp));
    lg.addColorStop(1, rgba([200, 130, 60], 0));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = lg;
    ctx.fillRect(lampX - h * 0.32, lampY - h * 0.32, h * 0.64, h * 0.64);
    ctx.restore();
    ctx.fillStyle = rgba([255, 220, 160], 0.9 * lamp);
    ctx.beginPath();
    ctx.arc(lampX, lampY, Math.max(1.5, h * 0.006), 0, Math.PI * 2);
    ctx.fill();

    // Mưa: vệt xiên, bắn tung trên mặt đường, gợn trong vũng nước.
    ctx.strokeStyle = "rgba(150,170,180,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of this.drops) {
      r.y += r.speed * dt;
      r.x -= r.speed * dt * 0.12;
      if (r.y > h) {
        if (r.y > d.ground && Math.random() < 0.25 && this.ripples.length < 40) this.ripples.push({ x: r.x, y: d.ground + Math.random() * (h - d.ground), r: 0 });
        Object.assign(r, this.newDrop());
      }
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.len * 0.12, r.y - r.len);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(160,175,185,0.22)";
    this.ripples = this.ripples.filter((p) => {
      p.r += dt * 14;
      ctx.globalAlpha = Math.max(0, 1 - p.r / 7);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      return p.r < 7;
    });
    ctx.globalAlpha = 1;

    // Chớp xa, rất hiếm và dịu (không chớp nháy liên tục).
    if (!this.reduceMotion && t > this.nextFlash) {
      this.flashT = t;
      this.nextFlash = t + 25000 + Math.random() * 20000;
      this.onEvent?.("thunder");
    }
    if (this.flashT >= 0 && t - this.flashT < 900) {
      const k = 1 - (t - this.flashT) / 900;
      ctx.fillStyle = `rgba(140,165,190,${0.12 * k})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Bóng tối phủ bên trái (chỗ đặt chữ) + vignette + hạt phim.
    const left = ctx.createLinearGradient(0, 0, w * 0.55, 0);
    left.addColorStop(0, "rgba(3,5,5,0.94)");
    left.addColorStop(1, "rgba(3,5,5,0)");
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(cx, h * 0.55, h * 0.2, cx, h * 0.55, Math.max(w, h) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = this.grain[Math.floor(t / 70) % this.grain.length];
    ctx.fillRect(0, 0, w, h);
  }
}
