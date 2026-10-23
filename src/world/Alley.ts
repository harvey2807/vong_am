import { Color3, HemisphericLight, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import type { Game } from "../core/Game";
import { makeInteractable } from "../interaction/Interaction";
import type { House } from "./House";
import { barredWindowUrl, shutterUrl, signUrl, windowFaceUrl } from "./decorTextures";

/** Lòng ngõ: x -2..2, từ cửa nhà bà (z -6) ra tới đầu ngõ (z -40). */
const HALF = 2.0;
const Z_DOOR = -6.2;
const Z_END = -40.5;

/** Mặt tiền: [z bắt đầu, z kết thúc, chiều cao, kiểu]. */
type Facade = [number, number, number, "plain" | "shop" | "dark" | "neighbor" | "tall"];

const LEFT: Facade[] = [
  [-10.5, Z_DOOR, 3.6, "plain"],
  [-16, -10.5, 6.4, "tall"],
  [-22, -16, 3.6, "shop"],
  [-29, -22, 6, "tall"],
  [-35, -29, 3.8, "neighbor"],
  [Z_END, -35, 5, "plain"],
];
const RIGHT: Facade[] = [
  [-10.5, Z_DOOR, 3.6, "plain"],
  [-15, -10.5, 4.2, "shop"],
  [-21, -15, 6.2, "dark"],
  [-28, -21, 3.6, "shop"],
  [-34, -28, 5, "tall"],
  [Z_END, -34, 4, "plain"],
];
const SIGNS: [string, string, string][] = [
  ["TẠP HÓA", "#7a2a1e", "#e8d9b0"],
  ["SỬA XE", "#1f3f5c", "#e9e2cf"],
  ["CẮT TÓC", "#2f4a2c", "#efe6cf"],
];

/**
 * Ngõ 4 — màn mở đầu: con hẻm mưa đêm dẫn về cửa chính nhà bà. Dựng ngay trước mặt tiền căn nhà
 * (cửa chính ở z = -6) nên không cần cảnh riêng. Mặt tiền nhà một-hai tầng, cửa cuốn, biển hiệu,
 * xe máy, dây điện, bóng đèn đường, miếu thổ địa, thùng đốt vàng mã; nhà số 9 tối om có cửa sổ tầng hai.
 */
export class Alley {
  private bin!: Vector3;

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    const before = new Set(scene.meshes);
    this.buildGround();
    LEFT.forEach((f, i) => this.facade(f, -1, i));
    RIGHT.forEach((f, i) => this.facade(f, 1, i));
    this.buildWires();
    this.buildProps();
    this.buildLights();
    this.buildNav();
    game.fx.startRain(new Vector3(-HALF, 0, Z_END), new Vector3(HALF, 0, Z_DOOR));

    // Ánh trời đêm xanh lạnh chỉ chiếu vật trong ngõ (không lọt vào nhà); sương mỏng hơn trong nhà
    // để thấy được những vũng đèn vàng nối nhau dọc ngõ.
    const sky = new HemisphericLight("alleySky", new Vector3(0.2, 1, -0.3), scene);
    sky.diffuse = new Color3(0.42, 0.52, 0.66);
    sky.groundColor = new Color3(0.05, 0.06, 0.07);
    sky.specular = Color3.Black();
    sky.intensity = 0.3;
    sky.includedOnlyMeshes = scene.meshes.filter((m) => !before.has(m));
    house.baseFog = 0.075;
    scene.fogDensity = house.baseFog;
  }

  // ---------------------------------------------------------------- tiện ích

  private texMat(name: string, url: string, emissive = 0, alpha = false): StandardMaterial {
    const m = new StandardMaterial(`alley-${name}`, this.scene);
    const t = new Texture(url, this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    t.hasAlpha = alpha;
    m.diffuseTexture = t;
    m.useAlphaFromDiffuseTexture = alpha;
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(emissive, emissive * 0.9, emissive * 0.8);
    if (alpha) m.backFaceCulling = false;
    return m;
  }

  private colorMat(name: string, color: Color3, emissive = 0): StandardMaterial {
    const m = new StandardMaterial(`alley-${name}`, this.scene);
    m.diffuseColor = color;
    m.specularColor = Color3.Black();
    m.emissiveColor = color.scale(emissive);
    return m;
  }

  /** Mặt phẳng dán lên mặt tiền, hướng vào lòng ngõ. side -1 = dãy trái (nhìn +x), 1 = dãy phải. */
  private decal(name: string, w: number, h: number, side: number, z: number, y: number, mat: StandardMaterial, pickable = false): Mesh {
    const p = MeshBuilder.CreatePlane(name, { width: w, height: h }, this.scene);
    p.position = new Vector3(side * (HALF - 0.02), y, z);
    p.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2;
    p.material = mat;
    p.isPickable = pickable;
    return p;
  }

  // ---------------------------------------------------------------- dựng

  private buildGround(): void {
    // Xi măng ướt + vũng nước bóng loáng phản ánh đèn.
    const ground = this.house.box("alleyGround", HALF * 2 + 0.4, 0.2, Z_DOOR - Z_END, new Vector3(0, -0.1, (Z_DOOR + Z_END) / 2), this.house.surface("ceiling", 2, 14, new Color3(0.32, 0.33, 0.33)));
    ground.receiveShadows = true;
    const puddle = new StandardMaterial("alley-puddle", this.scene);
    puddle.diffuseColor = new Color3(0.04, 0.05, 0.06);
    puddle.specularColor = new Color3(0.9, 0.85, 0.75);
    puddle.specularPower = 90;
    for (let i = 0; i < 10; i++) {
      const p = MeshBuilder.CreateDisc("puddle", { radius: 0.3 + Math.random() * 0.6, tessellation: 14 }, this.scene);
      p.scaling.y = 0.4 + Math.random() * 0.4;
      p.rotation.x = Math.PI / 2;
      p.position = new Vector3((Math.random() - 0.5) * 3, 0.005, Z_END + 2 + Math.random() * 30);
      p.material = puddle;
      p.isPickable = false;
    }
    // Đầu ngõ: chắn lại (đường lớn phía sau chìm trong sương), có ánh đèn đường cam mờ.
    const block = this.house.box("alleyMouth", HALF * 2 + 2, 4, 0.2, new Vector3(0, 2, Z_END - 0.1), this.colorMat("mouth", new Color3(0.02, 0.02, 0.02)));
    block.isVisible = false;
  }

  private facade([z0, z1, h, kind]: Facade, side: number, i: number): void {
    const len = z1 - z0;
    const cz = (z0 + z1) / 2;
    const tex = kind === "dark" ? "fence" : i % 2 ? "wall" : "ceiling";
    const tint = kind === "dark" ? new Color3(0.35, 0.37, 0.36) : i % 3 === 0 ? new Color3(0.85, 0.75, 0.55) : new Color3(0.6, 0.62, 0.58);
    const wall = this.house.box(`facade${side}${i}`, 0.4, h, len, new Vector3(side * (HALF + 0.2), h / 2, cz), this.house.surface(tex, Math.max(1, len / 3), h / 3, tint));
    wall.receiveShadows = true;
    // Gờ mái nhỏ nhô ra trên tầng trệt.
    this.house.box(`awning${side}${i}`, 0.5, 0.06, len, new Vector3(side * (HALF - 0.05), 3.0, cz), this.colorMat("awning", new Color3(0.12, 0.08, 0.06))).checkCollisions = false;

    if (kind === "shop") {
      this.decal("shutter", Math.min(2.6, len - 0.6), 2.5, side, cz, 1.25, this.texMat(`shutter${side}${i}`, shutterUrl(`${side}${i}`)));
      const [text, bg, fg] = SIGNS[(i + (side > 0 ? 1 : 0)) % SIGNS.length];
      this.decal("sign", 2.2, 0.55, side, cz, 3.35, this.texMat(`sign${text}`, signUrl(text, bg, fg), 0.06));
    } else if (kind === "neighbor") {
      // Nhà bà Bảy: cửa cuốn kéo lưng chừng, ánh vàng lọt ra dưới chân.
      this.decal("shutter", 2.6, 1.9, side, cz, 1.55, this.texMat(`shutterN`, shutterUrl("n")));
      const glow = this.colorMat("neighborGlow", new Color3(0.95, 0.65, 0.3), 1);
      glow.disableLighting = true;
      this.decal("neighborGlow", 2.6, 0.6, side, cz, 0.3, glow);
      this.house.anchors.set("neighbor", new Vector3(side * (HALF - 0.3), 1.2, cz));
    } else if (kind === "dark") {
      // Nhà số 9: cửa gỗ dán bùa, cửa sổ tầng hai tối om — và một gương mặt đợi sẵn sau kính.
      this.decal("darkDoor", 1.3, 2.2, side, cz + 1, 1.1, this.colorMat("darkDoor", new Color3(0.12, 0.08, 0.05)));
      this.decal("darkTalisman", 0.16, 0.45, side, cz + 0.85, 1.4, this.colorMat("darkTalisman", new Color3(0.6, 0.5, 0.2), 0.08));
      this.decal("plate9", 0.32, 0.2, side, cz + 2, 2.4, this.texMat("plate9", signUrl("SỐ 9", "#1d3a5c", "#dfe5ea"), 0.1));
      const win = this.decal("darkWindow", 1.1, 1.0, side, cz - 0.8, 4.0, this.texMat("darkWindow", barredWindowUrl(false)), true);
      this.house.targets.set("darkWindow", win);
      const face = this.decal("darkFace", 0.42, 0.62, side, cz - 0.8, 4.0, this.texMat("darkFace", windowFaceUrl(), 0.55, true));
      // Nhích ra trước mặt kính (về phía lòng ngõ) để không bị kính che.
      face.position.x -= side * 0.015;
      face.setEnabled(false);
      this.house.targets.set("darkFace", face);
      this.house.anchors.set("darkHouse", new Vector3(side * (HALF - 0.3), 1.5, cz));
    } else {
      const lit = (i + (side > 0 ? 1 : 0)) % 2 === 0;
      this.decal("window", 0.9, 0.9, side, cz, 1.6, this.texMat(`window${lit}`, barredWindowUrl(lit), lit ? 0.35 : 0));
      if (h > 5) this.decal("window2", 0.9, 0.9, side, cz, 4.3, this.texMat(`window${!lit}`, barredWindowUrl(!lit), !lit ? 0.35 : 0));
    }
  }

  /** Dây điện chằng chịt vắt ngang ngõ — đặc sản hẻm Việt. */
  private buildWires(): void {
    const black = this.colorMat("wire", new Color3(0.02, 0.02, 0.02));
    for (let i = 0; i < 18; i++) {
      const z0 = Z_END + 1 + Math.random() * 32;
      const z1 = z0 + (Math.random() - 0.5) * 6;
      const y0 = 3.6 + Math.random() * 1.6;
      const sag = 0.3 + Math.random() * 0.5;
      const pts = [];
      for (let t = 0; t <= 8; t++) {
        const k = t / 8;
        pts.push(new Vector3(-HALF + k * HALF * 2, y0 - Math.sin(k * Math.PI) * sag, z0 + (z1 - z0) * k));
      }
      const tube = MeshBuilder.CreateTube("wire", { path: pts, radius: 0.012, tessellation: 3 }, this.scene);
      tube.material = black;
      tube.isPickable = false;
    }
  }

  private buildProps(): void {
    // Xe máy dựng ven ngõ: hai bánh, thân, yên — chỉ cần bóng dáng trong mưa tối.
    const dark = this.colorMat("bike", new Color3(0.1, 0.1, 0.11));
    const red = this.colorMat("bikeRed", new Color3(0.35, 0.06, 0.05));
    for (const [x, z, color] of [[-1.45, -24.5, red], [1.45, -12.5, dark]] as const) {
      const root = new TransformNode("bike", this.scene);
      root.position = new Vector3(x, 0, z);
      for (const dz of [-0.62, 0.62]) {
        const w = MeshBuilder.CreateTorus("wheel", { diameter: 0.58, thickness: 0.07, tessellation: 14 }, this.scene);
        w.parent = root;
        w.position = new Vector3(0, 0.3, dz);
        w.rotation.z = Math.PI / 2;
        w.material = dark;
      }
      const body = MeshBuilder.CreateBox("bikeBody", { width: 0.28, height: 0.35, depth: 1.1 }, this.scene);
      body.parent = root;
      body.position.y = 0.62;
      body.material = color;
      const seat = MeshBuilder.CreateBox("bikeSeat", { width: 0.26, height: 0.08, depth: 0.6 }, this.scene);
      seat.parent = root;
      seat.position = new Vector3(0, 0.84, -0.15);
      seat.material = dark;
      const bar = MeshBuilder.CreateBox("bikeBar", { width: 0.6, height: 0.04, depth: 0.04 }, this.scene);
      bar.parent = root;
      bar.position = new Vector3(0, 1.0, 0.5);
      bar.material = dark;
      body.checkCollisions = true;
    }

    // Miếu thổ địa nhỏ trên cột ở đầu ngõ, nhang còn cháy.
    const shrineRed = this.colorMat("shrine", new Color3(0.45, 0.08, 0.05));
    this.house.box("shrinePole", 0.1, 1.0, 0.1, new Vector3(1.6, 0.5, -37), this.colorMat("pole", new Color3(0.3, 0.3, 0.3)));
    this.house.box("shrine", 0.5, 0.45, 0.4, new Vector3(1.6, 1.22, -37), shrineRed).checkCollisions = false;
    const roof = this.house.box("shrineRoof", 0.62, 0.06, 0.52, new Vector3(1.6, 1.48, -37), this.colorMat("shrineRoof", new Color3(0.2, 0.1, 0.06)));
    roof.rotation.z = 0.15;
    this.game.fx.addSmoke(new Vector3(1.45, 1.5, -37));
    this.house.anchors.set("alleyShrine", new Vector3(1.6, 1.2, -37));

    // Thùng phi đốt vàng mã giữa ngõ, than còn đỏ.
    this.bin = new Vector3(-1.5, 0, -30.5);
    const bin = MeshBuilder.CreateCylinder("burnBin", { diameter: 0.55, height: 0.7, tessellation: 12 }, this.scene);
    bin.position = this.bin.add(new Vector3(0, 0.35, 0));
    bin.material = this.colorMat("bin", new Color3(0.2, 0.17, 0.14));
    bin.checkCollisions = true;
    this.game.fx.fire(this.bin.add(new Vector3(0, 0.65, 0)), 0.16);
    this.house.anchors.set("burnBin", this.bin.add(new Vector3(0, 0.8, 0)));

    // Trước cửa nhà bà: hai chậu bông (chìa khóa dưới một chậu) và năm đôi dép — nhà chỉ còn bốn người.
    const pot = this.colorMat("pot", new Color3(0.35, 0.18, 0.1));
    const leaf = this.colorMat("leaf", new Color3(0.12, 0.2, 0.08));
    for (const x of [-1.45, 1.45]) {
      const p = MeshBuilder.CreateCylinder("flowerPot", { diameterTop: 0.42, diameterBottom: 0.3, height: 0.38, tessellation: 10 }, this.scene);
      p.position = new Vector3(x, 0.19, -6.9);
      p.material = pot;
      p.checkCollisions = true;
      const bush = MeshBuilder.CreateSphere("bush", { diameter: 0.5, segments: 5 }, this.scene);
      bush.position = new Vector3(x, 0.55, -6.9);
      bush.material = leaf;
      bush.isPickable = false;
      if (x < 0) {
        makeInteractable(p, {
          prompt: () => (this.game.director.has("has_door_key") ? null : "Lật chậu bông"),
          interact: () => {
            p.rotation.z = 0.5;
            p.position.x += 0.15;
            this.game.audio.play("rattle", p.position);
            this.game.hud.subtitle("Chìa khóa nằm dưới chậu, lạnh ngắt.", 3);
            this.game.director.set("has_door_key");
          },
        });
      }
    }
    const sandal = [this.colorMat("sandal1", new Color3(0.15, 0.1, 0.07)), this.colorMat("sandal2", new Color3(0.4, 0.38, 0.33)), this.colorMat("sandal3", new Color3(0.32, 0.08, 0.06))];
    for (let i = 0; i < 5; i++) {
      for (const dx of [-0.07, 0.07]) {
        const s = MeshBuilder.CreateBox("sandal", { width: 0.1, height: 0.02, depth: 0.25 }, this.scene);
        s.position = new Vector3(-0.85 + i * 0.42 + dx, 0.01, -6.55 - (i % 2) * 0.12);
        s.rotation.y = (Math.random() - 0.5) * 0.3;
        s.material = sandal[i % 3];
        s.isPickable = false;
      }
    }
    this.house.anchors.set("gate", new Vector3(0, 0, -8));
    this.house.anchors.set("alleyBehind", new Vector3(0, 0, -39.3));
    this.house.anchors.set("alleyMid", new Vector3(0, 0, -21));
  }

  /** Ba bóng đèn sợi đốt treo giữa ngõ — tắt/chập chờn cùng setLights như đèn trong nhà. */
  private buildLights(): void {
    this.house.addBulb("alleyLight1", new Vector3(0, 3.3, -13), 1.3, false, 9);
    this.house.addBulb("alleyLight2", new Vector3(0.3, 3.3, -25), 1.2, true, 9);
    this.house.addBulb("alleyLight3", new Vector3(-0.4, 3.2, -35.5), 1.15, false, 9);
    const ember = new PointLight("binLight", this.bin.add(new Vector3(0, 1.0, 0)), this.scene);
    ember.diffuse = new Color3(1, 0.5, 0.2);
    ember.specular = Color3.Black();
    ember.intensity = 0.6;
    ember.range = 4;
  }

  /** Điểm dẫn đường dọc ngõ để thực thể đuổi theo (không nối vào trong nhà — cửa chính đóng). */
  private buildNav(): void {
    const ids = ["A0", "A1", "A2", "A3", "A4", "A5"];
    const zs = [-38.5, -32.5, -26.5, -20, -13.5, -8.5];
    ids.forEach((id, i) => this.house.nav.node(id, 0, zs[i], "alley"));
    for (let i = 1; i < ids.length; i++) this.house.nav.link(ids[i - 1], ids[i]);
  }
}
