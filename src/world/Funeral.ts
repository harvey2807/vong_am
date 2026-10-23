import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "../babylon";
import { buildPaperDoll } from "../entity/Effigy";
import { ashUrl, charcoalUrl, clothUrl, cobwebUrl, jossPaperUrl } from "./decorTextures";
import { drawAltarPortrait, portraitsReady, PORTRAITS } from "./textures";

/** Vị trí hình nhân đứng chầu hai bên bàn thờ (x, z, hướng nhìn độ). Đêm 3 dùng lại làm điểm xuất phát. */
export const ALTAR_EFFIGIES: [number, number, number][] = [
  [-6.3, 0.75, 70],
  [-6.3, 5.3, 110],
];

/**
 * Bàn thờ tang và mọi thứ quanh nó: di ảnh bà, lư hương, hạc đứng lưng rùa, nến đỏ chảy, cơm cúng cắm đũa,
 * mâm ngũ quả đã thối, bình cúc trắng héo, vàng mã vương vãi, thau tro, mạng nhện, hình nhân giấy.
 * Đêm 3: vải trắng trùm đồ đạc, chữ than trên tường, di ảnh bị cạo mặt.
 */
export class Funeral {
  private readonly flames: Mesh[] = [];
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly night: number,
  ) {
    this.buildAltarItems();
    this.buildFloorOfferings();
    this.buildCobwebs();
    if (night < 3) for (const [x, z, yaw] of ALTAR_EFFIGIES) this.staticEffigy(x, z, yaw);
    if (night >= 3) this.buildNightThree();
  }

  // ---------------------------------------------------------------- tiện ích

  private mat(name: string, color: Color3, emissive = 0): StandardMaterial {
    const m = new StandardMaterial(`funeral-${name}`, this.scene);
    m.diffuseColor = color;
    m.specularColor = Color3.Black();
    m.emissiveColor = color.scale(emissive);
    return m;
  }

  private texMat(name: string, url: string, alpha: boolean, emissive = 0.04): StandardMaterial {
    const m = new StandardMaterial(`funeral-${name}`, this.scene);
    const t = new Texture(url, this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    t.hasAlpha = alpha;
    m.diffuseTexture = t;
    m.useAlphaFromDiffuseTexture = alpha;
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(emissive, emissive, emissive);
    if (alpha) m.backFaceCulling = false;
    return m;
  }

  /** Di ảnh vẽ từ chân dung thật — trống cho tới khi ảnh tải xong. */
  private portraitMat(who: keyof typeof PORTRAITS, scraped: boolean): StandardMaterial {
    const tex = new DynamicTexture(`portrait-${who}`, { width: 192, height: 256 }, this.scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    const m = new StandardMaterial(`funeral-portrait-${who}`, this.scene);
    m.diffuseTexture = tex;
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(0.12, 0.11, 0.1);
    void portraitsReady.then(() => {
      if (drawAltarPortrait(tex.getContext() as unknown as CanvasRenderingContext2D, 192, 256, who, scraped)) tex.update();
    });
    return m;
  }

  private add<T extends Mesh>(m: T, mat: StandardMaterial, pos: Vector3, parent?: TransformNode): T {
    m.material = mat;
    m.position = pos;
    m.isPickable = false;
    if (parent) m.parent = parent;
    return m;
  }

  // ---------------------------------------------------------------- bàn thờ

  private buildAltarItems(): void {
    const bronze = this.mat("bronze", new Color3(0.32, 0.26, 0.14));
    const porcelain = this.mat("porcelain", new Color3(0.78, 0.78, 0.74), 0.05);
    const red = this.mat("candleRed", new Color3(0.55, 0.06, 0.04), 0.15);

    // Di ảnh bà trên nóc khám thờ, nơ đen hai góc; hai bên thấp hơn là di ảnh ông và chú út đã mất từ lâu.
    const frame = this.mat("portraitFrame", new Color3(0.08, 0.05, 0.03));
    const black = this.mat("bow", new Color3(0.01, 0.01, 0.01));
    const portraits: [keyof typeof PORTRAITS, number, number, number, number, number][] = [
      // (ai, x mặt ảnh, z, y, cao, nghiêng) — ông và chú dựng trước khám, hai bên ảnh gia đình.
      ["ba", -6.695, 3, 2.03, 0.4, -0.08],
      ["ong", -6.545, 2.5, 1.62, 0.26, -0.05],
      ["chu", -6.545, 3.5, 1.62, 0.26, -0.1],
    ];
    for (const [who, x, z, y, h, tilt] of portraits) {
      const w = h * 0.75;
      this.add(MeshBuilder.CreateBox("portraitFrame", { width: 0.04, height: h + 0.06, depth: w + 0.06 }, this.scene), frame, new Vector3(x - 0.025, y, z)).rotation.z = -tilt;
      const p = this.add(MeshBuilder.CreatePlane("portrait", { width: w, height: h }, this.scene), this.portraitMat(who, this.night >= 3 && who === "ba"), new Vector3(x, y, z));
      p.rotation.y = -Math.PI / 2;
      p.rotation.z = tilt;
      for (const dz of [-1, 1]) {
        const bow = this.add(MeshBuilder.CreateBox("bow", { width: 0.02, height: 0.05, depth: w * 0.4 }, this.scene), black, new Vector3(x + 0.005, y + h / 2 + 0.02, z + dz * w * 0.47));
        bow.rotation.x = dz * 0.7;
      }
    }

    // Lư hương đồng ba chân.
    const censer = this.add(MeshBuilder.CreateCylinder("censer", { diameterTop: 0.15, diameterBottom: 0.11, height: 0.09, tessellation: 10 }, this.scene), bronze, new Vector3(-6.42, 1.16, 3.05));
    censer.scaling.y = 1;
    this.add(MeshBuilder.CreateSphere("censerLid", { diameter: 0.13, segments: 6, slice: 0.5 }, this.scene), bronze, new Vector3(-6.42, 1.2, 3.05));

    // Đôi hạc đứng trên lưng rùa — biểu tượng bàn thờ Việt.
    for (const z of [2.18, 3.82]) {
      const root = new TransformNode("craneTurtle", this.scene);
      root.position = new Vector3(-6.62, 1.1, z);
      const turtle = this.add(MeshBuilder.CreateSphere("turtle", { diameter: 0.16, segments: 6 }, this.scene), bronze, new Vector3(0, 0.03, 0), root);
      turtle.scaling.y = 0.45;
      const body = this.add(MeshBuilder.CreateSphere("craneBody", { diameter: 0.12, segments: 6 }, this.scene), bronze, new Vector3(0, 0.3, 0), root);
      body.scaling.set(0.7, 0.8, 1.3);
      for (const dz of [-0.02, 0.02]) this.add(MeshBuilder.CreateCylinder("craneLeg", { diameter: 0.012, height: 0.24, tessellation: 4 }, this.scene), bronze, new Vector3(0, 0.16, dz), root);
      const neck = this.add(MeshBuilder.CreateCylinder("craneNeck", { diameter: 0.018, height: 0.32, tessellation: 4 }, this.scene), bronze, new Vector3(0.02, 0.5, 0), root);
      neck.rotation.z = -0.2;
      this.add(MeshBuilder.CreateSphere("craneHead", { diameter: 0.04, segments: 4 }, this.scene), bronze, new Vector3(0.05, 0.66, 0), root);
      const beak = this.add(MeshBuilder.CreateCylinder("craneBeak", { diameterTop: 0, diameterBottom: 0.015, height: 0.08, tessellation: 4 }, this.scene), bronze, new Vector3(0.09, 0.66, 0), root);
      beak.rotation.z = -Math.PI / 2;
    }

    // Nến đỏ chảy sáp, lửa lay lắt (chỉ phát sáng, không thêm đèn để giữ giới hạn đèn/vật liệu).
    const flameMat = this.mat("flame", new Color3(1, 0.6, 0.2), 1);
    flameMat.disableLighting = true;
    for (const z of [2.22, 3.55]) {
      this.add(MeshBuilder.CreateCylinder("candle", { diameter: 0.045, height: 0.2, tessellation: 8 }, this.scene), red, new Vector3(-6.25, 1.2, z));
      this.add(MeshBuilder.CreateSphere("wax", { diameter: 0.06, segments: 4 }, this.scene), red, new Vector3(-6.25, 1.11, z)).scaling.y = 0.35;
      const f = this.add(MeshBuilder.CreateSphere("candleFlame", { diameter: 0.025, segments: 4 }, this.scene), flameMat, new Vector3(-6.25, 1.32, z));
      f.scaling.y = 1.8;
      this.flames.push(f);
    }

    // Bát cơm cúng úp quả trứng, đôi đũa cắm thẳng.
    this.add(MeshBuilder.CreateCylinder("riceBowl", { diameterTop: 0.11, diameterBottom: 0.06, height: 0.05, tessellation: 10 }, this.scene), porcelain, new Vector3(-6.27, 1.125, 2.86));
    const rice = this.add(MeshBuilder.CreateSphere("rice", { diameter: 0.1, segments: 5 }, this.scene), this.mat("rice", new Color3(0.85, 0.84, 0.78), 0.1), new Vector3(-6.27, 1.15, 2.86));
    rice.scaling.y = 0.6;
    this.add(MeshBuilder.CreateSphere("egg", { diameter: 0.04, segments: 5 }, this.scene), this.mat("egg", new Color3(0.82, 0.74, 0.6), 0.05), new Vector3(-6.27, 1.19, 2.86)).scaling.y = 1.25;
    const chopstick = this.mat("chopstick", new Color3(0.6, 0.5, 0.3));
    for (const dz of [-0.012, 0.012]) this.add(MeshBuilder.CreateCylinder("chopstick", { diameter: 0.006, height: 0.24, tessellation: 4 }, this.scene), chopstick, new Vector3(-6.29, 1.28, 2.86 + dz));

    // Mâm ngũ quả: vài quả đã thâm đen.
    this.add(MeshBuilder.CreateCylinder("fruitPlate", { diameter: 0.24, height: 0.015, tessellation: 12 }, this.scene), porcelain, new Vector3(-6.32, 1.11, 3.32));
    const fruit = [new Color3(0.6, 0.35, 0.05), new Color3(0.25, 0.35, 0.08), new Color3(0.12, 0.08, 0.04), new Color3(0.55, 0.42, 0.08), new Color3(0.08, 0.06, 0.03)];
    fruit.forEach((c, i) => {
      const a = (i / fruit.length) * Math.PI * 2;
      this.add(MeshBuilder.CreateSphere("fruit", { diameter: 0.065, segments: 5 }, this.scene), this.mat(`fruit${i}`, c), new Vector3(-6.32 + Math.cos(a) * 0.05, 1.15 + (i === 0 ? 0.04 : 0), 3.32 + Math.sin(a) * 0.05));
    });

    // Bình cúc trắng đã héo, hai bên bàn thờ dưới đất.
    const vase = this.mat("vase", new Color3(0.2, 0.28, 0.42));
    const stem = this.mat("stem", new Color3(0.18, 0.22, 0.1));
    const petal = this.mat("petal", new Color3(0.82, 0.8, 0.7), 0.06);
    const dead = this.mat("deadPetal", new Color3(0.45, 0.38, 0.22));
    for (const z of [1.72, 4.28]) {
      this.add(MeshBuilder.CreateCylinder("vase", { diameterTop: 0.14, diameter: 0.24, diameterBottom: 0.16, height: 0.55, tessellation: 10 }, this.scene), vase, new Vector3(-6.6, 0.275, z));
      for (let i = 0; i < 6; i++) {
        const lean = 0.25 + Math.random() * 0.6;
        const a = Math.random() * Math.PI * 2;
        const s = this.add(MeshBuilder.CreateCylinder("stem", { diameter: 0.008, height: 0.5, tessellation: 3 }, this.scene), stem, new Vector3(-6.6 + Math.cos(a) * 0.1, 0.75, z + Math.sin(a) * 0.1));
        s.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
        // Hoa gục xuống — đầu hoa thấp hơn ngọn cành.
        this.add(MeshBuilder.CreateSphere("flower", { diameter: 0.08, segments: 4 }, this.scene), Math.random() < 0.4 ? dead : petal, new Vector3(-6.6 + Math.cos(a) * 0.25, 0.85 + Math.random() * 0.1, z + Math.sin(a) * 0.25));
      }
    }
  }

  // ---------------------------------------------------------------- dưới sàn

  private buildFloorOfferings(): void {
    const joss = this.texMat("joss", jossPaperUrl(), false, 0.05);
    // Chồng vàng mã cạnh bàn thờ.
    for (let i = 0; i < 4; i++) {
      this.add(MeshBuilder.CreateBox("jossStack", { width: 0.22, height: 0.08, depth: 0.22 }, this.scene), joss, new Vector3(-5.9 + (i % 2) * 0.25, 0.04 + Math.floor(i / 2) * 0.08, 1.35)).rotation.y = Math.random();
    }
    // Vàng mã vương vãi khắp nhà — đêm sau nhiều hơn đêm trước.
    const scattered = 25 + this.night * 20;
    for (let i = 0; i < scattered; i++) {
      const inHall = Math.random() < 0.3;
      const x = inHall ? -0.8 + Math.random() * 1.6 : -6.5 + Math.random() * 5;
      const z = inHall ? -5.5 + Math.random() * 11 : 0.4 + Math.random() * 5.3;
      const sheet = this.add(MeshBuilder.CreatePlane("joss", { size: 0.14 }, this.scene), joss, new Vector3(x, 0.004 + i * 0.0001, z));
      sheet.rotation.set(Math.PI / 2, Math.random() * Math.PI, 0);
    }
    // Thau đốt vàng mã: tro còn ấm.
    const tin = this.mat("basin", new Color3(0.3, 0.3, 0.28));
    this.add(MeshBuilder.CreateCylinder("basin", { diameterTop: 0.5, diameterBottom: 0.38, height: 0.12, tessellation: 14 }, this.scene), tin, new Vector3(-5.3, 0.06, 1.0));
    const ash = this.texMat("ash", ashUrl(), true, 0.03);
    const a = this.add(MeshBuilder.CreatePlane("ash", { size: 0.46 }, this.scene), ash, new Vector3(-5.3, 0.11, 1.0));
    a.rotation.x = Math.PI / 2;
    const ember = this.mat("ember", new Color3(0.9, 0.25, 0.05), 1);
    ember.disableLighting = true;
    for (let i = 0; i < 5; i++) {
      this.add(MeshBuilder.CreateSphere("ember", { diameter: 0.015, segments: 3 }, this.scene), ember, new Vector3(-5.3 + (Math.random() - 0.5) * 0.25, 0.115, 1.0 + (Math.random() - 0.5) * 0.25));
    }
  }

  private buildCobwebs(): void {
    const web = this.texMat("cobweb", cobwebUrl(), true, 0.12);
    // (góc x, góc z, hướng vào phòng theo x, theo z)
    const corners: [number, number, number, number][] = [
      [-6.9, 5.9, 1, -1],
      [-1.1, 5.9, -1, -1],
      [-6.9, 0.1, 1, 1],
      [-0.9, -5.9, 1, 1],
      [5.9, 5.9, -1, -1],
      [1.1, 0.1, 1, 1],
      [5.9, -5.9, -1, 1],
      [0.9, 5.9, -1, -1],
    ];
    for (const [x, z, dx, dz] of corners) {
      const p = this.add(MeshBuilder.CreatePlane("cobweb", { size: 0.9 }, this.scene), web, new Vector3(x + dx * 0.3, 2.72, z + dz * 0.3));
      // Mặt lưới chéo 45° giữa hai bức tường, nghiêng xuống phía phòng.
      p.rotation.y = Math.atan2(dx, dz) + Math.PI;
      p.rotation.x = 0.55;
    }
  }

  private staticEffigy(x: number, z: number, yaw: number): void {
    // Kim Đồng bên trái, Ngọc Nữ bên phải bàn thờ (nhìn từ bàn thờ ra).
    const { root } = buildPaperDoll(this.scene, `altarEffigy${x}${z}`, z < 3 ? "girl" : "boy", z < 3 ? 0 : 1);
    root.position.set(x, 0, z);
    root.rotation.y = (yaw * Math.PI) / 180;
  }

  // ---------------------------------------------------------------- Đêm 3: nhà quen mà lạ

  private buildNightThree(): void {
    const sheet = this.texMat("sheet", clothUrl(), false, 0.08);
    // Vải trắng trùm đồ đạc như nhà bỏ hoang (hoặc như người chết được phủ khăn).
    // (x, z, rộng, cao, sâu): sập gỗ, tủ để TV, giường bà.
    const drapes: [number, number, number, number, number][] = [
      [-3.6, 4.9, 2.5, 0.5, 1.6],
      [-4, 0.35, 1.5, 0.95, 0.55],
      [5.1, 4.8, 1.7, 0.62, 2.1],
    ];
    for (const [x, z, w, h, d] of drapes) {
      this.add(MeshBuilder.CreateBox("drape", { width: w + 0.06, height: h + 0.03, depth: d + 0.06 }, this.scene), sheet, new Vector3(x, (h + 0.03) / 2, z));
    }
    // Chữ than trên tường hành lang.
    const charcoal = this.texMat("charcoal", charcoalUrl(), true, 0.02);
    const c = this.add(MeshBuilder.CreatePlane("charcoal", { width: 1.4, height: 0.7 }, this.scene), charcoal, new Vector3(-0.885, 1.5, -1.0));
    c.rotation.y = -Math.PI / 2;
    // Khăn đỏ trùm gương đã rơi xuống đất.
    const red = this.mat("fallenCloth", new Color3(0.42, 0.04, 0.03));
    const cloth = this.add(MeshBuilder.CreatePlane("fallenCloth", { width: 0.7, height: 0.5 }, this.scene), red, new Vector3(2.5, 0.01, 0.55));
    cloth.rotation.x = Math.PI / 2;
    cloth.rotation.y = 0.4;
    const mirror = this.scene.getMeshByName("mirrorCloth");
    mirror?.setEnabled(false);
  }

  update(dt: number): void {
    this.time += dt;
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      f.scaling.y = 1.6 + Math.sin(this.time * 13 + i * 2) * 0.25 + Math.random() * 0.2;
      f.scaling.x = f.scaling.z = 1 + Math.sin(this.time * 9 + i) * 0.1;
    }
  }
}
