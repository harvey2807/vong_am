import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "../babylon";
import type { AudioSystem } from "../audio/AudioSystem";
import type { House } from "./House";
import {
  calendarUrl,
  clothUrl,
  coupletUrl,
  plaqueUrl,
  shaftUrl,
  talismanUrl,
  wreathUrl,
} from "./decorTextures";

/** Mặt phẳng hướng về phía nào (pháp tuyến). Plane của Babylon mặc định nhìn về -z. */
const FACING = { "+x": -Math.PI / 2, "-x": Math.PI / 2, "+z": Math.PI, "-z": 0 } as const;
type Facing = keyof typeof FACING;

/**
 * Đồ trang trí làm nên chất "nhà Việt có tang": câu đối, hoành phi, vòng hoa tang, khăn tang,
 * lịch bloc Rằm tháng Bảy, bùa, mùng, gương phủ khăn đỏ, TV CRT, đồng hồ quả lắc, quạt trần, xà gỗ,
 * cửa sổ chớp có vệt trăng. Đồ vật chỉ để nhìn: không va chạm, không chặn tương tác.
 */
export class Decor {
  private fanBlades!: TransformNode;
  private fanSpeed = 2.2;
  private pendulum!: TransformNode;
  private tickTimer = 0;
  private clockTime = 0;
  private net: Mesh[] = [];
  private shafts: StandardMaterial[] = [];
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly audio: AudioSystem,
    private readonly night: number,
  ) {
    this.buildBeams();
    this.buildAltarDecor();
    this.buildHallDecor();
    this.buildLivingDecor();
    this.buildBedroomDecor();
    this.buildKitchenDecor();
    this.buildWindows();
  }

  // ---------------------------------------------------------------- tiện ích

  private plane(name: string, w: number, h: number, pos: Vector3, facing: Facing, mat: StandardMaterial, parent?: TransformNode): Mesh {
    const p = MeshBuilder.CreatePlane(name, { width: w, height: h }, this.scene);
    p.position = pos;
    p.rotation.y = FACING[facing];
    p.material = mat;
    p.isPickable = false;
    if (parent) p.parent = parent;
    return p;
  }

  private texMat(name: string, url: string, alpha = false, emissive = 0.05): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    const t = new Texture(url, this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    t.hasAlpha = alpha;
    m.diffuseTexture = t;
    m.useAlphaFromDiffuseTexture = alpha;
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(emissive, emissive, emissive);
    if (alpha) m.backFaceCulling = false;
    return m;
  }

  private colorMat(name: string, color: Color3, alpha = 1): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = color;
    m.specularColor = Color3.Black();
    m.alpha = alpha;
    if (alpha < 1) m.backFaceCulling = false;
    return m;
  }

  private prop(name: string, w: number, h: number, d: number, pos: Vector3, mat: StandardMaterial, parent?: TransformNode): Mesh {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
    m.position = pos;
    m.material = mat;
    m.isPickable = false;
    if (parent) m.parent = parent;
    return m;
  }

  // ---------------------------------------------------------------- các phần

  /** Xà gỗ ngang trần — nhà cổ miền Nam/Bắc đều có, phá cái phẳng lì của trần hộp. */
  private buildBeams(): void {
    const wood = this.colorMat("beam", new Color3(0.16, 0.09, 0.05));
    for (const z of [-4.5, -1.5, 1.5, 4.5]) this.prop("beam", 13, 0.18, 0.16, new Vector3(-0.5, 2.9, z), wood);
  }

  private buildAltarDecor(): void {
    // Câu đối hai bên bàn thờ + hoành phi phía trên.
    this.plane("coupletL", 0.28, 1.5, new Vector3(-6.885, 1.7, 1.65), "+x", this.texMat("coupletL", coupletUrl("L")));
    this.plane("coupletR", 0.28, 1.5, new Vector3(-6.885, 1.7, 4.35), "+x", this.texMat("coupletR", coupletUrl("R")));
    this.plane("plaque", 1.7, 0.48, new Vector3(-6.885, 2.55, 3), "+x", this.texMat("plaque", plaqueUrl(), false, 0.08));

    // Băng tang đen chéo góc ảnh thờ.
    const black = this.colorMat("mourningRibbon", new Color3(0.01, 0.01, 0.01));
    for (const dz of [-1, 1]) {
      const r = this.prop("ribbon", 0.012, 0.035, 0.2, new Vector3(-6.443, 1.5, 3 + dz * 0.21), black);
      r.rotation.x = dz * 0.75;
    }

    // Khăn tang trắng vắt trên đinh cạnh bàn thờ.
    const cloth = this.texMat("mourningCloth", clothUrl());
    cloth.backFaceCulling = false;
    this.plane("mourningBand", 0.16, 0.7, new Vector3(-6.88, 1.45, 5.0), "+x", cloth);
    this.plane("mourningBand2", 0.16, 0.55, new Vector3(-6.87, 1.5, 5.12), "+x", cloth).rotation.z = 0.12;
  }

  private buildHallDecor(): void {
    // Vòng hoa tang dựng cạnh cửa chính: "Vô cùng thương tiếc".
    const wreath = this.texMat("wreath", wreathUrl(), true, 0.06);
    this.plane("wreath", 0.85, 1.06, new Vector3(-0.86, 1.15, -4.2), "+x", wreath);
    const leg = this.colorMat("wreathStand", new Color3(0.2, 0.18, 0.12));
    for (const dz of [-0.25, 0.25]) this.prop("wreathLeg", 0.02, 1.3, 0.02, new Vector3(-0.88, 0.65, -4.2 + dz), leg).rotation.z = -0.08;

    // Bùa trên cửa chính — bà dán. Đêm hai thì thầy dán thêm khắp nhà.
    const door = this.scene.getMeshByName("frontDoor") as Mesh;
    this.talismans(door, [new Vector3(-0.25, 0.35, 0.045), new Vector3(0.25, 0.35, 0.045)], "+z");

    // Đồng hồ quả lắc trên tường hành lang.
    const root = new TransformNode("clock", this.scene);
    root.position = new Vector3(0.88, 1.9, 1.0);
    const wood = this.colorMat("clockWood", new Color3(0.22, 0.12, 0.06));
    this.prop("clockBody", 0.12, 0.85, 0.36, Vector3.Zero(), wood, root);
    const face = this.colorMat("clockFace", new Color3(0.8, 0.75, 0.62));
    face.emissiveColor = new Color3(0.06, 0.05, 0.04);
    const dial = MeshBuilder.CreateDisc("clockDial", { radius: 0.13, tessellation: 16 }, this.scene);
    dial.parent = root;
    dial.position.set(-0.062, 0.24, 0);
    dial.rotation.y = FACING["-x"];
    dial.material = face;
    dial.isPickable = false;
    const brass = this.colorMat("brass", new Color3(0.55, 0.42, 0.18));
    this.pendulum = new TransformNode("pendulum", this.scene);
    this.pendulum.parent = root;
    this.pendulum.position.set(-0.065, 0.08, 0);
    this.prop("pendulumRod", 0.01, 0.3, 0.012, new Vector3(0, -0.15, 0), brass, this.pendulum);
    const bob = MeshBuilder.CreateCylinder("pendulumBob", { diameter: 0.08, height: 0.01, tessellation: 12 }, this.scene);
    bob.parent = this.pendulum;
    bob.position.y = -0.3;
    bob.rotation.z = Math.PI / 2;
    bob.material = brass;
    bob.isPickable = false;
  }

  private buildLivingDecor(): void {
    // Quạt trần.
    const metal = this.colorMat("fanMetal", new Color3(0.25, 0.25, 0.22));
    this.prop("fanRod", 0.03, 0.25, 0.03, new Vector3(-4, 2.87, 3), metal);
    this.fanBlades = new TransformNode("fanBlades", this.scene);
    this.fanBlades.position = new Vector3(-4, 2.72, 3);
    for (let i = 0; i < 3; i++) {
      const pivot = new TransformNode("fanArm", this.scene);
      pivot.parent = this.fanBlades;
      pivot.rotation.y = (i * Math.PI * 2) / 3;
      this.prop("fanBlade", 0.14, 0.01, 0.62, new Vector3(0, 0, 0.38), metal, pivot);
    }
    const hub = MeshBuilder.CreateCylinder("fanHub", { diameter: 0.16, height: 0.08, tessellation: 10 }, this.scene);
    hub.parent = this.fanBlades;
    hub.material = metal;
    hub.isPickable = false;

    // Lịch treo + ảnh cũ trên tường phòng khách.
    this.plane("oldPortrait", 0.4, 0.5, new Vector3(-2.2, 1.8, 5.89), "-z", this.colorMat("portraitBack", new Color3(0.12, 0.1, 0.08)));
  }

  private buildBedroomDecor(): void {
    // Mùng trắng buông quanh giường bà.
    const tulle = this.colorMat("tulle", new Color3(0.85, 0.83, 0.78), 0.16);
    tulle.emissiveColor = new Color3(0.09, 0.09, 0.085);
    const cx = 5.07;
    const cz = 4.8;
    const w = 1.6;
    const d = 2.1;
    const y = 1.3;
    const h = 1.4;
    this.net.push(this.plane("netS", w, h, new Vector3(cx, y, cz - d / 2), "-z", tulle));
    this.net.push(this.plane("netN", w, h, new Vector3(cx, y, cz + d / 2), "+z", tulle));
    this.net.push(this.plane("netW", d, h, new Vector3(cx - w / 2, y, cz), "-x", tulle));
    const top = MeshBuilder.CreatePlane("netTop", { width: w, height: d }, this.scene);
    top.position = new Vector3(cx, y + h / 2, cz);
    top.rotation.x = Math.PI / 2;
    top.material = tulle;
    top.isPickable = false;
    const string = this.colorMat("string", new Color3(0.5, 0.48, 0.42));
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      this.prop("netString", 0.008, 1.0, 0.008, new Vector3(cx + (dx * w) / 2, 2.5, cz + (dz * d) / 2), string);
    }

    // Gương trùm khăn đỏ — nhà có tang thì che gương.
    const frame = this.colorMat("mirrorFrame", new Color3(0.2, 0.11, 0.06));
    this.prop("mirrorFrame", 0.62, 0.95, 0.04, new Vector3(2.5, 1.5, 0.12), frame);
    const red = this.colorMat("redCloth", new Color3(0.42, 0.04, 0.03));
    red.backFaceCulling = false;
    const cloth = this.plane("mirrorCloth", 0.72, 0.8, new Vector3(2.5, 1.55, 0.15), "+z", red);
    cloth.rotation.x = -0.05;

    if (this.night >= 2) {
      const wardrobe = this.scene.getMeshByName("wardrobe") as Mesh;
      this.talismans(wardrobe, [new Vector3(-0.355, 0.5, 0.35)], "-x");
    }
  }

  private buildKitchenDecor(): void {
    this.plane("calendar", 0.28, 0.37, new Vector3(2.4, 1.65, -0.11), "-z", this.texMat("calendar", calendarUrl(), false, 0.06));
    // Chạn bát + dãy chén trên kệ.
    const wood = this.colorMat("shelfWood", new Color3(0.2, 0.12, 0.07));
    this.prop("shelf", 0.3, 0.03, 1.6, new Vector3(5.75, 1.75, -3), wood);
    const ceramic = this.colorMat("bowls", new Color3(0.7, 0.72, 0.76));
    for (let i = 0; i < 6; i++) {
      const b = MeshBuilder.CreateCylinder("bowl", { diameterTop: 0.14, diameterBottom: 0.07, height: 0.06, tessellation: 8 }, this.scene);
      b.position = new Vector3(5.75, 1.8, -3.6 + i * 0.24);
      b.material = ceramic;
      b.isPickable = false;
    }
  }

  /** Cửa sổ chớp gỗ (đóng) có vệt trăng xiên vào phòng. */
  private buildWindows(): void {
    const frame = this.colorMat("windowFrame", new Color3(0.18, 0.1, 0.05));
    const glass = this.colorMat("windowGlass", new Color3(0.02, 0.03, 0.05));
    glass.emissiveColor = new Color3(0.03, 0.05, 0.09);
    const shaftTex = new Texture(shaftUrl(), this.scene, false, true, Texture.BILINEAR_SAMPLINGMODE);
    shaftTex.hasAlpha = true;

    const windows: { pos: Vector3; facing: Facing; into: Vector3 }[] = [
      { pos: new Vector3(-4, 1.75, 5.9), facing: "-z", into: new Vector3(0, 0, -1) },
      { pos: new Vector3(2.6, 1.75, 5.9), facing: "-z", into: new Vector3(0, 0, -1) },
      { pos: new Vector3(5.9, 1.75, -0.95), facing: "-x", into: new Vector3(-1, 0, 0) },
    ];
    for (const w of windows) {
      const root = new TransformNode("window", this.scene);
      root.position = w.pos;
      root.rotation.y = FACING[w.facing];
      // Trong hệ tọa độ của root: mặt cửa sổ nằm trên mặt phẳng XY, hướng vào phòng là -z.
      this.prop("windowGlass", 1.0, 1.1, 0.02, new Vector3(0, 0, 0.01), glass, root);
      for (const [x, y, ww, hh] of [[0, 0.58, 1.12, 0.07], [0, -0.58, 1.12, 0.07], [-0.53, 0, 0.07, 1.2], [0.53, 0, 0.07, 1.2], [0, 0, 0.05, 1.1]]) {
        this.prop("windowFrame", ww, hh, 0.08, new Vector3(x, y, -0.03), frame, root);
      }
      // Chớp lá sách.
      for (let i = 0; i < 9; i++) {
        const slat = this.prop("slat", 0.98, 0.05, 0.1, new Vector3(0, -0.5 + i * 0.125, -0.06), frame, root);
        slat.rotation.x = 0.7;
      }
      // Vệt sáng: dải mặt phẳng nối cửa sổ xuống sàn.
      const len = 3.1;
      const m = new StandardMaterial("shaft", this.scene);
      m.disableLighting = true;
      m.emissiveColor = new Color3(0.32, 0.4, 0.55);
      m.opacityTexture = shaftTex;
      m.alphaMode = 1; // ALPHA_ADD
      m.backFaceCulling = false;
      m.alpha = 0.35;
      this.shafts.push(m);
      const shaft = MeshBuilder.CreatePlane("shaft", { width: 0.95, height: len }, this.scene);
      shaft.parent = root;
      shaft.isPickable = false;
      shaft.material = m;
      const tilt = Math.atan2(1.7, 2.4);
      shaft.rotation.x = Math.PI / 2 - tilt;
      shaft.position.set(0, -Math.sin(tilt) * len * 0.5 + 0.1, -Math.cos(tilt) * len * 0.5);
    }
  }

  private talismans(parent: Mesh, at: Vector3[], facing: Facing): void {
    at.forEach((p, i) => {
      const m = this.texMat(`talisman${parent.name}${i}`, talismanUrl(`${parent.name}${i}`), false, 0.1);
      m.backFaceCulling = true;
      const t = this.plane("talisman", 0.13, 0.38, p, facing, m, parent);
      t.rotation.z = (Math.random() - 0.5) * 0.15;
    });
  }

  // ---------------------------------------------------------------- vòng lặp

  /** `clockStopped`: căn nhà hết yên (gõ cửa, đi săn, mất điện) — quả lắc đứng khựng giữa nhịp, tiếng tích tắc tắt. */
  update(dt: number, lightsOn: boolean, clockStopped = false): void {
    this.time += dt;
    if (!clockStopped) this.clockTime += dt;
    // Mất điện thì quạt quay chậm dần rồi đứng hẳn.
    this.fanSpeed = lightsOn ? 2.2 : Math.max(0, this.fanSpeed - dt * 0.35);
    this.fanBlades.rotation.y += this.fanSpeed * dt;
    for (const n of this.net) n.rotation.z = Math.sin(this.time * 0.7 + n.position.x) * 0.01 * (this.fanSpeed / 2.2);

    // Đồng hồ quả lắc: tiếng tích tắc nhỏ, chỉ nghe rõ khi đứng gần.
    this.pendulum.rotation.x = Math.sin(this.clockTime * Math.PI) * 0.22;
    if (!clockStopped) {
      this.tickTimer -= dt;
      if (this.tickTimer <= 0) {
        this.tickTimer += 1;
        this.audio.play("click", this.pendulum.getAbsolutePosition());
      }
    }

    const shaft = lightsOn ? 0.18 : 0.45;
    for (const m of this.shafts) m.alpha += (shaft - m.alpha) * Math.min(1, dt * 2);
  }
}

