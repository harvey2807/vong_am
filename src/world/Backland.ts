import { Color3, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "../babylon";
import type { Game } from "../core/Game";
import type { NavGraph } from "../entity/NavGraph";
import { makeInteractable } from "../interaction/Interaction";
import notes from "../data/notes.json";
import type { HidingSpot, House } from "./House";
import { PropKit } from "./PropKit";
import { clothUrl, drownedFaceUrl, jossPaperUrl, roofTileUrl, wreathUrl } from "./decorTextures";

/** Đất sau vườn: x 13.3..42, z −20..14 — ra bằng cổng ở rào đông của vườn. */
const AREA = { x0: 13.3, x1: 42, z0: -20, z1: 14 };
/** Cổng sau trên rào đông của vườn (z −4.7..−3.5). */
export const BACK_GATE = { x: 13.3, z0: -4.7, z1: -3.5 };
const POND = new Vector3(25, 0, -13);
/** Giữa ao sâu (không lội được); vành ngoài tới POND_SHALLOW thì lội được, chậm. */
const POND_DEEP = 4.2;
const POND_SHALLOW = 5.4;
/** Cầu ao: dải ván từ bờ bắc ra tới mép nước sâu. */
const JETTY = { x0: 24.6, x1: 25.4, z0: -8.7, z1: -7.0 };
const SHED = new Vector3(21.5, 0, 7.0);
const GRAVES = new Vector3(35, 0, 3);

/**
 * Phía sau vườn nhà bà — khoảng đất rộng, tối, chỉ có trăng: lối đất xuyên bụi tre, cái ao nơi chú Hải chết đuối
 * năm lên chín (có cầu ao bằng ván), nhà kho cũ (xe đạp của Út, hai cái mễ kê hòm thọ đã trống, bồ lúa trốn được),
 * khu mộ gia đình tường gạch thấp (mộ ông, mộ chú Hải, mộ bà mới đắp còn vòng hoa và nhang), miếu nhỏ, cây gạo chết.
 * Có từ Đêm 2 (khi cửa sau mở được).
 */
export class Backland {
  private readonly kit: PropKit;
  private readonly ripples: Mesh[] = [];
  private readonly flags: TransformNode[] = [];
  private pondFace!: Mesh;
  private graveLight!: PointLight;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    this.kit = new PropKit(scene, "back");
    this.buildGround();
    this.buildGate();
    this.buildPond();
    this.buildShed();
    this.buildGraves();
    this.buildTree();
    this.kit.finish();
    // Trăng ngoài vườn chiếu cả khoảng đất này (đèn hướng chỉ chiếu danh sách mesh của vườn).
    for (const m of this.kit.meshes) house.yard.meshes.push(m);

    house.anchors.set("backGate", new Vector3(BACK_GATE.x, 1.2, (BACK_GATE.z0 + BACK_GATE.z1) / 2));
    house.anchors.set("pond", new Vector3(POND.x, 0.3, POND.z));
    house.anchors.set("pondJetty", new Vector3(25, 1.0, -8.3));
    house.anchors.set("shed", SHED.add(new Vector3(0, 1.2, 0)));
    house.anchors.set("graves", GRAVES.add(new Vector3(0, 1.2, 0)));
    house.anchors.set("graveBa", new Vector3(37.2, 0.6, -0.6));
    house.anchors.set("graveOng", new Vector3(36.3, 0.6, 4.6));
  }

  /** Mép ao: lội được nhưng chậm (cầu ao thì không ướt chân). */
  inWater(x: number, z: number): boolean {
    if (x > JETTY.x0 && x < JETTY.x1 && z > JETTY.z0 - 0.2 && z < JETTY.z1 + 0.3) return false;
    const d = Math.hypot(x - POND.x, z - POND.z);
    return d < POND_SHALLOW && d > POND_DEEP - 0.5;
  }

  // ---------------------------------------------------------------- dựng

  private buildGround(): void {
    const k = this.kit;
    const w = AREA.x1 - AREA.x0;
    const d = AREA.z1 - AREA.z0;
    const mud = this.house.surface("mud", w / 3, d / 3, new Color3(0.42, 0.42, 0.36));
    k.box("Ground", w, 0.2, d, new Vector3((AREA.x0 + AREA.x1) / 2, -0.1, (AREA.z0 + AREA.z1) / 2), mud, { solid: true });
    // Lối đất nện sáng hơn: cổng → ngã ba → nhà kho / khu mộ / bờ ao.
    const path = this.house.surface("mud", 1, 3, new Color3(0.62, 0.56, 0.45));
    const segs: [number, number, number, number][] = [
      [13.4, -4.1, 18, -4],
      [18, -4, 20.5, 1],
      [20.5, 1, 21.5, 5],
      [18, -4, 28, -3],
      [28, -3, 31, 3],
      [18, -4, 24, -6.6],
    ];
    for (const [ax, az, bx, bz] of segs) {
      const len = Math.hypot(bx - ax, bz - az);
      k.box("Path", 1.2, 0.01, len + 0.6, new Vector3((ax + bx) / 2, 0.006, (az + bz) / 2), path, { rot: [0, Math.atan2(bx - ax, bz - az), 0] });
    }
    // Bụi tre bao quanh: thân mảnh, tán đen kịt — và tường vô hình để không đi ra ngoài bản đồ.
    const stalk = k.color("bamboo", new Color3(0.13, 0.17, 0.08));
    const leaves = k.color("bambooLeaf", new Color3(0.05, 0.08, 0.04));
    const clump = (x: number, z: number) => {
      for (let i = 0; i < 5; i++) {
        const h = 5 + Math.random() * 4;
        k.cyl("BambooStalk", 0.1, 0.1, h, new Vector3(x + (Math.random() - 0.5) * 1.2, h / 2, z + (Math.random() - 0.5) * 1.2), stalk, {
          sides: 5,
          rot: [(Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25],
        });
      }
      k.sphere("BambooTop", 3.2, new Vector3(x, 7 + Math.random(), z), leaves);
    };
    for (let x = AREA.x0 + 1; x < AREA.x1; x += 3) {
      clump(x, AREA.z0 + 0.8);
      clump(x, AREA.z1 - 0.8);
    }
    for (let z = AREA.z0 + 3; z < AREA.z1 - 1; z += 3) clump(AREA.x1 - 0.8, z);
    // Dọc rào vườn (x 13.3) chỉ trồng tre ngoài khoảng rào của vườn.
    for (const z of [-18, -15, -12, 6, 9, 12]) clump(AREA.x0 + 1.2, z);
    const bound = (x: number, z: number, wx: number, dz: number) => {
      const b = MeshBuilder.CreateBox("backBound", { width: wx, height: 4, depth: dz }, this.scene);
      b.position.set(x, 2, z);
      b.isVisible = false;
      b.isPickable = false;
      b.checkCollisions = true;
    };
    bound(AREA.x1, (AREA.z0 + AREA.z1) / 2, 1, d);
    bound((AREA.x0 + AREA.x1) / 2, AREA.z0, w, 1);
    bound((AREA.x0 + AREA.x1) / 2, AREA.z1, w, 1);
    bound(AREA.x0, (AREA.z0 - 9.15) / 2, 0.6, -9.15 - AREA.z0);
    bound(AREA.x0, (AREA.z1 + 3.15) / 2, 0.6, AREA.z1 - 3.15);
  }

  private buildGate(): void {
    const g = BACK_GATE;
    const door = this.house.door("backGate", new Vector3(g.x, 0, g.z0), new Vector3(0, 1.0, (g.z1 - g.z0) / 2), [0.08, 2.0, g.z1 - g.z0], Math.PI * 0.5);
    door.leaf.material = this.house.surface("wood", 1, 2, new Color3(0.42, 0.32, 0.24));
    makeInteractable(door.leaf, {
      prompt: () => (door.open ? "Đóng cổng sau" : "Mở cổng sau"),
      interact: () => {
        door.toggle();
        this.game.audio.play("creak", new Vector3(g.x, 1.2, (g.z0 + g.z1) / 2));
        if (door.open) this.game.director.set("gate_opened");
      },
    });
  }

  private buildPond(): void {
    const k = this.kit;
    // Mặt ao: đen, bóng dưới trăng.
    const water = new StandardMaterial("backWater", this.scene);
    water.diffuseColor = new Color3(0.02, 0.035, 0.035);
    water.specularColor = new Color3(0.55, 0.6, 0.65);
    water.specularPower = 80;
    const surface = MeshBuilder.CreateDisc("backPond", { radius: POND_SHALLOW, tessellation: 40 }, this.scene);
    surface.rotation.x = Math.PI / 2;
    surface.position.set(POND.x, 0.015, POND.z);
    surface.material = water;
    surface.isPickable = false;
    k.meshes.push(surface);
    this.house.targets.set("pondWater", surface);
    // Giữa ao sâu: chặn lại (người chơi chỉ lội được mép ao).
    const deep = MeshBuilder.CreateCylinder("backPondDeep", { diameter: POND_DEEP * 2, height: 3, tessellation: 24 }, this.scene);
    deep.position.set(POND.x, 1.5, POND.z);
    deep.isVisible = false;
    deep.isPickable = false;
    deep.checkCollisions = true;
    // Bèo tây và lau sậy quanh bờ.
    const weed = k.color("weed", new Color3(0.08, 0.14, 0.07));
    const reed = k.color("reed", new Color3(0.22, 0.26, 0.12));
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = POND_DEEP - 1 + Math.random() * 2.2;
      k.cyl("Hyacinth", 0.5, 0.5, 0.02, new Vector3(POND.x + Math.cos(a) * r, 0.02, POND.z + Math.sin(a) * r), weed, { sides: 7 });
    }
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      // Chừa khoảng bờ trước cầu ao.
      if (Math.abs(a - Math.PI / 2) < 0.25) continue;
      const r = POND_SHALLOW - 0.2 + Math.random() * 0.8;
      const h = 0.8 + Math.random() * 0.9;
      k.cyl("Reed", 0.015, 0.025, h, new Vector3(POND.x + Math.cos(a) * r, h / 2, POND.z + Math.sin(a) * r), reed, {
        sides: 3,
        rot: [(Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4],
      });
    }
    // Cầu ao: ván gỗ trên bốn cọc, ba bậc thấp dần xuống nước.
    const plank = this.house.surface("wood", 1, 2, new Color3(0.45, 0.36, 0.27));
    const j = JETTY;
    k.box("Jetty", j.x1 - j.x0, 0.06, j.z1 - j.z0, new Vector3((j.x0 + j.x1) / 2, 0.12, (j.z0 + j.z1) / 2), plank);
    for (const [x, z] of [[j.x0 + 0.05, j.z0], [j.x1 - 0.05, j.z0], [j.x0 + 0.05, j.z1], [j.x1 - 0.05, j.z1]]) {
      k.cyl("Pile", 0.08, 0.08, 0.6, new Vector3(x, -0.1, z), plank);
    }
    for (let i = 0; i < 3; i++) k.box("JettyStep", j.x1 - j.x0, 0.05, 0.25, new Vector3((j.x0 + j.x1) / 2, 0.06 - i * 0.07, j.z0 - 0.15 - i * 0.25), plank);
    // Gợn nước (tăng lên khi có gì đó dưới ao).
    for (let i = 0; i < 3; i++) {
      // Mỗi vòng một vật liệu riêng để mờ dần lệch nhịp.
      const ripple = new StandardMaterial(`backRipple${i}`, this.scene);
      ripple.diffuseColor = new Color3(0.4, 0.45, 0.5);
      ripple.emissiveColor = new Color3(0.12, 0.14, 0.15);
      ripple.specularColor = Color3.Black();
      ripple.alpha = 0;
      const r = MeshBuilder.CreateTorus("backRipple", { diameter: 0.6, thickness: 0.015, tessellation: 24 }, this.scene);
      r.position.set(25, 0.03, -10.2);
      r.material = ripple;
      r.isPickable = false;
      this.ripples.push(r);
    }
    // Gương mặt dưới nước (ẩn — kịch bản bật lên trong tích tắc).
    const faceMat = new StandardMaterial("backDrowned", this.scene);
    const t = new Texture(drownedFaceUrl(), this.scene, false, true, Texture.BILINEAR_SAMPLINGMODE);
    t.hasAlpha = true;
    faceMat.diffuseTexture = t;
    faceMat.useAlphaFromDiffuseTexture = true;
    faceMat.emissiveColor = new Color3(0.35, 0.4, 0.38);
    faceMat.specularColor = Color3.Black();
    faceMat.backFaceCulling = false;
    this.pondFace = MeshBuilder.CreatePlane("backPondFace", { width: 0.42, height: 0.56 }, this.scene);
    this.pondFace.rotation.x = Math.PI / 2;
    this.pondFace.position.set(25, 0.025, -9.6);
    this.pondFace.material = faceMat;
    this.pondFace.isPickable = false;
    this.pondFace.setEnabled(false);
    this.house.targets.set("pondFace", this.pondFace);
  }

  private buildShed(): void {
    const k = this.kit;
    const c = SHED;
    const brick = this.house.surface("brick", 2, 1, new Color3(0.62, 0.55, 0.48));
    const W = 4;
    const D = 3.5;
    const H = 2.4;
    // Tường gạch, cửa trống phía nam (lối đất đi tới).
    k.box("ShedWall", W, H, 0.15, new Vector3(c.x, H / 2, c.z + D / 2), brick, { solid: true });
    k.box("ShedWall", 0.15, H, D, new Vector3(c.x - W / 2, H / 2, c.z), brick, { solid: true });
    k.box("ShedWall", 0.15, H, D, new Vector3(c.x + W / 2, H / 2, c.z), brick, { solid: true });
    k.box("ShedWall", 1.5, H, 0.15, new Vector3(c.x - 1.25, H / 2, c.z - D / 2), brick, { solid: true });
    k.box("ShedWall", 1.5, H, 0.15, new Vector3(c.x + 1.25, H / 2, c.z - D / 2), brick, { solid: true });
    k.box("ShedLintel", 1.0, 0.4, 0.15, new Vector3(c.x, H - 0.2, c.z - D / 2), brick, { solid: true });
    // Mái tôn gỉ, dốc về phía sau.
    const tin = k.color("tin", new Color3(0.35, 0.3, 0.26), 0.02);
    k.box("ShedRoof", W + 0.6, 0.05, D + 0.8, new Vector3(c.x, H + 0.25, c.z), tin, { rot: [-0.14, 0, 0] });
    const floor = this.house.surface("mud", 2, 2, new Color3(0.32, 0.3, 0.25));
    k.box("ShedFloor", W, 0.02, D, new Vector3(c.x, 0.01, c.z), floor);
    // Rơm rạ, nông cụ treo tường.
    const straw = k.color("straw", new Color3(0.5, 0.42, 0.2), 0.04);
    k.sphere("Straw", 1.6, new Vector3(c.x + 1.2, 0.1, c.z + 1.1), straw).scaling.y = 0.45;
    const tool = k.color("tool", new Color3(0.2, 0.17, 0.13));
    for (const [x, rot] of [[-1.4, 0.1], [-1.0, -0.15], [-0.6, 0.05]]) {
      k.cyl("ToolHandle", 0.035, 0.035, 1.4, new Vector3(c.x + x, 1.3, c.z + D / 2 - 0.12), tool, { rot: [0, 0, rot] });
    }
    // Xe đạp Phượng Hoàng của Út — dựa tường tây.
    const bikeAt = new Vector3(c.x - 1.65, 0, c.z - 0.2);
    const black = k.color("bikeBlack", new Color3(0.07, 0.07, 0.07));
    for (const dz of [-0.5, 0.5]) k.torus("BikeWheel", 0.62, 0.03, bikeAt.add(new Vector3(0, 0.32, dz)), black, { rot: [0, 0, Math.PI / 2 - 0.08] });
    const frame = k.box("BikeFrame", 0.04, 0.04, 0.95, bikeAt.add(new Vector3(0.03, 0.55, 0)), k.color("bikeGreen", new Color3(0.12, 0.25, 0.18)), { keep: true });
    k.box("BikeSeat", 0.12, 0.05, 0.22, bikeAt.add(new Vector3(0.03, 0.82, -0.25)), black);
    k.box("BikeBars", 0.45, 0.03, 0.03, bikeAt.add(new Vector3(0.03, 0.9, 0.45)), black);
    frame.isPickable = true;
    makeInteractable(frame, {
      prompt: () => "Xe đạp cũ",
      interact: () =>
        this.game.hud.subtitle("Chiếc Phượng Hoàng hồi lớp Năm của mình. Mất cái dây khóa số —\nà, bà lấy quấn quanh hộp bánh quy rồi.", 5),
    });
    // Hai cái mễ kê hòm thọ — trống. Trên nền đất còn in vệt chữ nhật sạch bụi.
    const wood = this.house.surface("wood", 1, 1, new Color3(0.4, 0.3, 0.22));
    const trestles: Mesh[] = [];
    for (const dz of [-0.75, 0.75]) {
      const t = k.box("Trestle", 0.9, 0.06, 0.12, new Vector3(c.x + 0.6, 0.55, c.z - 0.2 + dz), wood, { keep: true });
      trestles.push(t);
      for (const dx of [-0.38, 0.38]) k.box("TrestleLeg", 0.05, 0.55, 0.05, new Vector3(c.x + 0.6 + dx, 0.27, c.z - 0.2 + dz), wood);
    }
    k.box("CoffinMark", 0.7, 0.003, 2.0, new Vector3(c.x + 0.6, 0.024, c.z - 0.2), k.color("cleanDirt", new Color3(0.45, 0.42, 0.35)));
    for (const t of trestles) {
      t.isPickable = true;
      makeInteractable(t, {
        prompt: () => "Hai cái mễ kê hòm",
        interact: () =>
          this.game.hud.subtitle("Hai cái mễ kê hòm cũ của tiệm ông, bỏ xó sau vườn.\nGỗ còn thơm mùi sơn ta, như mới đóng hôm qua.", 5),
      });
    }
    // Bồ lúa đan tre: chỗ trốn ngoài trời.
    const weave = k.color("weave", new Color3(0.45, 0.36, 0.2), 0.03);
    const bin = k.cyl("RiceBin", 1.1, 1.0, 1.3, new Vector3(c.x + 1.3, 0.65, c.z - 0.9), weave, { solid: true, keep: true, sides: 14 });
    const spot: HidingSpot = {
      inside: new Vector3(c.x + 1.3, 1.25, c.z - 0.9),
      insideYaw: Math.PI,
      outside: new Vector3(c.x + 0.4, 1.6, c.z - 1.3),
      outsideYaw: Math.PI,
      front: new Vector3(c.x + 0.3, 0, c.z - 1.3),
    };
    makeInteractable(bin, {
      prompt: () => (this.game.director.has("ending") ? null : this.house.dangerous ? "Chui vào bồ lúa" : "Bồ lúa"),
      interact: () => {
        if (!this.house.dangerous) {
          this.game.hud.subtitle("Bồ lúa trống, chỉ còn trấu. Hồi nhỏ chơi trốn tìm, mình hay chui vô đây.", 4);
          return;
        }
        this.game.hide(spot);
      },
    });
  }

  private buildGraves(): void {
    const k = this.kit;
    const c = GRAVES;
    const brick = this.house.surface("brick", 3, 0.4, new Color3(0.6, 0.55, 0.5));
    // Tường gạch thấp 8×7, lối vào phía tây.
    k.box("GraveWall", 0.25, 0.7, 7, new Vector3(c.x + 4, 0.35, c.z), brick, { solid: true });
    k.box("GraveWall", 8, 0.7, 0.25, new Vector3(c.x, 0.35, c.z + 3.5), brick, { solid: true });
    k.box("GraveWall", 8, 0.7, 0.25, new Vector3(c.x, 0.35, c.z - 3.5), brick, { solid: true });
    k.box("GraveWall", 0.25, 0.7, 2.9, new Vector3(c.x - 4, 0.35, c.z + 2.05), brick, { solid: true });
    k.box("GraveWall", 0.25, 0.7, 2.9, new Vector3(c.x - 4, 0.35, c.z - 2.05), brick, { solid: true });
    const stone = this.house.surface("fence", 1, 1, new Color3(0.6, 0.62, 0.58));
    const tile = this.house.surface("brick", 1, 1, new Color3(0.55, 0.5, 0.48));
    const tomb = (name: string, x: number, z: number, len: number, note: keyof typeof notes, prompt: string) => {
      k.box(`${name}Tomb`, len, 0.5, 1.0, new Vector3(x + len / 2 - 0.3, 0.25, z), tile, { solid: true });
      // Bia đá đứng ở đầu mộ phía tây, mặt nhìn ra lối vào.
      const stele = k.box(`${name}Stele`, 0.12, 0.85, 0.65, new Vector3(x - 0.35, 0.65, z), stone, { solid: true, keep: true });
      makeInteractable(stele, {
        prompt: () => prompt,
        interact: () => {
          this.game.openNote(notes[note] as (typeof notes)["steleOng"]);
          this.game.director.set(`read_${note}`);
        },
      });
    };
    tomb("Ong", 35.9, 4.6, 2.0, "steleOng", "Đọc bia mộ ông");
    tomb("Hai", 35.9, 1.8, 1.3, "steleHai", "Đọc bia mộ chú Hải");
    // Bát nhang trên mộ ông (Đêm 2: mảnh chén thứ hai nằm trong đó).
    const bronze = k.color("bronze", new Color3(0.32, 0.26, 0.14));
    // Bát nhang đặt trên bệ đá nhỏ TRƯỚC bia (phía lối vào), như mộ thật — không bị bia che.
    k.box("OngAltarStone", 0.4, 0.4, 0.5, new Vector3(35.15, 0.2, 4.6), stone, { solid: true });
    const bowl = k.cyl("OngIncense", 0.2, 0.14, 0.12, new Vector3(35.15, 0.46, 4.6), bronze, { keep: true });
    bowl.isPickable = true;
    makeInteractable(bowl, {
      prompt: () => {
        if (this.house.night !== 2) return "Bát nhang mộ ông";
        return this.game.director.has("shard_grave") ? null : this.game.director.has("read_uncle_note") ? "Lục bát nhang mộ ông" : "Bát nhang mộ ông";
      },
      interact: () => {
        if (this.house.night === 2 && this.game.director.has("read_uncle_note")) {
          this.game.audio.play("rattle", bowl.position);
          this.house.collect("grave", "Mảnh thứ hai, vùi trong tro nhang trên mộ ông. Tro còn ấm —\nnhư vừa có người thắp ở đây, ngay trước khi mình tới.");
          return;
        }
        this.game.hud.subtitle("Tro nhang trên mộ ông. Còn ấm.", 3);
      },
    });
    // Mộ bà: đất mới đắp, vòng hoa, phướn trắng, tấm bảng gỗ tạm, nhang còn cháy.
    const earth = this.house.surface("mud", 1, 1, new Color3(0.5, 0.4, 0.3));
    const mound = k.sphere("BaMound", 1.0, new Vector3(37.2, 0.05, -0.6), earth, { keep: true });
    mound.scaling.set(2.6, 0.55, 1.3);
    mound.checkCollisions = true;
    const wreath = k.tex("wreath", wreathUrl(), { alpha: true, emissive: 0.08 });
    for (const [x, z, yaw] of [[35.7, -1.6, -0.6], [35.6, 0.3, -2.4]]) {
      k.plane("Wreath", 0.85, 1.06, new Vector3(x, 0.55, z), wreath, { rot: [0, yaw, 0] });
    }
    const cloth = k.tex("cloth", clothUrl(), { emissive: 0.1 });
    for (const [x, z] of [[38.6, -1.6], [38.6, 0.4]]) {
      k.cyl("FlagPole", 0.03, 0.03, 2.2, new Vector3(x, 1.1, z), k.color("pole", new Color3(0.4, 0.35, 0.2)));
      const pivot = new TransformNode("backFlag", this.scene);
      pivot.position.set(x, 2.1, z);
      const f = MeshBuilder.CreatePlane("backFlagCloth", { width: 0.2, height: 1.1 }, this.scene);
      f.parent = pivot;
      f.position.set(0.1, -0.55, 0);
      f.material = cloth;
      cloth.backFaceCulling = false;
      f.isPickable = false;
      k.meshes.push(f);
      this.flags.push(pivot);
    }
    const board = k.box("BaBoard", 0.04, 0.6, 0.35, new Vector3(36.05, 0.45, -0.6), this.house.surface("wood", 1, 1, new Color3(0.6, 0.5, 0.38)), {
      solid: true,
      keep: true,
    });
    makeInteractable(board, {
      prompt: () => "Tấm bảng gỗ trên mộ bà",
      interact: () => {
        this.game.openNote(notes.graveBa);
        this.game.director.set("read_graveBa");
      },
    });
    const pot = k.cyl("BaIncense", 0.16, 0.12, 0.12, new Vector3(35.5, 0.06, -0.6), bronze, { keep: true });
    pot.isPickable = true;
    const tip = k.color("ember", new Color3(1, 0.35, 0.1), 1);
    tip.disableLighting = true;
    for (let i = 0; i < 3; i++) k.cyl("BaStick", 0.006, 0.006, 0.3, new Vector3(35.5 + (i - 1) * 0.025, 0.27, -0.6), k.color("stick", new Color3(0.5, 0.15, 0.1)));
    for (let i = 0; i < 3; i++) k.sphere("BaTip", 0.015, new Vector3(35.5 + (i - 1) * 0.025, 0.42, -0.6), tip);
    this.game.fx.addSmoke(new Vector3(35.5, 0.43, -0.6));
    this.graveLight = new PointLight("backGraveLight", new Vector3(35.6, 0.7, -0.6), this.scene);
    this.graveLight.diffuse = new Color3(1, 0.4, 0.15);
    this.graveLight.specular = Color3.Black();
    this.graveLight.range = 3.5;
    this.graveLight.intensity = 0.55;
    let lit = false;
    makeInteractable(pot, {
      prompt: () => (lit ? null : "Thắp thêm nhang cho bà"),
      interact: () => {
        lit = true;
        this.game.audio.play("click", pot.position);
        this.game.director.set("incense_grave");
        this.graveLight.intensity = 0.9;
        this.game.hud.subtitle("Con về rồi nè bà.", 3.5);
      },
    });
    const joss = k.tex("joss", jossPaperUrl(), { emissive: 0.05 });
    for (let i = 0; i < 30; i++) {
      k.plane("Joss", 0.14, 0.14, new Vector3(c.x - 3 + Math.random() * 6.5, 0.012 + i * 0.0002, c.z - 3 + Math.random() * 6), joss, {
        rot: [Math.PI / 2, Math.random() * Math.PI, 0],
      });
    }
    // Miếu nhỏ ở góc: nhà thờ con sơn đỏ trên trụ, có ngọn đèn cầy.
    const red = k.color("shrineRed", new Color3(0.5, 0.08, 0.05), 0.08);
    k.box("ShrinePillar", 0.2, 1.0, 0.2, new Vector3(38.5, 0.5, 5.6), stone, { solid: true });
    k.box("Shrine", 0.6, 0.5, 0.45, new Vector3(38.5, 1.25, 5.6), red);
    k.box("ShrineRoof", 0.75, 0.06, 0.6, new Vector3(38.5, 1.53, 5.6), k.tex("shrineTile", roofTileUrl()), { rot: [0, 0, 0] });
    const candle = k.color("candleFlame", new Color3(1, 0.6, 0.2), 1);
    candle.disableLighting = true;
    k.sphere("ShrineFlame", 0.03, new Vector3(38.3, 1.15, 5.6), candle);
  }

  /** Cây gạo chết ngoài góc khu mộ — dân gian nói cây gạo là chỗ ma ở. */
  private buildTree(): void {
    const k = this.kit;
    const bark = k.color("bark", new Color3(0.16, 0.14, 0.12));
    const base = new Vector3(39.5, 0, 9.5);
    k.cyl("TreeTrunk", 0.6, 1.1, 7, base.add(new Vector3(0, 3.5, 0)), bark, { solid: true, sides: 9 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
      const h = 4 + Math.random() * 3;
      const len = 2 + Math.random() * 2.5;
      k.cyl("TreeBranch", 0.06, 0.22, len, base.add(new Vector3(Math.cos(a) * len * 0.4, h + 0.6, Math.sin(a) * len * 0.4)), bark, {
        sides: 5,
        rot: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9],
      });
    }
  }

  // ---------------------------------------------------------------- điểm dẫn đường, kịch bản

  buildNav(nav: NavGraph): void {
    nav
      .node("G0", 12.4, -4.1, "yard")
      .node("G1", 14.3, -4.1, "backland")
      .node("P0", 18, -4, "backland", true)
      .node("P1", 20.5, 1, "backland")
      .node("P2", 21.5, 4.6, "shed")
      .node("P3", 22.3, 6.6, "shed", true)
      .node("P4", 28, -3, "backland", true)
      .node("P5", 30.4, 3, "graves")
      .node("P6", 33.6, 3, "graves", true)
      .node("P7", 24, -6.8, "pond", true)
      .node("P8", 19.2, -10, "pond")
      .link("Y2", "G0")
      .link("G0", "G1", "backGate")
      .link("G1", "P0")
      .link("P0", "P1")
      .link("P1", "P2")
      .link("P2", "P3")
      .link("P0", "P4")
      .link("P4", "P5")
      .link("P5", "P6")
      .link("P0", "P7")
      .link("P4", "P7")
      .link("P7", "P8");
  }

  beat(name: string): boolean {
    switch (name) {
      case "pondRipple":
        this.rippleT = 0;
        return true;
      case "graveIncenseOut":
        this.graveLight.intensity = 0;
        return true;
    }
    return false;
  }

  private rippleT = -1;

  update(dt: number): void {
    this.time += dt;
    this.flags.forEach((f, i) => (f.rotation.z = Math.sin(this.time * 1.4 + i * 2) * 0.12));
    if (this.graveLight.intensity > 0) this.graveLight.intensity = Math.max(0.4, this.graveLight.intensity + (Math.random() - 0.5) * 0.08);
    // Gợn nước: ba vòng loang rộng dần rồi tan, sau đó lặng như chưa có gì.
    if (this.rippleT >= 0) {
      this.rippleT += dt;
      this.ripples.forEach((r, i) => {
        const t = Math.max(0, this.rippleT - i * 0.6);
        r.scaling.setAll(1 + t * 2.2);
        (r.material as StandardMaterial).alpha = t > 0 ? Math.max(0, 0.5 - t * 0.18) : 0;
      });
      if (this.rippleT > 5) this.rippleT = -1;
    }
    this.pondFace.rotation.y = Math.sin(this.time * 0.5) * 0.05;
  }
}
