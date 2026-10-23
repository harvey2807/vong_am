import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 } from "../babylon";

/**
 * Bộ dựng đồ vật cho các khu lớn (tiệm Phúc Ký, gác, đất sau vườn). Đồ vật tĩnh được gom theo vật liệu và gộp
 * thành một mesh (`finish`) — hàng trăm khối nhỏ thành vài chục lượt vẽ, máy yếu vẫn chạy được.
 *
 * - `solid`: có va chạm và chặn tầm nhìn/tia tương tác (kệ, thùng, tường thấp).
 * - còn lại: chỉ để nhìn (không va chạm, không chặn tia) — đồ nhỏ, dây treo, giấy vụn.
 * Vật cần cử động hoặc tương tác thì tạo với `keep: true` — không bị gộp.
 * Mọi mesh mang tiền tố `prefix` (vd. "gac" — đèn nhà dưới không chiếu lên gác, xem Game.assignLights).
 */
export interface PropOptions {
  solid?: boolean;
  keep?: boolean;
  rot?: [number, number, number];
}

export class PropKit {
  readonly meshes: Mesh[] = [];
  private readonly batch = new Map<StandardMaterial, { solid: Mesh[]; decor: Mesh[] }>();
  private readonly mats = new Map<string, StandardMaterial>();

  constructor(
    private readonly scene: Scene,
    readonly prefix: string,
  ) {}

  /** Vật liệu màu trơn (dùng lại theo tên). */
  color(name: string, c: Color3, emissive = 0.03): StandardMaterial {
    const key = `${this.prefix}-${name}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    const m = new StandardMaterial(key, this.scene);
    m.diffuseColor = c;
    m.specularColor = Color3.Black();
    m.emissiveColor = c.scale(emissive);
    m.maxSimultaneousLights = 8;
    this.mats.set(key, m);
    return m;
  }

  /** Vật liệu có ảnh (data URL vẽ bằng canvas, hoặc ảnh trong public/). */
  tex(name: string, url: string, opts: { u?: number; v?: number; alpha?: boolean; emissive?: number; tint?: Color3 } = {}): StandardMaterial {
    const key = `${this.prefix}-${name}`;
    const hit = this.mats.get(key);
    if (hit) return hit;
    const m = new StandardMaterial(key, this.scene);
    const t = new Texture(url, this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    t.uScale = opts.u ?? 1;
    t.vScale = opts.v ?? 1;
    t.hasAlpha = !!opts.alpha;
    m.diffuseTexture = t;
    m.useAlphaFromDiffuseTexture = !!opts.alpha;
    m.specularColor = Color3.Black();
    const e = opts.emissive ?? 0.04;
    m.emissiveColor = new Color3(e, e, e);
    if (opts.tint) m.diffuseColor = opts.tint;
    if (opts.alpha) m.backFaceCulling = false;
    m.maxSimultaneousLights = 8;
    this.mats.set(key, m);
    return m;
  }

  private place(m: Mesh, pos: Vector3, mat: StandardMaterial, o: PropOptions): Mesh {
    m.position = pos;
    if (o.rot) m.rotation.set(...o.rot);
    m.material = mat;
    m.checkCollisions = !!o.solid;
    m.isPickable = !!o.solid;
    m.receiveShadows = true;
    if (o.keep) {
      this.meshes.push(m);
      return m;
    }
    let b = this.batch.get(mat);
    if (!b) this.batch.set(mat, (b = { solid: [], decor: [] }));
    (o.solid ? b.solid : b.decor).push(m);
    return m;
  }

  box(name: string, w: number, h: number, d: number, pos: Vector3, mat: StandardMaterial, o: PropOptions = {}): Mesh {
    return this.place(MeshBuilder.CreateBox(`${this.prefix}${name}`, { width: w, height: h, depth: d }, this.scene), pos, mat, o);
  }

  cyl(name: string, dTop: number, dBottom: number, h: number, pos: Vector3, mat: StandardMaterial, o: PropOptions & { sides?: number } = {}): Mesh {
    const m = MeshBuilder.CreateCylinder(`${this.prefix}${name}`, { diameterTop: dTop, diameterBottom: dBottom, height: h, tessellation: o.sides ?? 8 }, this.scene);
    return this.place(m, pos, mat, o);
  }

  sphere(name: string, d: number, pos: Vector3, mat: StandardMaterial, o: PropOptions = {}): Mesh {
    return this.place(MeshBuilder.CreateSphere(`${this.prefix}${name}`, { diameter: d, segments: 6 }, this.scene), pos, mat, o);
  }

  /** Mặt phẳng (mặc định pháp tuyến nhìn về −z, xoay bằng `rot`). */
  plane(name: string, w: number, h: number, pos: Vector3, mat: StandardMaterial, o: PropOptions = {}): Mesh {
    return this.place(MeshBuilder.CreatePlane(`${this.prefix}${name}`, { width: w, height: h }, this.scene), pos, mat, o);
  }

  torus(name: string, d: number, t: number, pos: Vector3, mat: StandardMaterial, o: PropOptions = {}): Mesh {
    return this.place(MeshBuilder.CreateTorus(`${this.prefix}${name}`, { diameter: d, thickness: t, tessellation: 14 }, this.scene), pos, mat, o);
  }

  /** Gộp đồ tĩnh theo vật liệu. Gọi một lần sau khi dựng xong. */
  finish(): void {
    for (const [mat, b] of this.batch) {
      for (const [group, solid] of [[b.solid, true], [b.decor, false]] as const) {
        if (!group.length) continue;
        const merged = group.length === 1 ? group[0] : Mesh.MergeMeshes(group, true, true);
        if (!merged) continue;
        merged.name = `${this.prefix}${mat.name}${solid ? "Solid" : "Decor"}`;
        merged.material = mat;
        merged.checkCollisions = solid;
        merged.isPickable = solid;
        merged.receiveShadows = true;
        this.meshes.push(merged);
      }
    }
    this.batch.clear();
  }
}
