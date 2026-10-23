import {
  AbstractMesh,
  Color3,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from "../babylon";
import type { LightState, TvState } from "../director/types";
import type { Game } from "../core/Game";
import type { Surface } from "../audio/AudioSystem";
import { comfort } from "../core/Settings";
import { makeInteractable } from "../interaction/Interaction";
import { NavGraph } from "../entity/NavGraph";
import notes from "../data/notes.json";
import { allRelicsFound, foundRelics, markRelic, RELICS } from "../core/relics";
import { relicPaperUrl } from "./paperTextures";
import { gioListUrl } from "./decorTextures";
import { drawEntityFace, drawPhoto, portraitsReady, tileUrl } from "./textures";
import { Decor } from "./Decor";
import { Funeral } from "./Funeral";
import { Yard } from "./Yard";
import { Alley } from "./Alley";
import { Fields } from "./Fields";
import { PhucKy } from "./PhucKy";
import { Backland } from "./Backland";
import { Coffins } from "./Coffins";
import { Past } from "./Past";
import { Clues } from "./Clues";
import { FLOOR1_Y, STAIR_HOLE, type Stair } from "./floors";

const WALL_H = 3;
const WALL_T = 0.2;
const DOOR_H = 2.2;

/**
 * Khóa số quanh hộp bánh quy (Đêm 1): ngày giỗ ông theo âm lịch, ngày trước tháng sau.
 * Ông mất sáng hôm sau đêm Rằm tháng Bảy → 16/7. Các mã "gần đúng" có câu phản hồi riêng (xem tryTinCode).
 */
const SKY_NIGHT = new Color3(0.035, 0.045, 0.065);
const SKY_INDOOR = new Color3(0.012, 0.012, 0.016);
const TIN_CODE = "1607";
const TIN_POS = new Vector3(5.45, 0.95, -2.2);
/** Đêm 1: giây đứng yên châm mỗi nén nhang (ba nén). */
const INCENSE_TIME = 1.6;
/** Ngày giỗ người khác trong nhà — có trong tờ giấy hồng điều, dễ nhầm. */
const OTHER_GIO = ["2212", "0302", "0805"];

const PHOTO_CAPTIONS: Record<number, string> = {
  4: "Ảnh chụp cả nhà năm 2003. Ông, bà, mẹ… và Út — là mình hồi sáu tuổi.",
  5: "…Năm người?\nNgười đứng phía sau trước đây không có trong ảnh. Gương mặt đó… giống hệt mình bây giờ.",
  6: "Cả bốn người trong ảnh đã quay lưng lại.\nChỉ còn người thứ năm nhìn thẳng ra ngoài.",
  7: "Đủ năm người. Không ai còn mặt — kể cả mình.",
};

/** Chỗ trốn: vị trí camera bên trong/khi bước ra, và chỗ thực thể đứng khi lục soát. */
export interface HidingSpot {
  inside: Vector3;
  insideYaw: number;
  /** Ngước/cúi khi ở trong (nằm trong hòm thì nhìn lên nắp). */
  insidePitch?: number;
  outside: Vector3;
  outsideYaw: number;
  front: Vector3;
  /** Khung nhìn khi trốn: khe tủ (mặc định), khe nắp hòm, dưới khăn bàn thờ, hoặc đang được bế. */
  kind?: "wardrobe" | "coffin" | "altar" | "held";
  /** Chữ gợi ý để ra ngoài; null = không ra được (kịch bản giữ lại). */
  exit?: string | null;
}

interface Bulb {
  light: PointLight;
  mesh: Mesh;
  base: number;
  flickery: boolean;
}

export class Door {
  open = false;
  private angle = 0;

  constructor(
    readonly pivot: TransformNode,
    readonly leaf: Mesh,
    private readonly openAngle: number,
  ) {}

  toggle(): void {
    this.open = !this.open;
  }

  update(dt: number): void {
    const target = this.open ? this.openAngle : 0;
    this.angle += (target - this.angle) * Math.min(1, dt * 3);
    this.pivot.rotation.y = this.angle;
  }
}

/**
 * Bố cục (nhìn từ trên xuống, z hướng lên):
 *
 *   z=6  ┌──────────┬────┬──────────┐
 *        │ phòng    │    │ phòng    │
 *        │ khách  ▯ ╎    ╏ ngủ của  │   ▯ bàn thờ  ╎ lối mở  ╏ cửa có khóa
 *        │ (bàn thờ)│ h  │ bà       │
 *   z=0  ├──────────┤ à  ├──────────┤
 *        │ (kín)    │ n  ╎ bếp      │
 *        │          │ h  │          │
 *        │          │ h  │          ▯ cửa sau → vườn (giếng, bụi chuối) x 6..13
 *   z=-6 └──────────┴─▭──┴──────────┘   ▭ cửa chính
 *      x=-7       x=-1  x=1        x=6
 */
export class House {
  readonly anchors = new Map<string, Vector3>();
  readonly targets = new Map<string, AbstractMesh>();
  readonly nav = new NavGraph();
  readonly night: number;
  /** Chương hồi tưởng (năm 2003): chưa có đám tang, tiệm còn mở, bước chân là tiếng giấy. */
  readonly past: boolean;
  /** Mật độ sương khi đèn sáng (ngoài ngõ mỏng hơn trong nhà). */
  baseFog = 0.14;
  photoVariant = 4;
  decor!: Decor;
  funeral?: Funeral;
  coffins?: Coffins;
  pastScene?: Past;
  fields?: Fields;
  yard!: Yard;

  private readonly materials = new Map<string, StandardMaterial>();
  private readonly doors = new Map<string, Door>();
  private readonly bulbs: Bulb[] = [];
  private hemi!: HemisphericLight;
  private altarLight!: PointLight;
  private moonlight!: PointLight;
  private altarLamps: Mesh[] = [];
  private incenseTips: Mesh[] = [];
  /** Đêm 1: số nén đã thắp (0..3), và giây còn lại của nén đang châm. */
  private sticksLit = 0;
  private lighting = 0;
  private photoTex!: DynamicTexture;
  private tvTex!: DynamicTexture;
  private tvLight!: PointLight;
  private tvState: TvState = "off";
  private tvTick = 0;
  /** Giây đèn còn sáng sau khi bật cầu dao (đêm 4); hết thì "nó" cắt điện. */
  private powerTime = 0;
  private powerCut = 0;
  private shards = 0;
  private placedBowl?: Mesh;
  private lightMode: LightState = "on";
  private flickerTime = 0;
  private flickerTick = 0;
  /** Giây còn lại của "stutter": chỉ bóng đèn bếp giật. */
  private stutterTime = 0;
  private time = 0;
  /** Số lần thử sai khóa số hộp bánh quy — gợi ý rõ dần. */
  private tinTries = 0;
  /** Đồng hồ quả lắc ngừng (Game đặt khi căn nhà hết yên). */
  clockStopped = false;
  /** Cầu thang (Player nâng camera theo bậc; thực thể leo theo đường này). */
  readonly stairs: Stair[] = [];
  /** Tiệm Phúc Ký + gác kho đồ mã (mọi đêm trong nhà). */
  phucKy?: PhucKy;
  /** Đất sau vườn: ao, nhà kho, khu mộ (từ Đêm 2, khi cửa sau mở được). */
  backland?: Backland;

  constructor(
    private readonly scene: Scene,
    private readonly game: Game,
  ) {
    this.night = game.level.id;
    this.past = !!game.level.past;
    this.buildShell();
    this.buildLights();
    this.buildHallway();
    this.buildLivingRoom();
    this.buildBedroom();
    this.buildKitchen();
    this.buildTv();
    if (this.night === 2) this.buildNightTwo();
    if (this.night >= 3 && !this.past) this.buildNightThree();
    // Năm 2003: tủ áo chưa dán bùa, lịch bloc năm 2024 chưa có, chưa có đám tang.
    this.decor = new Decor(scene, this, game.audio, this.past ? 1 : this.night);
    if (this.past) this.scene.getMeshByName("calendar")?.setEnabled(false);
    else this.makeCalendarReadable();
    if (!this.past) this.funeral = new Funeral(scene, this.night);
    if (this.night === 0) new Alley(scene, this, game);
    if (this.night === 2.5) this.fields = new Fields(scene, this, game);
    if (this.night >= 4) this.buildNightFour();
    this.yard = new Yard(scene, this, game);
    if (this.night !== 2.5) this.phucKy = new PhucKy(scene, this, game);
    if (this.night !== 2.5) this.coffins = new Coffins(scene, this, game);
    if (this.past) this.pastScene = new Past(scene, this, game);
    if (this.night >= 1 && this.night !== 2.5 && !this.past) new Clues(scene, this, game);
    if (this.night >= 2 && this.night !== 2.5 && !this.past) this.backland = new Backland(scene, this, game);
    this.placeRelics();
    this.buildNav();
    for (const m of this.materials.values()) m.maxSimultaneousLights = 8;

    this.anchors.set("frontDoor", new Vector3(0, 1.5, -6.6));
    this.anchors.set("bedroomInside", new Vector3(3.6, 1.4, 4.2));
    this.anchors.set("altar", new Vector3(-6.3, 1.4, 3));
    this.anchors.set("hallEnd", new Vector3(0, 0, -3.6));
    this.anchors.set("kitchen", new Vector3(3.6, 1.2, -4.6));
    // Góc tường trên bàn thờ — chỗ con thạch sùng "chặc lưỡi" sau khi đọc lời bà dặn.
    this.anchors.set("altarWall", new Vector3(-6.8, 2.6, 4.6));
    this.anchors.set("kitchenTin", TIN_POS.clone());
    // Ngoài hành lang, nhìn thấy qua khe cửa bếp: chỗ "nó" đứng một thoáng khi bóng đèn bếp giật.
    this.anchors.set("hallKitchen", new Vector3(-0.1, 0, -2.4));
  }

  /** Mặt đất tại (x, z) (và tầng, theo độ cao mắt `y`) để chọn tiếng bước chân. */
  surfaceAt(x: number, z: number, y = 1.6): Surface {
    if (this.fields) return "dirt";
    // Trong mơ: chân không chạm đất — chỉ có tiếng giấy sột soạt.
    if (this.past) return "paper";
    if (y > FLOOR1_Y + 1) return "wood";
    if (this.stairAt(x, z)) return "wood";
    if (this.backland?.inWater(x, z)) return "water";
    // Tiệm Phúc Ký: nền xi măng cũ.
    if (x > -7 && x < -1 && z > -6 && z < 0) return "concrete";
    if (x > -7 && x < 6 && z > -6 && z < 6) return "tile";
    if (x >= 6) return "mud";
    return "concrete";
  }

  private stairAt(x: number, z: number): Stair | undefined {
    return this.stairs.find((s) => x > s.x0 && x < s.x1 && z > s.z0 - 0.3 && z < s.z1);
  }

  /**
   * Đang đứng trên cầu thang thì trả về độ cao mặt bậc dưới chân, không thì null.
   * `eyeY`: độ cao mắt hiện tại — đứng trên gác ngay phía trên đầu cầu thang thì không bị kéo xuống.
   */
  stairHeight(x: number, z: number, eyeY: number): number | null {
    const s = this.stairAt(x, z);
    if (!s) return null;
    const h = s.y0 + (s.y1 - s.y0) * Math.min(1, Math.max(0, (z - s.z0) / (s.z1 - s.z0)));
    return Math.abs(eyeY - 1.6 - h) < 1.3 ? h : null;
  }

  /** Lội nước (ruộng ở Chạng vạng, mép ao sau vườn): đi chậm, bước thành tiếng nước. */
  inWater(x: number, z: number): boolean {
    return !!this.fields?.inWater(x, z) || !!this.backland?.inWater(x, z);
  }

  /** Điểm dẫn đường cho thực thể — xem sơ đồ ở đầu lớp. Tọa độ (x, z). */
  private buildNav(): void {
    this.nav
      .node("H0", 0, -4.8, "hall", true)
      .node("H1", 0, -2.4, "hall")
      .node("H2", 0, 0.3, "hall", true)
      .node("H3", 0, 2.6, "hall")
      .node("H4", 0, 3.6, "hall")
      .node("H5", 0, 5.2, "hall", true)
      .node("K0", 1.8, -2.4, "kitchen")
      .node("K1", 3.4, -3.2, "kitchen", true)
      .node("K2", 3.6, -4.9, "kitchen", true)
      .node("K3", 3.4, -1.0, "kitchen")
      .node("L0", -1.8, 2.6, "living")
      .node("L1", -3.6, 2.6, "living", true)
      .node("L2", -5.4, 3.2, "living", true)
      .node("L3", -2.4, 1.3, "living")
      .node("L4", -5.6, 5.0, "living", true)
      .node("B0", 1.9, 3.7, "bedroom")
      .node("B1", 3.3, 2.6, "bedroom", true)
      .node("B2", 3.4, 5.0, "bedroom", true)
      .node("B3", 4.4, 1.0, "bedroom", true)
      .link("H0", "H1").link("H1", "H2").link("H2", "H3").link("H3", "H4").link("H4", "H5")
      .link("H1", "K0").link("K0", "K1").link("K0", "K3").link("K1", "K2").link("K1", "K3")
      .link("H3", "L0").link("L0", "L1").link("L0", "L3").link("L1", "L2").link("L1", "L3").link("L1", "L4").link("L2", "L4")
      .link("H4", "B0", "bedroomDoor").link("B0", "B1").link("B0", "B2").link("B1", "B2").link("B1", "B3")
      // Vườn sau, qua cửa sau ở bếp.
      .node("K4", 5.3, -5.15, "kitchen")
      .node("Y0", 6.7, -5.15, "yard")
      .node("Y1", 8, -4.6, "yard")
      .node("Y2", 10, -3.4, "yard", true)
      .node("Y3", 11.3, -1.0, "yard")
      .node("Y4", 8.3, 0.5, "yard")
      .node("Y5", 12, -7.4, "yard", true)
      .node("Y6", 8, -7.6, "yard")
      .link("K2", "K4").link("K4", "Y0", "backDoor")
      .link("Y0", "Y1").link("Y0", "Y6").link("Y1", "Y2").link("Y1", "Y6").link("Y1", "Y4")
      .link("Y2", "Y3").link("Y2", "Y4").link("Y2", "Y5").link("Y3", "Y4").link("Y5", "Y6");
    this.phucKy?.buildNav(this.nav);
    this.backland?.buildNav(this.nav);
  }

  private get director() {
    return this.game.director;
  }

  /** Đêm 2–3 thầy dán bùa kín cửa; đêm 1 và đêm cuối thì cửa mở được — và đó là cám dỗ. */
  private get doorCanOpen(): boolean {
    return this.night === 1 || this.night >= 4;
  }

  /** Đã có nguy hiểm — tủ áo (và tủ hàng tiệm Phúc Ký, bồ lúa nhà kho) thành chỗ trốn. */
  get dangerous(): boolean {
    if (this.past) return false;
    return this.night >= 2 || this.director.has("knocking");
  }

  get lightState(): LightState {
    return this.lightMode;
  }

  get lightsOn(): boolean {
    return this.lightMode === "on" || this.lightMode === "flicker";
  }

  // ---------------------------------------------------------------- vỏ nhà

  private buildShell(): void {
    const floor = this.box("floor", 13.4, 0.2, 12.4, new Vector3(-0.5, -0.1, 0), this.mat("floor", tileUrl(), 11, 10));
    floor.receiveShadows = true;
    // Trần nhà cũng là sàn gác kho đồ mã — chừa một lỗ phía trên cầu thang trong tiệm Phúc Ký.
    // (x0, x1, z0, z1): trần trừ đi ô [STAIR_HOLE] ở góc tây nam.
    const ceiling = this.surface("ceiling", 5, 5, new Color3(0.55, 0.5, 0.42));
    const [hx1, hz0, hz1] = [STAIR_HOLE.x1, STAIR_HOLE.z0, STAIR_HOLE.z1];
    const pieces: [number, number, number, number][] = [
      [hx1, 6.2, -6.2, 6.2],
      [-7.2, hx1, -6.2, hz0],
      [-7.2, hx1, hz1, 6.2],
    ];
    for (const [x0, x1, z0, z1] of pieces) {
      this.box("ceiling", x1 - x0, 0.2, z1 - z0, new Vector3((x0 + x1) / 2, WALL_H + 0.1, (z0 + z1) / 2), ceiling);
    }

    // Tường bao
    this.wall("z", -6, -7, 6, [[-0.6, 0.6]]);
    this.wall("z", 6, -7, 6);
    this.wall("x", -7, -6, 6);
    this.wall("x", 6, -6, 6, [[-5.65, -4.65]]);
    // Tường hành lang — có thêm cửa sang tiệm Phúc Ký (z -3.3..-2.3).
    this.wall("x", -1, -6, 6, [[-3.3, -2.3], [2, 3.2]]);
    this.wall("x", 1, -6, 6, [[-3, -1.8], [3, 4.2]]);
    // Vách ngăn
    this.wall("z", 0, -7, -1);
    this.wall("z", 0, 1, 6);
  }

  /**
   * Dựng một bức tường thẳng với các khoảng trống làm lối đi.
   * axis "x": tường nằm tại x = fixed, chạy dọc trục z (và ngược lại).
   */
  private wall(axis: "x" | "z", fixed: number, from: number, to: number, gaps: [number, number][] = []): void {
    const segments: [number, number, boolean][] = [];
    let cursor = from;
    for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
      segments.push([cursor, g0, false], [g0, g1, true]);
      cursor = g1;
    }
    segments.push([cursor, to, false]);

    for (const [a, b, isGap] of segments) {
      const len = b - a;
      if (len <= 0.001) continue;
      const mid = (a + b) / 2;
      const h = isGap ? WALL_H - DOOR_H : WALL_H;
      const y = isGap ? DOOR_H + h / 2 : WALL_H / 2;
      const size = axis === "x" ? [WALL_T, h, len] : [len, h, WALL_T];
      const pos = axis === "x" ? new Vector3(fixed, y, mid) : new Vector3(mid, y, fixed);
      // Vữa vôi vàng bong tróc lộ gạch (ảnh thật, Poly Haven CC0) — nhuộm ấm cho ra vôi ve nhà cũ.
      const mat = this.surface("wall", Math.max(1, len / 3), isGap ? h / WALL_H : 1, new Color3(0.95, 0.82, 0.6));
      const m = this.box(`wall`, size[0], size[1], size[2], pos, mat);
      m.receiveShadows = true;
    }
  }

  // ---------------------------------------------------------------- ánh sáng

  private buildLights(): void {
    this.hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), this.scene);
    this.hemi.intensity = 0.13;
    this.hemi.diffuse = new Color3(0.55, 0.55, 0.65);
    this.hemi.groundColor = new Color3(0.1, 0.08, 0.06);
    this.hemi.specular = Color3.Black();

    const bulb = (name: string, pos: Vector3, base: number, flickery = false) => this.addBulb(name, pos, base, flickery);
    bulb("hallLight", new Vector3(0, 2.75, -1), 0.55);
    bulb("livingLight", new Vector3(-4, 2.75, 3), 0.5);
    bulb("bedroomLight", new Vector3(3.5, 2.75, 3), 0.45);
    bulb("kitchenLight", new Vector3(3.5, 2.75, -3), 0.6, true);
  }

  /** Bóng đèn sợi đốt trần trụi — tắt/chập chờn cùng cả nhà theo setLights. */
  addBulb(name: string, pos: Vector3, base: number, flickery = false, range = 7): void {
    {
      const light = new PointLight(name, pos, this.scene);
      light.diffuse = new Color3(1, 0.78, 0.5);
      light.specular = Color3.Black();
      light.intensity = base;
      light.range = range;
      const mesh = MeshBuilder.CreateSphere(`${name}-bulb`, { diameter: 0.12, segments: 6 }, this.scene);
      mesh.position = pos.add(new Vector3(0, 0.08, 0));
      mesh.isPickable = false;
      const m = new StandardMaterial(`${name}-mat`, this.scene);
      m.emissiveColor = new Color3(1, 0.8, 0.5);
      m.disableLighting = true;
      mesh.material = m;
      this.bulbs.push({ light, mesh, base, flickery });
    }
  }

  setLights(state: LightState): void {
    if (state === "stutter") {
      // Không đổi trạng thái đèn của nhà: chỉ bóng bếp (vốn hay chập chờn) giật thêm một chặp.
      this.stutterTime = 1.2;
      return;
    }
    this.lightMode = state;
    const lever = this.scene.getMeshByName("fuseLever");
    if (lever) lever.rotation.x = state === "off" || state === "blackout" ? 0.9 : 0;
    if (state === "flicker") this.flickerTime = 1.5;
    if (state === "on" || state === "off" || state === "blackout") {
      const on = state === "on";
      for (const b of this.bulbs) this.setBulb(b, on ? 1 : 0);
      this.hemi.intensity = on ? 0.13 : state === "off" ? 0.035 : 0.005;
      // Đèn tắt thì ánh trăng lọt qua khe cửa chính mới hiện ra — nền sáng để thấy bóng người đứng trước nó.
      this.moonlight.intensity = state === "off" ? 1 : 0;
      // Sương: xem updateFog (đổi dần theo đèn và theo chỗ người chơi đứng).
    }
    if (state === "blackout") {
      this.altarLight.intensity = 0;
      for (const lamp of this.altarLamps) (lamp.material as StandardMaterial).emissiveColor = Color3.Black();
    }
  }

  private setBulb(b: Bulb, level: number): void {
    b.light.intensity = b.base * level;
    (b.mesh.material as StandardMaterial).emissiveColor = new Color3(1, 0.8, 0.5).scale(0.15 + 0.85 * level);
  }

  // ---------------------------------------------------------------- phòng

  private buildHallway(): void {
    const wood = this.surface("wood", 1, 1, new Color3(0.75, 0.6, 0.5));
    // Cửa chính: bản lề ở x=-0.6, mở ra ngoài (−z).
    const front = this.door("frontDoor", new Vector3(-0.6, 0, -6), new Vector3(0.6, DOOR_H / 2, 0), [1.2, DOOR_H, 0.08], Math.PI / 2);
    makeInteractable(front.leaf, {
      prompt: () => {
        if (this.director.has("ending")) return null;
        if (this.night === 0) return this.director.has("has_door_key") ? "Mở cửa vào nhà" : "Cửa nhà bà";
        return this.director.has("knocking") && this.doorCanOpen ? "Mở cửa" : "Cửa chính";
      },
      interact: () => {
        // Mở đầu: người chơi đứng ngoài ngõ, cần chìa khóa dưới chậu bông.
        if (this.night === 0) {
          if (!this.director.has("has_door_key")) {
            this.game.audio.play("rattle", this.anchors.get("frontDoor"));
            this.game.hud.subtitle("Khóa. Chú Tư nói chìa để dưới chậu bông trước cửa.", 3.5);
            return;
          }
          front.toggle();
          this.game.audio.play("creak", this.anchors.get("frontDoor"));
          this.director.set("entered_house");
          return;
        }
        if (this.past) {
          this.game.audio.play("rattle", this.anchors.get("frontDoor"));
          this.game.hud.subtitle("Cửa cài then. Ông dặn đêm Rằm không ai được ra ngoài.", 3);
          return;
        }
        if (!this.doorCanOpen) {
          this.game.hud.subtitle("Bùa thầy dán kín mép cửa. Đêm nay không mở.", 3);
          return;
        }
        if (!this.director.has("knocking")) {
          this.game.hud.subtitle("Bên ngoài tối om. Chưa phải lúc ra ngoài.", 3);
          return;
        }
        front.toggle();
        this.game.audio.play("creak", this.anchors.get("frontDoor"));
        this.director.set("opened_front_door");
      },
    });
    this.moonlight = new PointLight("moonlight", new Vector3(0, 0.35, -5.65), this.scene);
    this.moonlight.diffuse = new Color3(0.5, 0.6, 0.85);
    this.moonlight.specular = Color3.Black();
    this.moonlight.intensity = 0;
    this.moonlight.range = 5;

    // Kệ dép cạnh cửa.
    this.box("shoeRack", 0.35, 0.45, 0.9, new Vector3(0.75, 0.225, -5.2), wood);
  }

  private buildLivingRoom(): void {
    const wood = this.surface("wood", 1, 1, new Color3(0.75, 0.6, 0.5));
    const lacquer = this.mat("lacquer", undefined, 1, 1, new Color3(0.32, 0.08, 0.05));
    const gold = this.mat("gold", undefined, 1, 1, new Color3(0.55, 0.42, 0.18));

    // Bàn thờ áp tường tây.
    this.box("altar", 0.7, 1.1, 1.8, new Vector3(-6.55, 0.55, 3), lacquer);
    this.box("altarTrim", 0.72, 0.06, 1.82, new Vector3(-6.55, 1.08, 3), gold);
    this.box("altarShrine", 0.35, 0.7, 1.2, new Vector3(-6.75, 1.45, 3), lacquer);

    // Ảnh thờ.
    this.box("photoFrame", 0.04, 0.44, 0.56, new Vector3(-6.47, 1.34, 3), wood);
    const photo = MeshBuilder.CreatePlane("photo", { width: 0.48, height: 0.36 }, this.scene);
    photo.position = new Vector3(-6.445, 1.34, 3);
    photo.rotation.y = -Math.PI / 2;
    this.photoTex = new DynamicTexture("photoTex", { width: 256, height: 192 }, this.scene, false, Texture.BILINEAR_SAMPLINGMODE);
    const photoMat = new StandardMaterial("photoMat", this.scene);
    photoMat.diffuseTexture = this.photoTex;
    photoMat.specularColor = Color3.Black();
    photoMat.emissiveColor = new Color3(0.06, 0.05, 0.04);
    this.materials.set("photo", photoMat);
    photo.material = photoMat;
    this.setPhoto(4);
    // Mặt người thật tải xong thì vẽ lại ảnh (giữ biến thể hiện tại).
    void portraitsReady.then(() => this.setPhoto(this.photoVariant));
    this.targets.set("photo", photo);
    makeInteractable(photo, {
      prompt: () => {
        if (this.night >= 4 && this.director.has("has_scissors")) return this.lightMode === "on" ? "Gỡ ảnh thờ xuống" : null;
        return "Xem ảnh thờ";
      },
      interact: () => {
        if (this.night >= 4 && this.director.has("has_scissors")) {
          if (this.lightMode !== "on") return;
          photo.setEnabled(false);
          this.game.audio.play("rattle", photo.position);
          this.director.set("has_family_photo");
          return;
        }
        const v = this.photoVariant;
        this.game.openPhoto(v, PHOTO_CAPTIONS[v]);
        this.director.set(`seen_photo_${v}`);
      },
    });

    // Đèn thờ hai bên.
    for (const z of [2.3, 3.7]) {
      const lamp = MeshBuilder.CreateCylinder("altarLamp", { diameter: 0.09, height: 0.16, tessellation: 8 }, this.scene);
      lamp.position = new Vector3(-6.45, 1.19, z);
      const m = new StandardMaterial("altarLampMat", this.scene);
      m.emissiveColor = new Color3(0.9, 0.15, 0.08);
      m.disableLighting = true;
      lamp.material = m;
      this.altarLamps.push(lamp);
    }
    this.altarLight = new PointLight("altarLight", new Vector3(-6.05, 1.5, 3), this.scene);
    this.altarLight.diffuse = new Color3(1, 0.3, 0.18);
    this.altarLight.specular = Color3.Black();
    this.altarLight.intensity = 0.45;
    this.altarLight.range = 3.5;

    // Bát nhang — đặt lệch hẳn sang một bên để có thể thắp mà không nhìn thẳng vào ảnh.
    const bowl = MeshBuilder.CreateCylinder("incenseBowl", { diameterTop: 0.18, diameterBottom: 0.13, height: 0.12, tessellation: 10 }, this.scene);
    bowl.position = new Vector3(-6.3, 1.17, 3.75);
    bowl.material = this.mat("ceramic", undefined, 1, 1, new Color3(0.55, 0.5, 0.42));
    for (let i = 0; i < 3; i++) {
      const stick = MeshBuilder.CreateCylinder("incense", { diameter: 0.008, height: 0.26, tessellation: 4 }, this.scene);
      stick.position = new Vector3(-6.3 + (i - 1) * 0.03, 1.36, 3.75);
      stick.material = this.mat("incenseStick", undefined, 1, 1, new Color3(0.5, 0.15, 0.1));
      stick.isPickable = false;
      const tip = MeshBuilder.CreateSphere("incenseTip", { diameter: 0.016, segments: 3 }, this.scene);
      tip.position = stick.position.add(new Vector3(0, 0.13, 0));
      const tm = new StandardMaterial("incenseTipMat", this.scene);
      tm.emissiveColor = Color3.Black();
      tm.disableLighting = true;
      tip.material = tm;
      tip.isPickable = false;
      this.incenseTips.push(tip);
    }
    makeInteractable(bowl, {
      prompt: () => {
        if (this.director.has("ending")) return null;
        if (this.night >= 2) return this.director.has("all_shards") && !this.director.has("bowl_placed") ? "Đặt chén men lam lên bàn thờ" : null;
        if (this.director.has("lit_incense") || this.lighting > 0) return null;
        return this.director.has("knocking") ? `Thắp nén nhang (${this.sticksLit + 1}/3)` : "Bát nhang";
      },
      interact: () => {
        if (this.night >= 2) {
          this.placeBowl();
          return;
        }
        if (!this.director.has("knocking")) {
          this.game.hud.subtitle("Nhang tàn hết rồi. Tối nay phải thắp cho bà ba nén.", 3.5);
          return;
        }
        // Thắp từng nén: quẹt diêm, châm, cắm — đứng yên vài giây trong lúc nó vẫn đi tuần.
        this.lighting = INCENSE_TIME;
        this.game.player.disable();
        this.game.audio.play("click", bowl.position);
        this.game.audio.play("rustle", bowl.position);
      },
    });

    // Tờ giấy hồng điều ghi ngày giỗ, ghim trên tường cạnh câu đối — manh mối của khóa số hộp bánh quy.
    const gioMat = new StandardMaterial("gioList", this.scene);
    gioMat.diffuseTexture = new Texture(gioListUrl(), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    gioMat.specularColor = Color3.Black();
    gioMat.emissiveColor = new Color3(0.1, 0.06, 0.05);
    gioMat.maxSimultaneousLights = 8;
    const gio = MeshBuilder.CreatePlane("gioList", { width: 0.2, height: 0.3 }, this.scene);
    gio.position = new Vector3(-6.885, 1.42, 1.2);
    gio.rotation.y = -Math.PI / 2;
    gio.rotation.z = 0.04;
    gio.material = gioMat;
    // Năm 2003 chưa có tờ ghi giỗ ông, cũng chưa có lời bà dặn.
    if (this.past) gio.setEnabled(false);
    makeInteractable(gio, {
      prompt: () => "Đọc tờ ghi ngày giỗ",
      interact: () => {
        this.game.openNote(notes.gioList);
        this.director.set("read_gio");
      },
    });

    // Tờ giấy bà để lại.
    const note = this.box("rulesNote", 0.2, 0.006, 0.26, new Vector3(-6.32, 1.113, 2.6), this.mat("paper", undefined, 1, 1, new Color3(0.85, 0.8, 0.68)));
    if (this.past) note.setEnabled(false);
    (note.material as StandardMaterial).emissiveColor = new Color3(0.08, 0.07, 0.05);
    makeInteractable(note, {
      prompt: () => (this.night >= 4 ? "Đọc trang sổ tay" : this.night === 3 ? "Đọc giấy thầy Sáu" : "Đọc tờ giấy"),
      interact: () => {
        if (this.night >= 4) {
          this.game.openNote(notes.lastPage);
          this.director.set("read_last_page");
          return;
        }
        if (this.night === 3) {
          this.game.openNote(notes.master);
          this.director.set("read_master_note");
          return;
        }
        this.game.openNote(notes.rules);
        this.director.set("read_rules");
      },
    });

    // Sập gỗ và bộ ấm trà.
    this.box("sap", 2.4, 0.45, 1.5, new Vector3(-3.6, 0.225, 4.9), wood);
    this.box("teaTray", 0.5, 0.03, 0.35, new Vector3(-3.6, 0.465, 4.8), lacquer);
    const pot = MeshBuilder.CreateSphere("teapot", { diameter: 0.14, segments: 6 }, this.scene);
    pot.position = new Vector3(-3.6, 0.53, 4.8);
    pot.material = this.mat("ceramic", undefined, 1, 1, new Color3(0.55, 0.5, 0.42));
    this.box("cabinet", 1.4, 0.9, 0.45, new Vector3(-4, 0.45, 0.35), wood);
  }

  private buildBedroom(): void {
    const wood = this.surface("wood", 1, 1, new Color3(0.75, 0.6, 0.5));
    const cloth = this.mat("cloth", undefined, 1, 1, new Color3(0.42, 0.4, 0.36));

    // Cửa phòng bà: bản lề x=1, z=3, mở vào trong phòng (+x).
    const door = this.door("bedroomDoor", new Vector3(1, 0, 3), new Vector3(0, DOOR_H / 2, 0.6), [0.08, DOOR_H, 1.2], Math.PI * 0.45);
    if (this.night >= 2) door.open = true;
    makeInteractable(door.leaf, {
      prompt: () => (!this.director.has("has_key") ? "Cửa phòng bà" : door.open ? "Đóng cửa" : "Mở cửa"),
      interact: () => {
        const pos = new Vector3(1, 1.2, 3.6);
        if (!this.director.has("has_key")) {
          this.game.audio.play("rattle", pos);
          this.game.hud.subtitle("Khóa rồi. Bà hay cất chìa ở đâu đó dưới bếp.", 3.5);
          return;
        }
        door.toggle();
        this.game.audio.play("creak", pos);
        this.director.set("bedroom_open");
      },
    });

    this.box("bed", 1.6, 0.5, 2.0, new Vector3(5.1, 0.25, 4.8), wood);
    this.box("mattress", 1.5, 0.08, 1.9, new Vector3(5.1, 0.54, 4.8), cloth);
    this.buildWardrobe(wood);
    const nightstand = this.box("nightstand", 0.45, 0.55, 0.45, new Vector3(4.05, 0.275, 5.6), wood);
    if (this.night === 3) {
      makeInteractable(nightstand, {
        // Ảnh của Út giờ nằm trong cái rương trên gác kho đồ mã (xem PhucKy) — ngăn kéo này chỉ còn lời nhắn.
        prompt: () => (this.director.has("read_master_note") && !this.director.has("has_photo") ? "Mở ngăn kéo" : "Tủ đầu giường"),
        interact: () => {
          this.game.audio.play("rattle", nightstand.position);
          this.game.hud.subtitle("Ngăn kéo trống. Chỉ có mảnh giấy chữ bà: “Album, bà cất trong rương trên gác.”", 4.5);
        },
      });
    }

    const diary = this.box("diary", 0.2, 0.04, 0.28, new Vector3(4.75, 0.6, 4.3), this.mat("diaryCover", undefined, 1, 1, new Color3(0.35, 0.08, 0.06)));
    if (this.past) diary.setEnabled(false);
    makeInteractable(diary, {
      prompt: () => "Đọc sổ tay",
      interact: () => {
        this.game.openNote(notes.diary);
        this.director.set("read_diary");
        // Kẹp giữa sổ: mảnh đầu tiên của trang bà xé.
        this.game.findFragment(0);
      },
    });
  }

  /** Tủ áo của bà — chỗ trốn duy nhất trong nhà. */
  private buildWardrobe(wood: StandardMaterial): void {
    const wardrobe = this.box("wardrobe", 0.7, 2.2, 1.4, new Vector3(5.55, 1.1, 1.0), wood);
    // Khe giữa hai cánh và tay nắm: mặt phẳng chỉ nhìn được từ trong phòng (-x), không che tầm nhìn khi trốn bên trong.
    const dark = this.mat("wardrobeSeam", undefined, 1, 1, new Color3(0.02, 0.015, 0.01));
    const strips: [number, number, number, number][] = [
      [0.025, 2.0, 1.0, 1.1],
      [0.03, 0.12, 0.93, 1.15],
      [0.03, 0.12, 1.07, 1.15],
    ];
    for (const [w, h, z, y] of strips) {
      const p = MeshBuilder.CreatePlane("wardrobeSeam", { width: w, height: h }, this.scene);
      p.position = new Vector3(5.195, y, z);
      p.rotation.y = Math.PI / 2;
      p.material = dark;
      p.isPickable = false;
    }

    const spot: HidingSpot = {
      inside: new Vector3(5.6, 1.6, 1.0),
      insideYaw: -Math.PI / 2,
      outside: new Vector3(4.55, 1.6, 1.0),
      outsideYaw: -Math.PI / 2,
      front: new Vector3(4.4, 0, 1.0),
    };
    makeInteractable(wardrobe, {
      prompt: () => {
        if (this.director.has("ending")) return null;
        if (this.night === 3 && this.director.has("read_master_note") && !this.director.has("has_shirt")) return "Lấy áo cũ của Út";
        return this.dangerous ? "Trốn vào tủ" : "Tủ áo";
      },
      interact: () => {
        if (this.night === 3 && this.director.has("read_master_note") && !this.director.has("has_shirt")) {
          this.game.audio.play("creak", spot.inside);
          this.collect("shirt", "Cái áo sơ mi trắng hồi nhỏ của mình. Bà còn giữ, gấp phẳng phiu. Áo ấm như vừa có người mặc.");
          return;
        }
        if (!this.dangerous) {
          this.game.hud.subtitle("Tủ áo của bà. Hồi nhỏ mình hay chui vào đây trốn.\nGiờ vẫn đủ chỗ cho một người.", 4);
          return;
        }
        this.game.hide(spot);
      },
    });
  }

  private buildKitchen(): void {
    const wood = this.surface("wood", 1, 1, new Color3(0.75, 0.6, 0.5));
    const tin = this.mat("tin", undefined, 1, 1, new Color3(0.45, 0.47, 0.48));

    this.box("counter", 0.7, 0.9, 3, new Vector3(5.55, 0.45, -3), wood);
    const jar = MeshBuilder.CreateCylinder("waterJar", { diameterTop: 0.55, diameter: 0.8, diameterBottom: 0.5, height: 0.9, tessellation: 12 }, this.scene);
    jar.position = new Vector3(2, 0.45, -5.2);
    jar.material = this.mat("glaze", undefined, 1, 1, new Color3(0.3, 0.2, 0.12));
    jar.checkCollisions = true;

    // Hộp bánh quy bơ xanh — như mọi nhà Việt, bên trong không có bánh mà là kim chỉ.
    // Đêm 1 bà quấn sợi dây khóa xe đạp số quanh hộp; mã là ngày giỗ ông.
    const tinBlue = this.mat("cookieTin", undefined, 1, 1, new Color3(0.13, 0.22, 0.52));
    tinBlue.specularColor = new Color3(0.25, 0.25, 0.3);
    const box = MeshBuilder.CreateCylinder("tinBox", { diameter: 0.26, height: 0.08, tessellation: 18 }, this.scene);
    box.position = TIN_POS.clone();
    box.material = tinBlue;
    // Nắp xanh lam, viền vàng — nhận ra ngay dù bếp tối.
    const lid = MeshBuilder.CreateCylinder("tinLid", { diameter: 0.27, height: 0.025, tessellation: 18 }, this.scene);
    lid.position = TIN_POS.add(new Vector3(0, 0.05, 0));
    const lidMat = this.mat("cookieTinLid", undefined, 1, 1, new Color3(0.16, 0.3, 0.72));
    lidMat.emissiveColor = new Color3(0.02, 0.04, 0.1);
    lid.material = lidMat;
    lid.isPickable = false;
    const rim = MeshBuilder.CreateTorus("tinRim", { diameter: 0.265, thickness: 0.012, tessellation: 20 }, this.scene);
    rim.parent = lid;
    rim.position.y = 0.012;
    rim.material = this.mat("cookieTinRim", undefined, 1, 1, new Color3(0.62, 0.5, 0.22));
    rim.isPickable = false;
    const cable = MeshBuilder.CreateTorus("tinLock", { diameter: 0.27, thickness: 0.018, tessellation: 20 }, this.scene);
    cable.position = TIN_POS.add(new Vector3(0, 0.02, 0));
    cable.material = this.mat("cableLock", undefined, 1, 1, new Color3(0.5, 0.06, 0.04));
    cable.isPickable = false;
    // Cục khóa số nằm phía người chơi đứng (−x, quay lưng vào bếp).
    const dials = MeshBuilder.CreateBox("tinLockDials", { width: 0.035, height: 0.03, depth: 0.075 }, this.scene);
    dials.material = tin;
    dials.parent = cable;
    dials.position.set(-0.142, 0, 0);
    dials.isPickable = false;
    if (this.night !== 1) cable.setEnabled(false);
    makeInteractable(box, {
      prompt: () => {
        if (this.night >= 4) return null;
        if (this.night === 3) return this.director.has("read_master_note") && !this.director.has("has_matches") ? "Lấy hộp diêm" : null;
        if (this.night !== 1) return null;
        if (this.director.has("has_key")) return "Xem tấm ảnh nhỏ trong hộp";
        return this.director.has("read_rules") ? "Mở khóa số" : "Hộp bánh quy";
      },
      interact: () => {
        if (this.night === 1 && this.director.has("has_key")) {
          this.game.openNote(notes.tinPhoto);
          this.director.set("saw_tin_photo");
          return;
        }
        if (this.night === 3) {
          this.game.audio.play("rattle", box.position);
          this.collect("matches", "Hộp diêm Thống Nhất, nằm giữa kim chỉ. Còn đúng ba que.");
          return;
        }
        if (!this.director.has("tin_seen")) {
          this.director.set("tin_seen");
          this.game.hud.subtitle("Hộp bánh quy bơ. Ở nhà bà, hộp này chưa bao giờ đựng bánh.\nVậy mà có người quấn cả sợi dây khóa xe đạp quanh nó.", 5);
          if (!this.director.has("read_rules")) return;
        }
        this.game.openLock({
          title: "Dây khóa xe đạp",
          sub: this.director.has("read_rules")
            ? "Sợi dây khóa số hồi nhỏ của mình. Bà dặn: mã là ngày giỗ ông, ngày trước tháng sau."
            : "Sợi dây khóa số hồi nhỏ của mình. Mã số gì đây?",
          digits: 4,
          onTry: (code) => this.tryTinCode(code),
          onTurn: () => this.game.audio.play("tick", TIN_POS),
          onSolved: () => {
            cable.setEnabled(false);
            lid.position.addInPlace(new Vector3(-0.2, -0.04, 0.12));
            lid.rotation.z = 0.25;
            this.game.audio.play("unlock", TIN_POS);
            this.game.hud.subtitle("Bên trong: kim, chỉ, mấy cái nút áo… và chìa khóa phòng bà.\nKẹp dưới nắp có mảnh giấy: “Không có bánh đâu. — Bà”", 6);
            this.director.set("has_key");
          },
        });
      },
    });

    // Khung cửa bếp nhìn ra hành lang: mục tiêu vô hình cho điều kiện "visible" (người chơi đang nhìn ra cửa bếp).
    const doorway = MeshBuilder.CreatePlane("kitchenDoorway", { width: 1.1, height: 2.1 }, this.scene);
    doorway.position = new Vector3(1, 1.05, -2.4);
    doorway.rotation.y = Math.PI / 2;
    doorway.isVisible = false;
    doorway.isPickable = false;
    this.targets.set("kitchenDoorway", doorway);

    // Cửa sau: bản lề x=6, z=-5.65, mở ra vườn (+x).
    const backDoor = this.door("backDoor", new Vector3(6, 0, -5.65), new Vector3(0, DOOR_H / 2, 0.5), [0.08, DOOR_H, 1.0], Math.PI * 0.45);
    const backPos = new Vector3(6, 1.2, -5.15);
    makeInteractable(backDoor.leaf, {
      prompt: () => (this.night >= 2 && this.director.has("read_uncle_note") ? (backDoor.open ? "Đóng cửa sau" : "Mở cửa sau") : "Cửa sau"),
      interact: () => {
        if (this.night < 2 || !this.director.has("read_uncle_note")) {
          this.game.audio.play("rattle", backPos);
          this.game.hud.subtitle("Cửa sau ra giếng nước. Khóa ngoài.\nĐêm nay không nên ra đó.", 3.5);
          return;
        }
        backDoor.toggle();
        this.game.audio.play("creak", backPos);
        this.director.set("backdoor_open");
      },
    });
  }

  /** TV CRT trên tủ phòng khách — đêm hai nó tự bật. */
  private buildTv(): void {
    const plastic = this.mat("tvPlastic", undefined, 1, 1, new Color3(0.12, 0.1, 0.08));
    this.box("tv", 0.62, 0.48, 0.45, new Vector3(-4, 1.14, 0.36), plastic);
    this.box("tvBack", 0.4, 0.34, 0.2, new Vector3(-4, 1.12, 0.06), plastic);
    for (const side of [-1, 1]) {
      const ant = MeshBuilder.CreateCylinder("tvAntenna", { diameter: 0.008, height: 0.5, tessellation: 4 }, this.scene);
      ant.position = new Vector3(-4 + side * 0.12, 1.58, 0.3);
      ant.rotation.z = -side * 0.5;
      ant.material = this.mat("brassAnt", undefined, 1, 1, new Color3(0.5, 0.45, 0.35));
      ant.isPickable = false;
    }
    this.tvTex = new DynamicTexture("tvTex", { width: 64, height: 48 }, this.scene, false, Texture.NEAREST_SAMPLINGMODE);
    const screenMat = new StandardMaterial("tvScreen", this.scene);
    screenMat.diffuseColor = Color3.Black();
    screenMat.specularColor = new Color3(0.15, 0.15, 0.15);
    screenMat.emissiveTexture = this.tvTex;
    this.materials.set("tvScreen", screenMat);
    const screen = MeshBuilder.CreatePlane("tvScreen", { width: 0.46, height: 0.34 }, this.scene);
    screen.position = new Vector3(-4, 1.15, 0.588);
    screen.rotation.y = Math.PI;
    screen.material = screenMat;
    this.targets.set("tv", screen);
    this.anchors.set("tv", new Vector3(-4, 1.15, 0.7));
    this.tvLight = new PointLight("tvLight", new Vector3(-4, 1.15, 1.0), this.scene);
    this.tvLight.diffuse = new Color3(0.6, 0.7, 0.9);
    this.tvLight.specular = Color3.Black();
    this.tvLight.range = 4;
    this.tvLight.intensity = 0;
    this.setTv("off");
    makeInteractable(screen, {
      prompt: () => (this.tvState === "off" ? null : "Tắt TV"),
      interact: () => this.game.tv("off"),
    });
  }

  setTv(state: TvState): void {
    this.tvState = state;
    const ctx = this.tvTex.getContext() as unknown as CanvasRenderingContext2D;
    if (state === "off") {
      ctx.fillStyle = "#020303";
      ctx.fillRect(0, 0, 64, 48);
      this.tvLight.intensity = 0;
      this.game.audio.setStatic(null);
    } else if (state === "face") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 64, 48);
      ctx.save();
      ctx.translate(16, 0);
      drawEntityFace(ctx, 32, 48);
      ctx.restore();
      this.tvLight.intensity = 0.9;
    } else {
      this.game.audio.setStatic(this.anchors.get("tv")!);
    }
    this.tvTex.update();
  }

  private drawStatic(): void {
    const ctx = this.tvTex.getContext() as unknown as CanvasRenderingContext2D;
    const img = ctx.createImageData(64, 48);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 200;
      img.data[i] = v * 0.9;
      img.data[i + 1] = v * 0.95;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // Vạch cuộn ngang kiểu sóng yếu.
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, (this.time * 30) % 48, 64, 3);
    this.tvTex.update();
    this.tvLight.intensity = 0.35 + Math.random() * 0.25;
  }

  /** Đồ vật riêng của đêm hai: giấy chú Tư, hũ gạo, nhang đang cháy. */
  private buildNightTwo(): void {
    const paper = this.mat("paper", undefined, 1, 1, new Color3(0.85, 0.8, 0.68));
    const note = this.box("uncleNote", 0.2, 0.006, 0.26, new Vector3(4.05, 0.556, 5.55), paper);
    makeInteractable(note, {
      prompt: () => "Đọc giấy chú Tư",
      interact: () => {
        this.game.openNote(notes.uncle);
        this.director.set("read_uncle_note");
      },
    });

    const riceJar = MeshBuilder.CreateCylinder("riceJar", { diameterTop: 0.34, diameter: 0.48, diameterBottom: 0.36, height: 0.6, tessellation: 10 }, this.scene);
    riceJar.position = new Vector3(5.4, 0.3, -0.75);
    riceJar.material = this.mat("riceGlaze", undefined, 1, 1, new Color3(0.42, 0.36, 0.26));
    riceJar.checkCollisions = true;
    const lid = MeshBuilder.CreateCylinder("riceLid", { diameter: 0.36, height: 0.04, tessellation: 10 }, this.scene);
    lid.position = new Vector3(5.4, 0.62, -0.75);
    lid.material = this.surface("wood", 1, 1, new Color3(0.75, 0.6, 0.5));
    lid.isPickable = false;
    makeInteractable(riceJar, {
      prompt: () => (this.director.has("shard_rice") ? null : this.director.has("read_uncle_note") ? "Lục hũ gạo" : "Hũ gạo"),
      interact: () => {
        if (!this.director.has("read_uncle_note")) {
          this.game.hud.subtitle("Hũ gạo của bà. Gạo còn lưng lửng.", 3);
          return;
        }
        lid.position.x -= 0.25;
        lid.rotation.z = 0.3;
        this.game.audio.play("rattle", riceJar.position);
        // Vết máu khô là của đứa nhỏ làm bể chén năm 2003; người đang cầm nó thì không chảy máu (manh mối kết thật).
        this.collect("rice", "Một mảnh chén men lam vùi giữa gạo. Cạnh sắc còn vết máu khô từ hồi nào.\nNó cứa ngang ngón tay mình… mà không thấy chảy máu. May.");
      },
    });

    this.lightIncense();
  }

  /** Đồ cần gom mỗi đêm: cờ riêng từng món, cờ "đã có một món", cờ "đủ cả". */
  private static readonly GOALS: Record<number, { prefix: string; done: string; label: string }> = {
    2: { prefix: "shard_", done: "all_shards", label: "Tìm 3 mảnh chén men lam" },
    3: { prefix: "has_", done: "all_items", label: "Tìm áo cũ, ảnh của Út và hộp diêm" },
  };

  /** Chỗ giấu di vật của từng màn (x, y, z, xoay) — khuất nhưng không đi ngang được là thấy ngay. */
  private static readonly RELIC_SPOTS: Record<string, [number, number, number, number]> = {
    receipt: [-1.15, 0.012, -29.8, 0.4],
    // Trên bàn điểm nhãn trong tiệm Phúc Ký — nơi "ba điều cấm" được chép lại đời này qua đời khác.
    taboos: [-2.5, 0.858, -0.78, 0.2],
    // Kẽ bia mộ ông, khu mộ sau vườn.
    horoscope: [35.3, 0.012, 4.2, 1.1],
    graveLetter: [11, 0.462, 126, 0.3],
    // Trên bàn điểm nhãn, cạnh ống bút của ông.
    eyeBrush: [-4.2, 0.858, -0.8, 0.7],
    confession: [-5.7, 0.012, 2.2, -0.3],
  };

  /** Di vật của đêm này (xem core/relics.ts): một mảnh giấy cũ nằm khuất, nhặt lên đọc. */
  private placeRelics(): void {
    const mat = new StandardMaterial("relicPaper", this.scene);
    mat.diffuseTexture = new Texture(relicPaperUrl(), this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    mat.specularColor = Color3.Black();
    mat.emissiveColor = new Color3(0.1, 0.08, 0.05);
    mat.backFaceCulling = false;
    for (const relic of RELICS) {
      const spot = House.RELIC_SPOTS[relic.id];
      if (relic.level !== this.night || !spot) continue;
      const paper = MeshBuilder.CreatePlane(`relic-${relic.id}`, { width: 0.2, height: 0.25 }, this.scene);
      paper.position.set(spot[0], spot[1], spot[2]);
      paper.rotation.set(Math.PI / 2, spot[3], 0);
      paper.material = mat;
      this.targets.set(`relic_${relic.id}`, paper);
      makeInteractable(paper, {
        prompt: () => (foundRelics().has(relic.id) ? "Đọc lại mảnh giấy cũ" : "Mảnh giấy cũ"),
        interact: () => {
          this.game.openNote(relic);
          this.game.audio.play("rustle");
          if (this.director.has(`relic_${relic.id}`)) return;
          this.director.set(`relic_${relic.id}`);
          markRelic(relic.id);
          this.game.hud.subtitle(`Di vật ${foundRelics().size}/${RELICS.length} — ${relic.title}`, 4.5);
          if (allRelicsFound()) this.director.set("all_relics");
        },
      });
    }
  }

  /** Lịch bloc (do Decor dựng) thành vật đọc được. */
  private makeCalendarReadable(): void {
    const cal = this.scene.getMeshByName("calendar");
    if (!cal) return;
    cal.isPickable = true;
    makeInteractable(cal, {
      prompt: () => "Xem lịch",
      interact: () => {
        this.game.openNote(notes.calendar);
        this.director.set("read_calendar");
      },
    });
  }

  /** Thử mã khóa hộp bánh quy. Trả về câu phản hồi khi sai, null khi đúng. Gợi ý rõ dần theo số lần sai. */
  private tryTinCode(code: string): string | null {
    this.game.playtest.log("action", `tin-code:${code}`);
    if (code === TIN_CODE) return null;
    this.tinTries++;
    this.game.audio.play("rattle", TIN_POS);
    if (code === "1507") return "Không mở.\nBà gạch chữ Rằm đi rồi mà… Giỗ ông không phải đêm Rằm.";
    if (code === "0716") return "Không mở.\nNgày trước, tháng sau — bà dặn vậy.";
    if (OTHER_GIO.includes(code)) return "Không mở.\nĐó là giỗ người khác trong nhà, không phải giỗ ông.";
    if (this.tinTries >= 5) return "Không mở.\nGiỗ ông là sáng hôm sau đêm Rằm tháng Bảy. Lịch dưới bếp ghi Rằm là ngày mấy?";
    if (this.tinTries >= 3) return "Không mở.\nNgày giỗ ông… cạnh bàn thờ hình như có tờ giấy ghi.";
    return "Không mở.";
  }

  collect(id: string, line: string): void {
    const goal = House.GOALS[this.night];
    if (!goal || this.director.has(`${goal.prefix}${id}`)) return;
    this.shards++;
    this.director.set(`${goal.prefix}${id}`);
    this.director.set(`${goal.prefix}any`);
    this.game.audio.play("click");
    this.game.hud.subtitle(line, 4.5);
    if (this.shards >= 3) this.director.set(goal.done);
    else this.game.hud.setObjective(`${goal.label} (${this.shards}/3)`);
  }

  /**
   * Đêm cuối: hộp may của bà (có cây kéo) trên giường, cầu dao điện ở tường bếp,
   * thau vàng mã cạnh bàn thờ để đốt người thứ năm.
   */
  private buildNightFour(): void {
    const sewing = this.box("sewingBox", 0.3, 0.1, 0.22, new Vector3(4.6, 0.7, 4.0), this.mat("sewingTin", undefined, 1, 1, new Color3(0.25, 0.32, 0.45)));
    sewing.checkCollisions = false;
    makeInteractable(sewing, {
      prompt: () => (this.director.has("has_scissors") ? null : this.director.has("read_last_page") ? "Lục hộp may của bà" : "Hộp may"),
      interact: () => {
        if (!this.director.has("read_last_page")) return;
        this.game.audio.play("rattle", sewing.position);
        this.game.hud.subtitle("Cây kéo cắt vải của bà. Lưỡi kéo lạnh buốt.", 3.5);
        this.director.set("has_scissors");
      },
    });

    // Cầu dao điện trên tường bếp.
    const panel = this.box("fuseBox", 0.32, 0.42, 0.08, new Vector3(4.2, 1.6, -0.14), this.mat("fusePanel", undefined, 1, 1, new Color3(0.3, 0.32, 0.3)));
    const lever = this.box("fuseLever", 0.05, 0.14, 0.06, new Vector3(4.2, 1.6, -0.2), this.mat("fuseLever", undefined, 1, 1, new Color3(0.5, 0.08, 0.05)));
    lever.isPickable = false;
    const at = new Vector3(4.2, 1.6, -0.3);
    makeInteractable(panel, {
      prompt: () => (this.lightMode === "off" && this.director.has("lights_off") && !this.director.has("ending") ? "Bật cầu dao" : null),
      interact: () => {
        if (this.lightMode !== "off") return;
        this.game.audio.play("click", at);
        this.game.audio.play("rattle", at);
        this.setLights("on");
        this.powerTime = 25;
        this.director.set("power_used");
        // Tiếng cầu dao vang khắp nhà — nó nghe thấy.
        this.game.knocker.hear(new Vector3(at.x, 0, -0.8));
      },
    });

    const basin = this.scene.getMeshByName("basin");
    if (basin) {
      basin.isPickable = true;
      makeInteractable(basin, {
        prompt: () => (this.director.has("has_family_photo") && !this.director.has("fifth_burned") ? "Cắt người thứ năm ra, đốt trong thau" : null),
        interact: () => {
          this.game.audio.play("whoosh", basin.position);
          this.game.fx.fire(basin.position.clone(), 0.35);
          this.director.set("fifth_burned");
        },
      });
    }
  }

  /** Đêm ba: nhang vẫn cháy, cái chén đêm qua vẫn nằm trên bàn thờ. */
  private buildNightThree(): void {
    this.lightIncense();
    this.showPlacedBowl();
  }

  private placeBowl(): void {
    if (!this.director.has("all_shards") || this.placedBowl) return;
    this.showPlacedBowl();
    this.game.audio.play("click", this.placedBowl!.position);
    this.game.hud.setObjective("");
    this.director.set("bowl_placed");
  }

  private showPlacedBowl(): void {
    const bowl = MeshBuilder.CreateCylinder("placedBowl", { diameterTop: 0.16, diameterBottom: 0.08, height: 0.07, tessellation: 12 }, this.scene);
    bowl.position = new Vector3(-6.3, 1.15, 2.35);
    const m = new StandardMaterial("blueWhite", this.scene);
    m.diffuseColor = new Color3(0.55, 0.62, 0.8);
    m.emissiveColor = new Color3(0.05, 0.07, 0.12);
    bowl.material = m;
    bowl.isPickable = false;
    this.placedBowl = bowl;
  }

  // ---------------------------------------------------------------- trạng thái

  setPhoto(variant: number): void {
    this.photoVariant = variant;
    const ctx = this.photoTex.getContext() as unknown as CanvasRenderingContext2D;
    drawPhoto(ctx, 256, 192, variant);
    this.photoTex.update();
  }

  /** Đang châm một nén (giây còn lại) — xong thì nén đó đỏ đầu; đủ ba nén là thắp xong. */
  private tickIncense(dt: number): void {
    if (this.lighting <= 0) return;
    if (this.game.knocker.state === "caught") {
      this.lighting = 0;
      return;
    }
    this.lighting -= dt;
    if (this.lighting > 0) return;
    const tip = this.incenseTips[this.sticksLit];
    (tip.material as StandardMaterial).emissiveColor = new Color3(1, 0.35, 0.1);
    this.game.fx.addSmoke(tip.position);
    this.sticksLit++;
    this.game.audio.play("click", tip.position);
    if (this.sticksLit >= this.incenseTips.length) {
      this.lightIncense();
      this.director.set("lit_incense");
    } else {
      this.game.hud.subtitle(`Nén thứ ${this.sticksLit === 1 ? "nhất" : "hai"}.`, 1.5);
    }
    this.game.resumeControl();
  }

  private lightIncense(): void {
    for (const tip of this.incenseTips) {
      (tip.material as StandardMaterial).emissiveColor = new Color3(1, 0.35, 0.1);
      this.game.fx.addSmoke(tip.position);
    }
    this.altarLight.diffuse = new Color3(1, 0.5, 0.25);
    this.altarLight.intensity = 0.8;
  }

  /**
   * Sương đổi dần chứ không nhảy: trong nhà dày (che sự đơn sơ của mô hình, mất điện thì mỏng đi để thấy vệt trăng),
   * ngoài đất sau vườn thì loãng để nhìn được ra xa — chỗ rộng mà không thấy gì thì chỉ thấy chật.
   */
  private updateFog(dt: number): void {
    const p = this.game.player.camera.position;
    let target = this.lightMode === "off" ? Math.min(0.085, this.baseFog) : this.baseFog;
    if (this.backland && p.x > 13) target = 0.06;
    else if (p.y > FLOOR1_Y + 1) target = 0.1;
    const k = Math.min(1, dt * 1.2);
    this.scene.fogDensity += (target - this.scene.fogDensity) * k;
    // Ngoài trời: trời đêm ngả xanh chàm — tre, cây gạo, mái nhà hiện thành bóng đen trên nền trời, thấy được chỗ
    // rộng. Trong nhà: đen gần tuyệt đối như cũ.
    if (this.night !== 0 && !this.fields) {
      const outdoor = p.x > 6.05;
      const sky = outdoor ? SKY_NIGHT : SKY_INDOOR;
      const fog = this.scene.fogColor;
      fog.r += (sky.r - fog.r) * k;
      fog.g += (sky.g - fog.g) * k;
      fog.b += (sky.b - fog.b) * k;
      this.scene.clearColor.set(fog.r, fog.g, fog.b, 1);
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.updateFog(dt);
    this.phucKy?.update(dt);
    this.backland?.update(dt);
    for (const d of this.doors.values()) d.update(dt);
    this.decor.update(dt, this.lightsOn, this.clockStopped);
    this.funeral?.update(dt);
    this.coffins?.update(dt);
    this.pastScene?.update(dt);
    this.fields?.update(dt);
    this.yard.update(dt);
    this.tickIncense(dt);
    if (this.powerTime > 0) {
      this.powerTime -= dt;
      if (this.powerTime <= 0 && !this.director.has("ending")) {
        this.setLights("flicker");
        this.powerCut = 1.4;
      }
    } else if (this.powerCut > 0) {
      this.powerCut -= dt;
      if (this.powerCut <= 0 && !this.director.has("ending")) {
        this.setLights("off");
        this.game.hud.subtitle("Cầu dao lại nhảy. Có ai đó vừa gạt nó xuống.", 3.5);
      }
    }
    if (this.tvState === "static") {
      this.tvTick -= dt;
      if (this.tvTick <= 0) {
        this.tvTick = 0.06;
        this.drawStatic();
      }
    }

    // Giảm chớp & rung: đèn vẫn chập chờn (là tín hiệu của lối chơi) nhưng chậm hơn và không tắt hẳn.
    const dim = comfort.calm ? 0.45 : 0.05;
    const tick = () => (comfort.calm ? 0.18 + Math.random() * 0.15 : 0.04 + Math.random() * 0.08);
    if (this.lightMode === "flicker") {
      this.flickerTime -= dt;
      this.flickerTick -= dt;
      if (this.flickerTick <= 0) {
        this.flickerTick = tick();
        for (const b of this.bulbs) this.setBulb(b, Math.random() < 0.45 ? 1 : dim);
      }
      if (this.flickerTime <= 0) this.setLights("on");
    } else if (this.lightMode === "on") {
      if (this.stutterTime > 0) {
        this.stutterTime -= dt;
        this.flickerTick -= dt;
        if (this.flickerTick <= 0) {
          this.flickerTick = tick();
          for (const b of this.bulbs) if (b.flickery) this.setBulb(b, this.stutterTime <= 0 || Math.random() < 0.4 ? 1 : dim);
        }
      } else {
        // Bóng đèn bếp chập chờn sẵn — dấu hiệu nhỏ rằng căn nhà "không ổn".
        for (const b of this.bulbs) {
          if (b.flickery) this.setBulb(b, Math.random() < 0.015 ? (comfort.calm ? 0.6 : 0.1) : 1);
        }
      }
    }

    if (this.director.has("lit_incense")) {
      this.altarLight.intensity = 0.75 + Math.sin(this.time * 7) * 0.05 + Math.random() * 0.04;
    }
  }

  /** Beat kịch bản: để khu vực nào biết thì khu đó diễn. */
  beat(name: string): boolean {
    return !!this.phucKy?.beat(name) || !!this.backland?.beat(name) || !!this.coffins?.beat(name) || !!this.pastScene?.beat(name);
  }

  isDoorOpen(name: string): boolean {
    return this.doors.get(name)?.open ?? true;
  }

  /** Đặt trạng thái cửa từ kịch bản. Đóng sầm thì kêu to và HUD chớp. */
  setDoor(name: string, open: boolean): void {
    const door = this.doors.get(name);
    if (!door || door.open === open) return;
    door.toggle();
    const at = door.pivot.position.add(new Vector3(0, 1.2, 0));
    this.game.audio.play("creak", at);
    if (!open) {
      this.game.audio.play("knock", at);
      this.game.hud.uiFlicker();
    }
  }

  openDoor(name: string): void {
    const door = this.doors.get(name);
    if (!door || door.open) return;
    door.toggle();
    this.game.audio.play("creak", door.pivot.position.add(new Vector3(0, 1.2, 0)));
  }

  // ---------------------------------------------------------------- tiện ích

  /** Vật liệu từ ảnh thật trong public/textures (màu + normal map để đèn pin làm nổi vết nứt). */
  surface(name: "wall" | "ceiling" | "wood" | "brick" | "fence" | "mud", u = 1, v = 1, tint?: Color3): StandardMaterial {
    const key = `surface:${name}:${u.toFixed(2)}:${v.toFixed(2)}:${tint?.toHexString() ?? ""}`;
    const hit = this.materials.get(key);
    if (hit) return hit;
    const m = new StandardMaterial(key, this.scene);
    m.specularColor = new Color3(0.03, 0.03, 0.03);
    const load = (kind: string, mode: number) => {
      const t = new Texture(`textures/${name}_${kind}.jpg`, this.scene, false, true, mode);
      t.uScale = u;
      t.vScale = v;
      return t;
    };
    m.diffuseTexture = load("diff", Texture.NEAREST_SAMPLINGMODE);
    m.bumpTexture = load("nor", Texture.TRILINEAR_SAMPLINGMODE);
    if (tint) m.diffuseColor = tint;
    this.materials.set(key, m);
    return m;
  }

  mat(key: string, url?: string, u = 1, v = 1, color?: Color3): StandardMaterial {
    const cacheKey = `${key}:${u.toFixed(2)}:${v.toFixed(2)}`;
    const hit = this.materials.get(cacheKey);
    if (hit) return hit;
    const m = new StandardMaterial(cacheKey, this.scene);
    m.specularColor = Color3.Black();
    if (url) {
      const tex = new Texture(url, this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
      tex.uScale = u;
      tex.vScale = v;
      m.diffuseTexture = tex;
    }
    if (color) m.diffuseColor = color;
    this.materials.set(cacheKey, m);
    return m;
  }

  box(name: string, w: number, h: number, d: number, pos: Vector3, mat: StandardMaterial): Mesh {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
    m.position = pos;
    m.material = mat;
    m.checkCollisions = true;
    return m;
  }

  door(name: string, hinge: Vector3, leafOffset: Vector3, size: [number, number, number], openAngle: number): Door {
    const pivot = new TransformNode(`${name}-pivot`, this.scene);
    pivot.position = hinge;
    const leaf = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, this.scene);
    leaf.parent = pivot;
    leaf.position = leafOffset;
    leaf.material = this.surface("wood", 1, 2, new Color3(0.6, 0.48, 0.4));
    leaf.checkCollisions = true;
    const door = new Door(pivot, leaf, openAngle);
    this.doors.set(name, door);
    return door;
  }
}
