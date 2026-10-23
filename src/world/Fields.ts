import {
  Color3,
  Color4,
  DirectionalLight,
  Matrix,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PointLight,
  Quaternion,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { Game } from "../core/Game";
import type { LightState } from "../director/types";
import type { House } from "./House";
import { cardboardSignUrl, effigyFaceUrl, riceUrl, softDotUrl } from "./decorTextures";

/** Cánh đồng nằm xa hẳn căn nhà (z 68..142) — camera chỉ nhìn 60 m nên nhà không lọt vào khung. */
const X_MIN = -30;
const X_MAX = 30;
const Z_MIN = 68;
const Z_MAX = 142;
/** Bờ ruộng: đường gấp khúc từ đầu làng tới gốc đa. Ngoài bờ là ruộng nước — lội chậm, có tiếng nước. */
const PATH: [number, number][] = [
  [0, 70],
  [0, 90],
  [-8, 90],
  [-8, 108],
  [6, 108],
  [6, 126],
  [5, 129.5],
];
const PATH_HALF = 0.65;
const BANYAN = new Vector3(5, 0, 133.5);
const UNCLE = new Vector3(5, 0, 131.4);

/** Bù nhìn đứng giữa ruộng, sát bờ — (x, z, hướng nhìn độ). */
export const SCARECROW_SPOTS: [number, number, number][] = [
  [-3.5, 81, 90],
  [3.5, 95, -90],
  [-13, 99, 90],
  [-2.5, 103, -60],
  [10.5, 113, -90],
  [1.5, 118, 90],
  [-4, 125, 70],
];

/**
 * Chạng vạng · Gốc đa đầu làng: bản đồ ngoài trời đầu tiên. Ruộng lúa nước, bờ ruộng gấp khúc dẫn tới
 * gốc đa cổ thụ có rễ phụ rủ xuống, nghĩa địa quanh gốc, lũy tre bao quanh. Không có đèn trừ ánh trăng
 * và ngọn đèn thờ đỏ dưới gốc đa — điểm định hướng nhìn thấy từ xa. Đom đóm bay dọc bờ ruộng chỉ lối.
 */
export class Fields {
  private readonly meshes: Mesh[] = [];
  private readonly moon: DirectionalLight;
  private uncleHead!: TransformNode;
  private turn = 0;

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    this.buildGround();
    this.buildPaths();
    this.buildRice();
    this.buildBamboo();
    this.buildBanyan();
    this.buildGraves();
    this.buildUncle();
    this.buildSign();
    this.buildFireflies();

    this.moon = new DirectionalLight("fieldMoon", new Vector3(0.3, -0.8, 0.5), scene);
    this.moon.diffuse = new Color3(0.45, 0.55, 0.75);
    this.moon.specular = Color3.Black();
    this.moon.intensity = 0.8;
    this.moon.includedOnlyMeshes = this.meshes;
    const lamp = new PointLight("banyanLamp", new Vector3(BANYAN.x - 0.6, 0.9, BANYAN.z - 1.1), scene);
    lamp.diffuse = new Color3(1, 0.25, 0.12);
    lamp.specular = Color3.Black();
    lamp.intensity = 0.9;
    lamp.range = 7;

    house.baseFog = 0.055;
    scene.fogDensity = house.baseFog;
    house.anchors.set("banyan", new Vector3(BANYAN.x, 1.2, BANYAN.z - 2));
    house.anchors.set("fieldSign", new Vector3(1.2, 1.2, 73));
    house.anchors.set("paddyCall", new Vector3(-12, 0.3, 104));
    house.anchors.set("fieldMid", new Vector3(-8, 0, 99));
  }

  // ---------------------------------------------------------------- tiện ích

  private mat(name: string, color: Color3, emissive = 0): StandardMaterial {
    const m = new StandardMaterial(`field-${name}`, this.scene);
    m.diffuseColor = color;
    m.specularColor = Color3.Black();
    m.emissiveColor = color.scale(emissive);
    return m;
  }

  private add<T extends Mesh>(m: T, pickable = false): T {
    m.isPickable = pickable;
    m.receiveShadows = true;
    this.meshes.push(m);
    return m;
  }

  /** Khoảng cách từ điểm (x, z) tới bờ ruộng gần nhất. */
  private distToPath(x: number, z: number): number {
    let best = Infinity;
    for (let i = 1; i < PATH.length; i++) {
      const [ax, az] = PATH[i - 1];
      const [bx, bz] = PATH[i];
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
    }
    return best;
  }

  /** Bãi đất quanh gốc đa (đất thờ) — bù nhìn không theo vào đây. */
  isSanctuary(x: number, z: number): boolean {
    return Math.hypot(x - BANYAN.x, z - BANYAN.z) < 10;
  }

  /** Người chơi đang lội ruộng (không ở trên bờ, chưa tới bãi đất quanh gốc đa)? */
  inWater(x: number, z: number): boolean {
    if (z > 121 && Math.hypot(x - BANYAN.x, z - BANYAN.z) < 12) return false;
    return this.distToPath(x, z) > PATH_HALF && z > Z_MIN + 3;
  }

  // ---------------------------------------------------------------- dựng

  private buildGround(): void {
    // Mặt ruộng nước: tối, bóng như gương dưới trăng.
    const water = new StandardMaterial("field-water", this.scene);
    water.diffuseColor = new Color3(0.03, 0.05, 0.05);
    water.specularColor = new Color3(0.5, 0.55, 0.6);
    water.specularPower = 64;
    const ground = MeshBuilder.CreateGround("fieldWater", { width: X_MAX - X_MIN, height: Z_MAX - Z_MIN, subdivisions: 4 }, this.scene);
    ground.position = new Vector3((X_MIN + X_MAX) / 2, 0, (Z_MIN + Z_MAX) / 2);
    ground.material = water;
    ground.checkCollisions = true;
    this.add(ground, true);
    // Bãi đất quanh gốc đa + đường làng ở đầu.
    const dirt = this.house.surface("mud", 6, 6, new Color3(0.4, 0.38, 0.32));
    const yard = this.add(MeshBuilder.CreateDisc("banyanYard", { radius: 12, tessellation: 24 }, this.scene));
    yard.rotation.x = Math.PI / 2;
    yard.position = new Vector3(BANYAN.x, 0.02, BANYAN.z - 1);
    yard.material = dirt;
    const road = this.add(MeshBuilder.CreateGround("villageRoad", { width: X_MAX - X_MIN, height: 4 }, this.scene));
    road.position = new Vector3(0, 0.02, Z_MIN + 1.5);
    road.material = dirt;
    // Biên giới vô hình: không cho đi ra khỏi bản đồ.
    const wall = this.mat("bound", Color3.Black());
    for (const [x, z, w, d] of [
      [X_MIN - 0.5, (Z_MIN + Z_MAX) / 2, 1, Z_MAX - Z_MIN],
      [X_MAX + 0.5, (Z_MIN + Z_MAX) / 2, 1, Z_MAX - Z_MIN],
      [0, Z_MIN - 0.5, X_MAX - X_MIN, 1],
      [0, Z_MAX + 0.5, X_MAX - X_MIN, 1],
    ]) {
      const b = this.house.box("fieldBound", w, 4, d, new Vector3(x, 2, z), wall);
      b.isVisible = false;
      b.isPickable = false;
    }
  }

  private buildPaths(): void {
    const dirt = this.house.surface("mud", 1, 6, new Color3(0.45, 0.42, 0.34));
    for (let i = 1; i < PATH.length; i++) {
      const [ax, az] = PATH[i - 1];
      const [bx, bz] = PATH[i];
      const len = Math.hypot(bx - ax, bz - az);
      const seg = this.add(MeshBuilder.CreateBox("bo", { width: PATH_HALF * 2, height: 0.12, depth: len + PATH_HALF * 2 }, this.scene));
      seg.position = new Vector3((ax + bx) / 2, 0.04, (az + bz) / 2);
      seg.rotation.y = Math.atan2(bx - ax, bz - az);
      seg.material = dirt;
    }
  }

  /** Lúa: một mesh khóm lúa nhân bản hàng nghìn lần (thin instances) — rẻ cho GPU. */
  private buildRice(): void {
    const m = new StandardMaterial("field-rice", this.scene);
    const t = new Texture(riceUrl(), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    t.hasAlpha = true;
    m.diffuseTexture = t;
    m.useAlphaFromDiffuseTexture = true;
    m.backFaceCulling = false;
    m.specularColor = Color3.Black();
    const tuft = MeshBuilder.CreatePlane("riceTuft", { width: 0.7, height: 0.75 }, this.scene);
    tuft.material = m;
    tuft.isPickable = false;
    const matrices: Matrix[] = [];
    for (let i = 0; i < 4200; i++) {
      const x = X_MIN + 1 + Math.random() * (X_MAX - X_MIN - 2);
      const z = Z_MIN + 4 + Math.random() * (Z_MAX - Z_MIN - 10);
      if (!this.inWater(x, z) || this.distToPath(x, z) < 1.1) continue;
      const s = 0.8 + Math.random() * 0.5;
      matrices.push(Matrix.Compose(new Vector3(s, s, s), Quaternion.FromEulerAngles(0, Math.random() * Math.PI, 0), new Vector3(x, 0.33 * s, z)));
    }
    const buf = new Float32Array(matrices.length * 16);
    matrices.forEach((mx, i) => mx.copyToArray(buf, i * 16));
    tuft.thinInstanceSetBuffer("matrix", buf, 16);
    this.add(tuft);
  }

  /** Lũy tre bao quanh làng — bức tường đen của bóng đêm. */
  private buildBamboo(): void {
    const stalk = this.mat("bamboo", new Color3(0.12, 0.16, 0.08));
    const leaves = this.mat("bambooLeaf", new Color3(0.05, 0.09, 0.04));
    const clump = (x: number, z: number) => {
      for (let i = 0; i < 6; i++) {
        const h = 5 + Math.random() * 4;
        const s = this.add(MeshBuilder.CreateCylinder("bambooStalk", { diameter: 0.1, height: h, tessellation: 4 }, this.scene));
        s.position = new Vector3(x + (Math.random() - 0.5) * 1.2, h / 2, z + (Math.random() - 0.5) * 1.2);
        s.rotation.z = (Math.random() - 0.5) * 0.3;
        s.material = stalk;
      }
      const top = this.add(MeshBuilder.CreateSphere("bambooTop", { diameter: 3.2, segments: 5 }, this.scene));
      top.scaling.y = 0.6;
      top.position = new Vector3(x, 7 + Math.random(), z);
      top.material = leaves;
    };
    for (let z = Z_MIN + 2; z < Z_MAX; z += 3.2) {
      clump(X_MIN + 1, z);
      clump(X_MAX - 1, z);
    }
    for (let x = X_MIN + 2; x < X_MAX; x += 3.2) clump(x, Z_MAX - 1);
  }

  /** Cây đa cổ thụ: gốc xòe, rễ phụ rủ như màn, tán đen kịt; bàn thờ nhỏ phủ vải đỏ dưới gốc. */
  private buildBanyan(): void {
    const bark = this.mat("bark", new Color3(0.2, 0.17, 0.13));
    const canopy = this.mat("canopy", new Color3(0.04, 0.07, 0.04));
    const trunk = this.add(MeshBuilder.CreateCylinder("banyanTrunk", { diameterTop: 1.3, diameterBottom: 2.6, height: 7, tessellation: 12 }, this.scene), true);
    trunk.position = BANYAN.add(new Vector3(0, 3.5, 0));
    trunk.material = bark;
    trunk.checkCollisions = true;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 5;
      const top = 5.5 + Math.random() * 2;
      const len = top - Math.random() * 1.5;
      const root = this.add(MeshBuilder.CreateCylinder("aerialRoot", { diameter: 0.04 + Math.random() * 0.05, height: len, tessellation: 3 }, this.scene));
      root.position = new Vector3(BANYAN.x + Math.cos(a) * r, top - len / 2, BANYAN.z + Math.sin(a) * r);
      root.material = bark;
    }
    for (let i = 0; i < 7; i++) {
      const c = this.add(MeshBuilder.CreateSphere("banyanCanopy", { diameter: 7 + Math.random() * 4, segments: 6 }, this.scene));
      c.scaling.y = 0.45;
      c.position = BANYAN.add(new Vector3((Math.random() - 0.5) * 8, 7.5 + Math.random() * 2, (Math.random() - 0.5) * 8));
      c.material = canopy;
    }
    // Bàn thờ dưới gốc: hộp gỗ phủ vải đỏ, ngọn đèn dầu đỏ, nhang.
    const red = this.mat("shrineCloth", new Color3(0.45, 0.06, 0.04));
    const shrine = this.add(this.house.box("banyanShrine", 0.8, 0.6, 0.5, BANYAN.add(new Vector3(-0.6, 0.3, -1.5)), red));
    shrine.isPickable = false;
    const flame = this.mat("banyanFlame", new Color3(1, 0.35, 0.12), 1);
    flame.disableLighting = true;
    // Không bị sương che: đốm đỏ nhìn thấy từ đầu làng — điểm định hướng duy nhất khi tắt đèn.
    flame.fogEnabled = false;
    const f = MeshBuilder.CreateSphere("banyanFlame", { diameter: 0.16, segments: 5 }, this.scene);
    f.position = BANYAN.add(new Vector3(-0.6, 0.72, -1.5));
    f.material = flame;
    f.isPickable = false;
    this.game.fx.addSmoke(BANYAN.add(new Vector3(-0.4, 0.75, -1.5)));
    // Lồng đèn đỏ treo trên cành đa: đèn hiệu nhìn thấy từ đầu làng, cao hơn ngọn lúa.
    const lantern = MeshBuilder.CreateCylinder("banyanLantern", { diameterTop: 0.22, diameterBottom: 0.22, height: 0.32, tessellation: 10 }, this.scene);
    lantern.position = BANYAN.add(new Vector3(-0.9, 2.5, -1.6));
    lantern.material = flame;
    lantern.isPickable = false;
    // Quầng đỏ mềm quanh lồng đèn (luôn quay về camera, không bị sương che).
    const halo = new StandardMaterial("field-halo", this.scene);
    halo.disableLighting = true;
    halo.emissiveColor = new Color3(0.9, 0.2, 0.1);
    halo.opacityTexture = new Texture(softDotUrl(), this.scene);
    halo.alphaMode = 1; // cộng màu
    halo.fogEnabled = false;
    const glow = MeshBuilder.CreatePlane("lanternGlow", { size: 1.6 }, this.scene);
    glow.position = lantern.position.clone();
    glow.billboardMode = Mesh.BILLBOARDMODE_ALL;
    glow.material = halo;
    glow.isPickable = false;
    const string = this.add(MeshBuilder.CreateCylinder("lanternString", { diameter: 0.01, height: 1.4, tessellation: 3 }, this.scene));
    string.position = lantern.position.add(new Vector3(0, 0.86, 0));
    string.material = bark;
  }

  /** Nghĩa địa quanh gốc đa: mộ xây vôi bạc màu, bia đá, vài nén nhang. */
  private buildGraves(): void {
    const stone = this.house.surface("fence", 1, 1, new Color3(0.55, 0.56, 0.52));
    const spots: [number, number, number][] = [
      [-3, 124, 0.1], [-1, 128, -0.2], [11, 126, 0.3], [13, 130, 0], [-4, 132, 0.4],
      [12, 135, -0.3], [-2, 137, 0.2], [9, 139, 0.1], [1, 140, -0.1], [14, 124, 0.5],
    ];
    for (const [x, z, yaw] of spots) {
      const root = new TransformNode("grave", this.scene);
      root.position = new Vector3(x, 0, z);
      root.rotation.y = yaw;
      const tomb = this.add(MeshBuilder.CreateBox("tomb", { width: 0.9, height: 0.45, depth: 1.8 }, this.scene), true);
      tomb.parent = root;
      tomb.position.y = 0.22;
      tomb.material = stone;
      tomb.checkCollisions = true;
      const stele = this.add(MeshBuilder.CreateBox("stele", { width: 0.6, height: 0.8, depth: 0.12 }, this.scene));
      stele.parent = root;
      stele.position = new Vector3(0, 0.6, -0.9);
      stele.material = stone;
    }
  }

  /** Chú Tư ngồi bệt quay mặt vào gốc đa, lưng hướng ra đồng. Lúc người chơi tới gần, đầu chú quay lại. */
  private buildUncle(): void {
    const shirt = this.mat("uncleShirt", new Color3(0.22, 0.24, 0.26));
    const hair = this.mat("uncleHair", new Color3(0.06, 0.06, 0.06));
    const root = new TransformNode("uncle", this.scene);
    root.position = UNCLE.clone();
    // Lưng quay về phía người chơi (−z), mặt nhìn vào gốc đa (+z).
    const body = this.add(MeshBuilder.CreateBox("uncleBody", { width: 0.45, height: 0.6, depth: 0.28 }, this.scene));
    body.parent = root;
    body.position.y = 0.55;
    body.material = shirt;
    const legs = this.add(MeshBuilder.CreateBox("uncleLegs", { width: 0.42, height: 0.2, depth: 0.6 }, this.scene));
    legs.parent = root;
    legs.position = new Vector3(0, 0.12, 0.2);
    legs.material = shirt;
    this.uncleHead = new TransformNode("uncleHead", this.scene);
    this.uncleHead.parent = root;
    this.uncleHead.position.y = 1.0;
    const skull = this.add(MeshBuilder.CreateSphere("uncleSkull", { diameter: 0.24, segments: 6 }, this.scene));
    skull.parent = this.uncleHead;
    skull.material = hair;
    // Mặt: trơn trắng như giấy (Kẻ Không Có Mặt) — chỉ thấy khi chú quay lại.
    const faceMat = new StandardMaterial("field-uncleFace", this.scene);
    faceMat.diffuseTexture = new Texture(effigyFaceUrl("blank"), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    faceMat.emissiveColor = new Color3(0.35, 0.34, 0.32);
    faceMat.specularColor = Color3.Black();
    const face = this.add(MeshBuilder.CreatePlane("uncleFace", { width: 0.2, height: 0.25 }, this.scene));
    face.parent = this.uncleHead;
    face.rotation.y = Math.PI;
    face.position.set(0, -0.01, 0.125);
    face.material = faceMat;
    this.house.anchors.set("uncle", UNCLE.add(new Vector3(0, 1, 0)));
  }

  private buildSign(): void {
    const pole = this.add(MeshBuilder.CreateCylinder("signPole", { diameter: 0.06, height: 1.9, tessellation: 5 }, this.scene));
    pole.position = new Vector3(1.1, 0.95, 73);
    pole.material = this.mat("signPole", new Color3(0.35, 0.3, 0.16));
    const m = new StandardMaterial("field-sign", this.scene);
    m.diffuseTexture = new Texture(cardboardSignUrl(["ĐÊM QUA ĐỒNG", "PHẢI TẮT ĐÈN"]), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(0.12, 0.1, 0.08);
    m.backFaceCulling = false;
    const sign = this.add(MeshBuilder.CreatePlane("fieldSign", { width: 0.8, height: 0.6 }, this.scene));
    sign.position = new Vector3(1.1, 1.5, 72.95);
    sign.material = m;
  }

  /** Đom đóm bay lơ lửng dọc bờ ruộng — sợi chỉ sáng duy nhất dẫn đường khi tắt đèn. */
  private buildFireflies(): void {
    const dot = new Texture(softDotUrl(), this.scene);
    for (let i = 1; i < PATH.length; i++) {
      const [ax, az] = PATH[i - 1];
      const [bx, bz] = PATH[i];
      const ps = new ParticleSystem("fireflies", 40, this.scene);
      ps.particleTexture = dot;
      ps.emitter = new Vector3((ax + bx) / 2, 0.6, (az + bz) / 2);
      ps.minEmitBox = new Vector3(Math.min(0, (ax - bx) / 2) - 0.8, -0.3, Math.min(0, (az - bz) / 2) - 0.8);
      ps.maxEmitBox = new Vector3(Math.max(0, (ax - bx) / 2) + 0.8, 0.6, Math.max(0, (az - bz) / 2) + 0.8);
      ps.color1 = new Color4(0.75, 1, 0.35, 0.9);
      ps.color2 = new Color4(0.55, 0.9, 0.25, 0.7);
      ps.colorDead = new Color4(0.4, 0.8, 0.2, 0);
      ps.minSize = 0.04;
      ps.maxSize = 0.07;
      ps.minLifeTime = 2.5;
      ps.maxLifeTime = 5;
      ps.emitRate = 5 + Math.hypot(bx - ax, bz - az) * 0.4;
      ps.direction1 = new Vector3(-0.15, -0.05, -0.15);
      ps.direction2 = new Vector3(0.15, 0.12, 0.15);
      ps.minEmitPower = 0.3;
      ps.maxEmitPower = 0.6;
      ps.blendMode = ParticleSystem.BLENDMODE_ADD;
      ps.start();
    }
  }

  /** Mất điện/tối hẳn (đoạn kết) thì trăng cũng tắt theo. */
  setLights(state: LightState): void {
    this.moon.intensity = state === "blackout" ? 0 : 0.8;
  }

  update(dt: number): void {
    // Chú Tư quay đầu lại khi kịch bản bật cờ — chậm, giật cục như khớp cổ cứng đờ.
    if (this.game.director.has("uncle_turn") && this.turn < 1) {
      this.turn = Math.min(1, this.turn + dt * 0.45);
      const stepped = Math.floor(this.turn * 6) / 6;
      this.uncleHead.rotation.y = stepped * Math.PI;
    }
  }
}
