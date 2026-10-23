import { Color3, DynamicTexture, Material, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, TransformNode } from "@babylonjs/core";

/**
 * Sprite nhân vật cắt từ ảnh concept (đã tách nền bằng rembg — xem README): con ma.
 * Hiển thị bằng một mặt phẳng luôn quay về camera theo trục đứng (billboard Y) — kỹ thuật của game kinh dị
 * thời PS1, và hợp với hình nhân "lúc nào cũng nhìn mình". Các biến thể mặt được vẽ đè lên chính ảnh gốc.
 */
export type FaceMode = "normal" | "blank" | "grab" | "rage";

export interface SpriteDef {
  url: string;
  /** Kích thước ảnh (px). */
  w: number;
  h: number;
  /** Khuôn mặt trong ảnh: tâm x, tâm y, rộng, cao — tỉ lệ 0..1. */
  face: [number, number, number, number];
}

export const SPRITES = {
  ghost: { url: "textures/sprites/ghost.png", w: 238, h: 666, face: [0.708, 0.177, 0.2, 0.085] },
  effigyBoy: { url: "textures/sprites/effigy_boy.png", w: 166, h: 271, face: [0.29, 0.095, 0.22, 0.15] },
  effigyGirl: { url: "textures/sprites/effigy_girl.png", w: 133, h: 244, face: [0.62, 0.14, 0.28, 0.18] },
} satisfies Record<string, SpriteDef>;

const images = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = images.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

/** Một đốm tối loang mềm (hốc mắt, miệng) — gradient thay vì hình tròn đặc, để lẫn vào ảnh thật. */
function hollow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(2,1,1,${alpha})`);
  g.addColorStop(0.55, `rgba(8,4,3,${alpha * 0.85})`);
  g.addColorStop(1, "rgba(10,5,4,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Vẽ đè lên vùng mặt (cx, cy, fw, fh tính bằng px).
 * blank: mặt bị xóa trắng như giấy dán, còn lấm tấm · rage: giữ nguyên mặt, mắt thành hốc đen chảy xuống ·
 * grab: như rage nhưng miệng há dài xuống cằm.
 */
export function paintFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, fw: number, fh: number, mode: FaceMode): void {
  if (mode === "normal") return;
  ctx.save();
  if (mode === "blank") {
    const g = ctx.createRadialGradient(cx, cy, fw * 0.1, cx, cy, fw * 0.55);
    g.addColorStop(0, "rgba(226,219,204,0.97)");
    g.addColorStop(0.7, "rgba(210,201,184,0.9)");
    g.addColorStop(1, "rgba(200,190,170,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, fw * 0.5, fh * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lấm tấm như giấy bản, và một vệt mờ chỗ mắt cũ — xóa chưa sạch.
    ctx.fillStyle = "rgba(90,80,65,0.25)";
    for (let i = 0; i < fw * 0.8; i++) ctx.fillRect(cx + (Math.random() - 0.5) * fw * 0.8, cy + (Math.random() - 0.5) * fh * 0.8, 1, 1);
    for (const dx of [-0.2, 0.2]) hollow(ctx, cx + dx * fw, cy - fh * 0.08, fw * 0.1, fh * 0.06, 0.12);
  } else {
    const eyeY = cy - fh * 0.2;
    for (const dx of [-0.2, 0.2]) {
      const x = cx + dx * fw;
      hollow(ctx, x, eyeY, fw * 0.17, fh * 0.14, 1);
      // Vệt đen chảy từ hốc mắt xuống má.
      const tear = ctx.createLinearGradient(0, eyeY, 0, eyeY + fh * 0.45);
      tear.addColorStop(0, "rgba(15,4,3,0.75)");
      tear.addColorStop(1, "rgba(15,4,3,0)");
      ctx.fillStyle = tear;
      ctx.fillRect(x - fw * 0.02, eyeY, fw * 0.035, fh * (0.3 + Math.random() * 0.15));
    }
    if (mode === "grab") hollow(ctx, cx, cy + fh * 0.22, fw * 0.12, fh * 0.2, 0.9);
    else hollow(ctx, cx, cy + fh * 0.2, fw * 0.08, fh * 0.05, 0.6);
  }
  ctx.restore();
}

export class Sprite {
  /** Nút billboard (luôn quay về camera theo trục đứng); `mesh` là con của nó nên vẫn nghiêng/giật được. */
  readonly pivot: TransformNode;
  readonly mesh: Mesh;
  readonly mat: StandardMaterial;
  private readonly tex: DynamicTexture;
  private img?: HTMLImageElement;
  private mode: FaceMode = "normal";

  constructor(
    scene: Scene,
    name: string,
    private readonly def: SpriteDef,
    /** Chiều cao hiển thị (mét). */
    readonly height: number,
    parent?: TransformNode,
  ) {
    const width = (height * def.w) / def.h;
    this.pivot = new TransformNode(`${name}Pivot`, scene);
    if (parent) this.pivot.parent = parent;
    this.pivot.billboardMode = TransformNode.BILLBOARDMODE_Y;
    this.mesh = MeshBuilder.CreatePlane(name, { width, height }, scene);
    // Dời ảnh sao cho khuôn mặt nằm đúng trục đứng của gốc — billboard xoay quanh mặt, jumpscare áp mặt vào giữa màn hình.
    // Gốc của mặt phẳng đặt ở chân để nghiêng người thì xoay quanh bàn chân.
    this.mesh.bakeTransformIntoVertices(Matrix.Translation(-(def.face[0] - 0.5) * width, height / 2, 0));
    this.mesh.parent = this.pivot;
    this.mesh.isPickable = false;
    this.tex = new DynamicTexture(`${name}-tex`, { width: def.w, height: def.h }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    this.tex.hasAlpha = true;
    this.mat = new StandardMaterial(`${name}-mat`, scene);
    this.mat.diffuseTexture = this.tex;
    this.mat.useAlphaFromDiffuseTexture = true;
    this.mat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
    this.mat.alphaCutOff = 0.25;
    this.mat.backFaceCulling = false;
    this.mat.specularColor = Color3.Black();
    // Một chút tự phát sáng để bóng dáng vẫn lờ mờ trong tối; đèn pin chiếu vào mới rõ.
    this.mat.emissiveColor = new Color3(0.07, 0.07, 0.07);
    this.mesh.material = this.mat;
    void loadImage(def.url).then((img) => {
      this.img = img;
      this.redraw();
    });
  }

  /** Độ cao (m, tính từ chân) của tâm khuôn mặt — để jumpscare đặt mặt ngang tầm mắt. */
  get faceHeight(): number {
    return this.height * (1 - this.def.face[1]);
  }

  setFace(mode: FaceMode): void {
    this.mode = mode;
    this.redraw();
  }

  private redraw(): void {
    if (!this.img) return;
    const { w, h, face } = this.def;
    const ctx = this.tex.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.img, 0, 0, w, h);
    paintFace(ctx, face[0] * w, face[1] * h, face[2] * w, face[3] * h, this.mode);
    this.tex.update();
  }
}
