import { Color3, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Texture, TransformNode, Vector3, VertexData } from "../babylon";
import type { Game } from "../core/Game";
import { buildPaperDoll, type PaperDoll } from "../entity/Effigy";
import type { NavGraph } from "../entity/NavGraph";
import { makeInteractable } from "../interaction/Interaction";
import notes from "../data/notes.json";
import type { HidingSpot, House } from "./House";
import { FLOOR1_Y, SHOP_STAIR, STAIR_HOLE } from "./floors";
import { PropKit } from "./PropKit";
import {
  calendar2003Url,
  clothUrl,
  cobwebUrl,
  effigyFaceUrl,
  jossPaperUrl,
  paperPhoneUrl,
  plaqueUrl,
  roofTileUrl,
  shaftUrl,
  signUrl,
  talismanUrl,
} from "./decorTextures";
import { hairUrl, lanternUrl, plainPaperUrl } from "./paperTextures";

const F = FLOOR1_Y;
/** Mái gác: hai mái dốc gặp nhau ở nóc (dọc trục z, tại x = RIDGE_X). Hiên cao đủ đầu người đi sát tường. */
const ROOF = { xL: -7.25, xR: 6.25, ridgeX: -0.5, eaveY: 4.75, ridgeY: 6.9, depth: 12.8 };
const ROOF_SLOPE = (ROOF.ridgeY - ROOF.eaveY) / (ROOF.ridgeX - ROOF.xL);
/** Độ cao mái tại x (mặt dưới). */
const roofAt = (x: number) => ROOF.ridgeY - Math.abs(x - ROOF.ridgeX) * ROOF_SLOPE;

/**
 * Tiệm trát giấy Phúc Ký — gian trước bỏ kín hai mươi năm (x −7..−1, z −6..0) — và gác kho đồ mã phía trên cả căn nhà.
 *
 * Tiệm: bàn điểm nhãn, bảng "ba điều cấm", kệ hàng mã (ngựa giấy, nhà lầu, xe Dream, hộp iPhone giấy — đồ đời mới
 * trong một tiệm đóng cửa từ 2003), khung nan tre, ba hình nhân đứng quay mặt ra cửa tiệm, tủ hàng (chỗ trốn), tờ lịch
 * dừng ở Rằm tháng Bảy năm 2003, cầu thang gỗ lên gác.
 * Gác: mái ngói dốc, xà, ván sàn; hai dãy đồ mã cất kho, kệ đầu hình nhân, lồng đèn và khung nan treo, cái rương của
 * gia đình, đèn dầu, một hình nhân cỡ con nít ngồi quay mặt vào góc, dấu chân nhỏ trong bụi. Trăng lọt qua mái vỡ.
 */
export class PhucKy {
  private readonly shop: PropKit;
  private readonly attic: PropKit;
  private shopDolls: PaperDoll[] = [];
  private child?: PaperDoll;
  private hanging: TransformNode[] = [];
  private heads: TransformNode[] = [];
  /** Đầu hình nhân trên kệ quay theo người chơi (Đêm 3 trở đi, hoặc theo kịch bản). */
  private headsTrack = false;
  private lamp!: PointLight;
  private lampFlame!: Mesh;
  private lampLit = false;
  private trunkLid!: TransformNode;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    this.shop = new PropKit(scene, "shop");
    this.attic = new PropKit(scene, "gac");
    this.buildShopShell();
    this.buildWorkbench();
    this.buildShelves();
    this.buildShopFloor();
    this.buildStairs();
    this.buildAtticShell();
    this.buildAtticStorage();
    this.buildAtticProps();
    this.shop.finish();
    this.attic.finish();
    // Trăng ngoài vườn chiếu lên mái ngói và hai đầu hồi: đứng ở khu mộ nhìn về vẫn thấy khối nhà bà trên nền trời.
    for (const m of this.attic.meshes) if (/roofTile|Gable/.test(m.name)) house.yard.meshes.push(m);
    house.stairs.push(SHOP_STAIR);
    house.addBulb("shopLight", new Vector3(-3.8, 2.75, -2.8), 0.32, true, 6.5);

    house.anchors.set("shopMid", new Vector3(-3.6, 1.2, -2.6));
    house.anchors.set("shopDoor", new Vector3(-1.1, 1.2, -2.8));
    // Ngay phía trên phòng khách — tiếng bước chân "trên gác" nghe từ nhà dưới.
    house.anchors.set("atticOverhead", new Vector3(-3.4, F + 0.2, 2.6));
    house.anchors.set("atticMid", new Vector3(-0.5, F + 1.2, 1.0));
    house.anchors.set("atticChild", new Vector3(4.4, F + 0.6, 5.0));
    house.anchors.set("atticFar", new Vector3(2.2, F, 4.6));
    this.headsTrack = this.late;
  }

  /** Từ Đêm 3 (không tính giấc mơ năm 2003): hình nhân đã được điểm mắt. */
  private get late(): boolean {
    return this.house.night >= 3 && !this.house.past;
  }

  /** Mọi mesh trên gác — đèn dầu chỉ chiếu những mesh này (và thực thể). */
  get atticMeshes(): Mesh[] {
    return this.attic.meshes;
  }

  // ---------------------------------------------------------------- tiệm

  private buildShopShell(): void {
    const s = this.shop;
    const h = this.house;
    // Cửa từ hành lang: bản lề tại (x −1, z −3.3), mở vào trong tiệm (−x).
    const door = h.door("shopDoor", new Vector3(-1, 0, -3.3), new Vector3(0, 1.1, 0.5), [0.08, 2.2, 1.0], -Math.PI * 0.45);
    // Năm 2003 tiệm còn mở: cửa để ngỏ, chưa có giấy niêm.
    if (h.past) door.open = true;
    // Giấy niêm của thầy Sáu dán chéo mép cửa — đã rách, một nửa còn dính, một nửa rủ xuống.
    const seal = new StandardMaterial("shopSeal", this.scene);
    seal.diffuseTexture = new Texture(talismanUrl("shopSeal"), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    seal.specularColor = Color3.Black();
    seal.emissiveColor = new Color3(0.08, 0.07, 0.04);
    seal.backFaceCulling = false;
    for (const [y, z, roll] of h.past ? [] : ([[1.4, 0.15, 0.7], [1.1, 0.75, -0.9]] as const)) {
      const p = MeshBuilder.CreatePlane("shopSeal", { width: 0.12, height: 0.42 }, this.scene);
      p.parent = door.leaf;
      p.position.set(0.045, y - 1.1, z - 0.5);
      p.rotation.set(0, -Math.PI / 2, roll);
      p.material = seal;
      p.isPickable = false;
    }
    let opened = false;
    makeInteractable(door.leaf, {
      prompt: () => (door.open ? "Đóng cửa tiệm" : opened ? "Mở cửa tiệm" : "Cửa tiệm Phúc Ký"),
      interact: () => {
        door.toggle();
        this.game.audio.play("creak", new Vector3(-1, 1.2, -2.8));
        if (!opened) {
          opened = true;
          this.game.director.set("shop_opened");
          if (!h.past) this.game.hud.subtitle("Tiệm trát giấy của ông. Giấy niêm của thầy Sáu rách từ lâu —\ncó người mở cửa này trước mình rồi.", 5);
        }
      },
    });

    // Mặt tiền: cửa ván lùa đóng kín, ánh trăng lọt qua ba khe hở.
    const wood = h.surface("wood", 4, 1, new Color3(0.45, 0.36, 0.3));
    s.box("Shutter", 4.2, 2.4, 0.06, new Vector3(-3.7, 1.2, -5.87), wood, { solid: true });
    const slit = s.color("moonSlit", new Color3(0.5, 0.6, 0.8), 1);
    slit.disableLighting = true;
    for (const x of [-4.6, -3.4, -2.3]) {
      s.plane("Slit", 0.02, 2.0, new Vector3(x, 1.15, -5.835), slit, { rot: [0, Math.PI, 0] });
      this.shaft(s, new Vector3(x, 1.7, -5.8), new Vector3(x + 0.3, 0.01, -3.7), 0.09, 0.4);
    }
    // Biển hiệu cũ tháo xuống, dựa vào vách cầu thang.
    const sign = s.tex("sign", signUrl("PHÚC KÝ · HÀNG MÃ", "#5a1810", "#d8b65a"), { emissive: 0.06 });
    s.plane("Sign", 1.5, 0.38, new Vector3(-5.82, 0.5, -1.95), sign, { rot: [0, -Math.PI / 2, 0.1] });
    // Mạng nhện góc trần.
    const web = s.tex("web", cobwebUrl(), { alpha: true, emissive: 0.12 });
    for (const [x, z, yaw] of [[-6.6, -0.4, Math.PI * 0.75], [-1.4, -0.4, -Math.PI * 0.75]] as const) {
      s.plane("Web", 0.9, 0.9, new Vector3(x, 2.72, z), web, { rot: [0.55, yaw, 0] });
    }
  }

  /** Vệt sáng xiên: mặt phẳng cộng màu nối hai điểm (ánh trăng qua khe ván / mái vỡ). */
  private shaft(kit: PropKit, from: Vector3, to: Vector3, width: number, alpha: number): void {
    const m = new StandardMaterial(`${kit.prefix}Shaft`, this.scene);
    m.disableLighting = true;
    m.emissiveColor = new Color3(0.32, 0.4, 0.55);
    const t = new Texture(shaftUrl(), this.scene, false, true, Texture.BILINEAR_SAMPLINGMODE);
    t.hasAlpha = true;
    m.opacityTexture = t;
    m.alphaMode = 1;
    m.alpha = alpha;
    m.backFaceCulling = false;
    const d = to.subtract(from);
    const len = d.length();
    const p = MeshBuilder.CreatePlane(`${kit.prefix}Shaft`, { width, height: len }, this.scene);
    p.position = from.add(to).scale(0.5);
    // Trục dọc (Y) của mặt phẳng theo from→to; trục ngang (X) nằm ngang, vuông góc với nó.
    const y = d.scale(1 / len);
    let x = Vector3.Cross(y, Vector3.Up());
    if (x.lengthSquared() < 1e-4) x = new Vector3(1, 0, 0);
    x.normalize();
    p.rotation = Vector3.RotationFromAxis(x, y, Vector3.Cross(x, y).normalize());
    p.isPickable = false;
    p.material = m;
    kit.meshes.push(p);
  }

  private buildShopFloor(): void {
    const s = this.shop;
    // Nền xi măng cũ đè lên gạch bông của nhà.
    const cement = this.house.surface("ceiling", 3, 3, new Color3(0.42, 0.41, 0.39));
    s.box("Floor", 5.8, 0.01, 5.8, new Vector3(-4, 0.006, -3), cement);
    // Vàng mã, giấy vụn, nan tre gãy vương trên sàn.
    const joss = s.tex("joss", jossPaperUrl(), { emissive: 0.05 });
    for (let i = 0; i < 26; i++) {
      s.plane("Joss", 0.14, 0.14, new Vector3(-6.4 + Math.random() * 5, 0.012 + i * 0.0002, -5.5 + Math.random() * 5), joss, {
        rot: [Math.PI / 2, Math.random() * Math.PI, 0],
      });
    }
    const bamboo = s.color("bamboo", new Color3(0.55, 0.45, 0.25));
    for (let i = 0; i < 14; i++) {
      s.box("Strip", 0.012, 0.006, 0.4 + Math.random() * 0.5, new Vector3(-5.5 + Math.random() * 4, 0.01, -5 + Math.random() * 4), bamboo, {
        rot: [0, Math.random() * Math.PI, 0],
      });
    }
    // Ba khung nan tre hình người, chưa phết giấy, dựng dọc vách cầu thang.
    for (const z of [-4.3, -3.5, -2.7]) this.bambooFrame(s, new Vector3(-5.55, 0, z), bamboo, 1);

    // Ba hình nhân giấy đứng thành hàng giữa tiệm, quay mặt ra cửa ván (về phía −z).
    [
      [-4.4, -3.15, "girl", 2],
      [-3.6, -3.35, "boy", 3],
      [-2.8, -3.15, "standIn", 0],
    ].forEach(([x, z, kind, v], i) => {
      const d = buildPaperDoll(this.scene, `shopDoll${i}`, kind as "girl" | "boy" | "standIn", v as number);
      d.root.position.set(x as number, 0, z as number);
      d.root.rotation.y = Math.PI;
      if (kind === "standIn") d.setFace("blank");
      // Đêm Rằm năm 2003: con thế thân cao bằng đứa nhỏ sáu tuổi, mặt trùm vải đỏ.
      if (kind === "standIn" && this.house.past) {
        d.root.scaling.setAll(0.62);
        const veil = MeshBuilder.CreateBox("shopVeil", { width: 0.3, height: 0.34, depth: 0.3 }, this.scene);
        veil.parent = d.root;
        veil.position.y = d.faceHeight;
        veil.material = s.color("veil", new Color3(0.5, 0.06, 0.05), 0.05);
        veil.isPickable = true;
        makeInteractable(veil, {
          prompt: () => "Con hình nhân trùm khăn đỏ",
          interact: () => {
            this.game.hud.subtitle("Con hình nhân cao bằng mình. Khăn đỏ trùm kín mặt.\nNgón tay nó có vết mực, y như ngón tay mình.", 4.5);
            this.game.director.set("saw_veiled_doll");
          },
        });
      }
      this.shopDolls.push(d);
    });
    this.house.targets.set("shopDolls", this.shopDolls[1].body);

    // Xe Dream giấy: cất trên gác — chỗ sát cửa ván để mấy cỗ hòm của tiệm (xem Coffins).
    this.paperBike(this.attic, new Vector3(1.6, F, -4.6));
    // Chồng thỏi vàng giấy, nhà lầu giấy.
    const gold = s.color("goldPaper", new Color3(0.75, 0.58, 0.18), 0.08);
    for (let i = 0; i < 9; i++) {
      s.box("Gold", 0.16, 0.05, 0.08, new Vector3(-2.2 + (i % 3) * 0.18, 0.03 + Math.floor(i / 3) * 0.05, -5.35), gold);
    }
    this.paperHouse(s, new Vector3(-1.95, 0, -4.0), 0.9);

    // Tủ hàng: chỗ trốn thứ hai trong nhà.
    const cab = this.house.surface("wood", 1, 2, new Color3(0.5, 0.4, 0.32));
    const cabinet = s.box("Cabinet", 0.6, 2.0, 1.1, new Vector3(-1.42, 1.0, -1.2), cab, { solid: true, keep: true });
    const seam = s.color("seam", new Color3(0.02, 0.015, 0.01));
    s.plane("Seam", 0.025, 1.8, new Vector3(-1.725, 1.05, -1.2), seam, { rot: [0, Math.PI / 2, 0] });
    const spot: HidingSpot = {
      inside: new Vector3(-1.42, 1.6, -1.2),
      insideYaw: -Math.PI / 2,
      outside: new Vector3(-2.35, 1.6, -1.2),
      outsideYaw: -Math.PI / 2,
      front: new Vector3(-2.5, 0, -1.2),
    };
    makeInteractable(cabinet, {
      prompt: () => (this.game.director.has("ending") ? null : this.house.dangerous ? "Trốn vào tủ hàng" : "Tủ hàng"),
      interact: () => {
        if (!this.house.dangerous) {
          this.game.hud.subtitle("Tủ đựng hàng mã. Bên trong chỉ còn mùi hồ dán… và đủ chỗ cho một người đứng.", 4);
          return;
        }
        this.game.hide(spot);
      },
    });
  }

  private buildWorkbench(): void {
    const s = this.shop;
    const wood = this.house.surface("wood", 2, 1, new Color3(0.5, 0.38, 0.3));
    s.box("Bench", 2.6, 0.06, 0.8, new Vector3(-3.6, 0.82, -0.55), wood, { solid: true });
    for (const [x, z] of [[-4.8, -0.25], [-2.4, -0.25], [-4.8, -0.85], [-2.4, -0.85]]) {
      s.box("BenchLeg", 0.07, 0.8, 0.07, new Vector3(x, 0.4, z), wood, { solid: true });
    }
    // Bảng "ba điều cấm" trên tường, ngay trên bàn.
    // (Tường bắc của tiệm ở z = 0, mặt trong nhìn về −z: mặt phẳng mặc định đã quay đúng hướng.)
    s.plane("Taboos", 1.3, 0.42, new Vector3(-3.6, 1.78, -0.115), s.tex("plaque", plaqueUrl(), { emissive: 0.08 }));
    // Hũ màu: đỏ, đen, trắng.
    const pots: [number, Color3][] = [[-4.55, new Color3(0.55, 0.06, 0.04)], [-4.38, new Color3(0.04, 0.04, 0.04)], [-4.21, new Color3(0.8, 0.78, 0.72)]];
    for (const [x, c] of pots) {
      s.cyl("Pot", 0.1, 0.09, 0.09, new Vector3(x, 0.895, -0.42), s.color(`pot${x}`, new Color3(0.3, 0.25, 0.2)));
      s.cyl("Paint", 0.085, 0.085, 0.005, new Vector3(x, 0.94, -0.42), s.color(`paint${x}`, c, 0.1));
    }
    // Ống bút điểm nhãn — tương tác.
    const jar = s.cyl("BrushJar", 0.08, 0.07, 0.13, new Vector3(-3.95, 0.915, -0.4), s.color("jar", new Color3(0.4, 0.42, 0.45)), { keep: true });
    jar.isPickable = true;
    const brush = s.color("brush", new Color3(0.3, 0.2, 0.1));
    for (let i = 0; i < 5; i++) {
      s.cyl("Brush", 0.008, 0.008, 0.26, new Vector3(-3.95 + (Math.random() - 0.5) * 0.04, 1.03, -0.4 + (Math.random() - 0.5) * 0.04), brush, {
        rot: [(Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3],
      });
    }
    makeInteractable(jar, {
      prompt: () => "Ống bút điểm nhãn",
      interact: () => {
        this.game.hud.subtitle(
          this.house.past
            ? "Bút điểm nhãn của ông. Ông từng cầm tay mình chấm thử một lần.\nBà la quá trời."
            : this.late
              ? "Bút điểm nhãn của ông. …Ngòi còn ướt mực đen.\nAi vừa dùng tới nó?"
              : "Bút điểm nhãn của ông. Ngòi khô cứng, hai mươi năm rồi không ai đụng tới.",
          4.5,
        );
        if (this.late) this.game.director.set("saw_wet_brush");
      },
    });
    // Một cái đầu hình nhân chưa vẽ mặt, cắm trên que.
    const face = s.tex(this.late ? "headPainted" : "headBlank", effigyFaceUrl(this.late ? "painted" : "blank"), { emissive: 0.08 });
    s.cyl("HeadStick", 0.02, 0.02, 0.3, new Vector3(-2.9, 1.0, -0.5), brush);
    const head = s.sphere("HeadBack", 0.24, new Vector3(-2.9, 1.25, -0.5), s.tex("hair", hairUrl()), { keep: true });
    head.isPickable = true;
    s.plane("HeadFace", 0.2, 0.26, new Vector3(-2.9, 1.25, -0.62), face);
    makeInteractable(head, {
      prompt: () => "Đầu hình nhân",
      interact: () =>
        this.game.hud.subtitle(
          this.late
            ? "Hôm qua cái đầu này còn trơn. Giờ nó có mắt — hai chấm tròn, gọn gàng."
            : "Đầu hình nhân chưa vẽ mặt. Ông dặn: mặt thì vẽ, mắt thì không bao giờ.",
          4.5,
        ),
    });
    // Hộp "iPhone" bằng giấy — hàng mã đời mới trong một tiệm đóng cửa từ 2003.
    const phone = s.box("PaperPhone", 0.09, 0.02, 0.16, new Vector3(-3.3, 0.86, -0.75), s.tex("phone", paperPhoneUrl(), { emissive: 0.06 }), {
      keep: true,
      rot: [0, 0.3, 0],
    });
    phone.isPickable = true;
    // Năm 2003 chưa có cái máy này.
    if (this.house.past) phone.setEnabled(false);
    makeInteractable(phone, {
      prompt: () => "Hộp giấy nhỏ",
      interact: () => {
        this.game.hud.subtitle("Hộp “iPhone 15” bằng giấy — hàng mã đời mới, dán tem chữ Hán.\nCái máy này ra năm ngoái. Tiệm của ông đóng cửa từ năm 2003.", 6);
        this.game.director.set("saw_paper_phone");
      },
    });
    // Tờ lịch năm 2003 bên phải bàn.
    const cal = s.plane("Calendar2003", 0.26, 0.34, new Vector3(-1.75, 1.6, -0.115), s.tex("cal2003", calendar2003Url(), { emissive: 0.06 }), {
      keep: true,
    });
    cal.isPickable = true;
    makeInteractable(cal, {
      prompt: () => "Xem lịch cũ",
      interact: () => {
        this.game.openNote(notes.calendar2003);
        this.game.director.set("read_calendar2003");
      },
    });
  }

  /** Kệ hàng mã dọc tường đông (phía nam cửa): ngựa giấy, hộp quần áo giấy, xấp vàng mã. */
  private buildShelves(): void {
    const s = this.shop;
    const wood = s.color("shelfWood", new Color3(0.22, 0.14, 0.08));
    for (const z of [-5.7, -3.65]) s.box("ShelfPost", 0.05, 2.1, 0.05, new Vector3(-1.35, 1.05, z), wood, { solid: true });
    for (const y of [0.5, 1.15, 1.8]) s.box("Shelf", 0.5, 0.03, 2.1, new Vector3(-1.38, y, -4.68), wood, { solid: true });
    const white = s.color("whitePaper", new Color3(0.86, 0.84, 0.78), 0.06);
    const red = s.color("redPaper", new Color3(0.6, 0.1, 0.07), 0.06);
    const joss = s.tex("joss", jossPaperUrl(), { emissive: 0.05 });
    for (const z of [-5.3, -4.4]) this.paperHorse(s, new Vector3(-1.4, 1.165, z), 0.55, z < -5 ? white : red);
    for (let i = 0; i < 4; i++) s.box("ClothesBox", 0.3, 0.12, 0.4, new Vector3(-1.4, 0.58 + i * 0.12, -5.1 + (i % 2) * 0.05), i % 2 ? red : white);
    for (let i = 0; i < 6; i++) s.box("JossStack", 0.25, 0.06, 0.25, new Vector3(-1.4, 1.85 + i * 0.06, -4.0 - (i % 2) * 0.3), joss);
  }

  private paperHorse(s: PropKit, at: Vector3, scale: number, mat: StandardMaterial): void {
    const k = scale;
    s.box("HorseBody", 0.18 * k, 0.22 * k, 0.55 * k, at.add(new Vector3(0, 0.5 * k, 0)), mat);
    s.box("HorseNeck", 0.12 * k, 0.32 * k, 0.12 * k, at.add(new Vector3(0, 0.72 * k, 0.24 * k)), mat, { rot: [-0.4, 0, 0] });
    s.box("HorseHead", 0.11 * k, 0.12 * k, 0.24 * k, at.add(new Vector3(0, 0.88 * k, 0.36 * k)), mat);
    for (const [dx, dz] of [[-0.06, -0.2], [0.06, -0.2], [-0.06, 0.2], [0.06, 0.2]]) {
      s.box("HorseLeg", 0.04 * k, 0.4 * k, 0.04 * k, at.add(new Vector3(dx * k, 0.2 * k, dz * k)), mat);
    }
  }

  private paperHouse(s: PropKit, at: Vector3, scale: number): void {
    const wall = s.color("houseWall", new Color3(0.82, 0.74, 0.55), 0.06);
    const roof = s.color("houseRoof", new Color3(0.55, 0.12, 0.08), 0.06);
    const win = s.color("houseWin", new Color3(0.15, 0.25, 0.4), 0.15);
    s.box("HouseBody", 0.6 * scale, 0.7 * scale, 0.5 * scale, at.add(new Vector3(0, 0.35 * scale, 0)), wall, { solid: true });
    s.box("HouseTop", 0.5 * scale, 0.4 * scale, 0.4 * scale, at.add(new Vector3(0, 0.9 * scale, 0)), wall);
    s.cyl("HouseRoof", 0, 0.62 * scale, 0.28 * scale, at.add(new Vector3(0, 1.24 * scale, 0)), roof, { sides: 4, rot: [0, Math.PI / 4, 0] });
    for (const y of [0.3, 0.9]) s.plane("HouseWin", 0.14 * scale, 0.16 * scale, at.add(new Vector3(0, y * scale, 0.251 * scale)), win, { rot: [0, Math.PI, 0] });
  }

  /** Xe Dream bằng giấy, đủ bánh, đèn, biển số. */
  private paperBike(s: PropKit, at: Vector3): void {
    const red = s.color("bikeRed", new Color3(0.55, 0.1, 0.08), 0.06);
    const black = s.color("bikeBlack", new Color3(0.06, 0.06, 0.06));
    for (const dz of [-0.42, 0.42]) s.torus("BikeWheel", 0.42, 0.06, at.add(new Vector3(0, 0.22, dz)), black, { rot: [0, 0, Math.PI / 2] });
    const body = s.box("BikeBody", 0.24, 0.28, 0.8, at.add(new Vector3(0, 0.46, 0)), red, { keep: true });
    s.box("BikeSeat", 0.2, 0.06, 0.4, at.add(new Vector3(0, 0.63, -0.12)), black);
    s.box("BikeBars", 0.5, 0.03, 0.03, at.add(new Vector3(0, 0.78, 0.4)), black);
    s.box("BikePlate", 0.14, 0.08, 0.01, at.add(new Vector3(0, 0.42, -0.46)), s.color("plate", new Color3(0.85, 0.85, 0.8), 0.1));
    body.isPickable = true;
    makeInteractable(body, {
      prompt: () => "Xe Dream giấy",
      interact: () =>
        this.game.hud.subtitle("Xe Dream bằng giấy, đủ cả biển số với gương chiếu hậu.\nÔng hay nói: người dưới đó cũng phải đi làm, đâu thể đi bộ hoài.", 5.5),
    });
  }

  /** Khung nan tre hình người: xương sống, vai, hông, hai tay — hình nhân trước khi phết giấy. */
  private bambooFrame(s: PropKit, at: Vector3, mat: StandardMaterial, scale: number): void {
    const k = scale;
    s.cyl("FrameSpine", 0.02, 0.02, 1.5 * k, at.add(new Vector3(0, 0.75 * k, 0)), mat);
    s.torus("FrameShoulder", 0.38 * k, 0.015, at.add(new Vector3(0, 1.25 * k, 0)), mat);
    s.torus("FrameHip", 0.42 * k, 0.015, at.add(new Vector3(0, 0.65 * k, 0)), mat);
    s.torus("FrameHead", 0.24 * k, 0.012, at.add(new Vector3(0, 1.48 * k, 0)), mat, { rot: [Math.PI / 2, 0, 0] });
    for (const side of [-1, 1]) {
      s.cyl("FrameArm", 0.015, 0.015, 0.7 * k, at.add(new Vector3(side * 0.24 * k, 0.95 * k, 0)), mat, { rot: [0, 0, side * 0.12] });
    }
    s.cyl("FrameBase", 0.3 * k, 0.3 * k, 0.03, at.add(new Vector3(0, 0.015, 0)), mat);
  }

  // ---------------------------------------------------------------- cầu thang

  private buildStairs(): void {
    const s = this.shop;
    const st = SHOP_STAIR;
    const wood = this.house.surface("wood", 1, 0.3, new Color3(0.55, 0.42, 0.32));
    const steps = 16;
    const run = (st.z1 - st.z0) / steps;
    const rise = (st.y1 - st.y0) / steps;
    const cx = (st.x0 + st.x1) / 2;
    for (let i = 0; i < steps; i++) {
      // Bậc chỉ để nhìn: Player tự nâng camera theo dốc (va chạm bậc của Babylon không ổn định).
      s.box("Step", st.x1 - st.x0, 0.05, run + 0.04, new Vector3(cx, (i + 1) * rise - 0.025, st.z0 + (i + 0.5) * run), wood);
      s.box("Riser", st.x1 - st.x0, rise, 0.025, new Vector3(cx, (i + 0.5) * rise, st.z0 + i * run), wood);
    }
    // Vách che một bên cầu thang, cao lên tới lan can trên gác: không đi tắt từ giữa tiệm lên được, không rơi xuống lỗ.
    const plaster = this.house.surface("wall", 1, 1, new Color3(0.8, 0.7, 0.55));
    s.box("StairWall", 0.1, F + 0.95, 3.4, new Vector3(-5.9, (F + 0.95) / 2, -3.2), plaster, { solid: true });
    // Lan can trên gác, mép nam của lỗ cầu thang.
    const rail = this.house.surface("wood", 1, 1, new Color3(0.4, 0.3, 0.22));
    s.box("Rail", 1.12, 0.06, 0.08, new Vector3(-6.42, F + 0.95, STAIR_HOLE.z0 - 0.05), rail, { solid: true });
    s.box("RailLow", 1.12, 0.95, 0.04, new Vector3(-6.42, F + 0.475, STAIR_HOLE.z0 - 0.05), rail, { solid: true });
    // Tay vịn bám vách, cao hơn mặt bậc ~0,9 m, nghiêng theo dốc thang.
    const midZ = (st.z0 + st.z1) / 2;
    s.box("Handrail", 0.06, 0.06, 4.6, new Vector3(-5.98, (st.y0 + st.y1) / 2 + 0.9, midZ), rail, { rot: [-Math.atan2(st.y1 - st.y0, st.z1 - st.z0), 0, 0] });
  }

  // ---------------------------------------------------------------- gác: vỏ

  private buildAtticShell(): void {
    const a = this.attic;
    // Ván sàn (chỉ để nhìn — va chạm là các tấm trần nhà dưới).
    const planks = this.house.surface("wood", 6, 6, new Color3(0.42, 0.33, 0.26));
    const hole = STAIR_HOLE;
    const floors: [number, number, number, number][] = [
      [hole.x1, 6.2, -6.2, 6.2],
      [-7.2, hole.x1, -6.2, hole.z0],
      [-7.2, hole.x1, hole.z1, 6.2],
    ];
    for (const [x0, x1, z0, z1] of floors) a.box("Floor", x1 - x0, 0.01, z1 - z0, new Vector3((x0 + x1) / 2, F + 0.006, (z0 + z1) / 2), planks);

    // Tường thấp hai bên (đỡ mái).
    const knee = this.house.surface("wall", 4, 0.5, new Color3(0.5, 0.44, 0.36));
    const kneeH = ROOF.eaveY - F;
    for (const x of [ROOF.xL + 0.1, ROOF.xR - 0.1]) a.box("Knee", 0.12, kneeH, 12.4, new Vector3(x, F + kneeH / 2, 0), knee, { solid: true });

    // Mái: hai tấm dốc, mặt trong ván gỗ đen; mặt ngoài lợp ngói (thấy được từ vườn).
    const inner = this.house.surface("wood", 4, 6, new Color3(0.28, 0.21, 0.16));
    const tiles = a.tex("roofTile", roofTileUrl(), { u: 12, v: 6, emissive: 0.02 });
    const run = ROOF.ridgeX - ROOF.xL;
    const rise = ROOF.ridgeY - ROOF.eaveY;
    const len = Math.hypot(run, rise) + 0.1;
    const ang = Math.atan2(rise, run);
    for (const side of [-1, 1]) {
      const cx = side < 0 ? (ROOF.xL + ROOF.ridgeX) / 2 : (ROOF.xR + ROOF.ridgeX) / 2;
      const cy = (ROOF.eaveY + ROOF.ridgeY) / 2;
      const rz = side < 0 ? ang : -ang;
      a.box("Roof", len, 0.12, ROOF.depth, new Vector3(cx, cy + 0.06, 0), inner, { solid: true, rot: [0, 0, rz] });
      const n = new Vector3(side < 0 ? -Math.sin(ang) : Math.sin(ang), Math.cos(ang), 0);
      a.box("Tiles", len + 0.3, 0.06, ROOF.depth + 0.4, new Vector3(cx, cy + 0.06, 0).add(n.scale(0.1)), tiles, { rot: [0, 0, rz] });
      // Kèo: thanh gỗ dưới mái, mỗi 1,6 m.
      const beam = a.color("beam", new Color3(0.14, 0.09, 0.05));
      for (let z = -5.6; z <= 5.7; z += 1.6) {
        a.box("Rafter", len, 0.12, 0.09, new Vector3(cx, cy, z).add(n.scale(-0.06)), beam, { rot: [0, 0, rz] });
      }
    }
    const beam = a.color("beam", new Color3(0.14, 0.09, 0.05));
    a.box("Ridge", 0.2, 0.22, ROOF.depth, new Vector3(ROOF.ridgeX, ROOF.ridgeY - 0.12, 0), beam);
    // Xà ngang tầm 6 m — treo lồng đèn và khung nan.
    const tieY = 6.0;
    const halfSpan = (ROOF.ridgeY - tieY) / ROOF_SLOPE;
    for (const z of [-4.8, -1.6, 1.6, 4.8]) {
      a.box("Tie", halfSpan * 2, 0.12, 0.1, new Vector3(ROOF.ridgeX, tieY, z), beam);
    }

    // Hai đầu hồi (ngũ giác), có lỗ thông gió tròn ở hồi bắc — trăng lọt vào.
    const gable = this.house.surface("wall", 4, 1, new Color3(0.45, 0.4, 0.33));
    for (const z of [-6.25, 6.25]) {
      const g = new Mesh(`gacGable${z}`, this.scene);
      const pts = [
        [ROOF.xL, F],
        [ROOF.xR, F],
        [ROOF.xR, ROOF.eaveY],
        [ROOF.ridgeX, ROOF.ridgeY],
        [ROOF.xL, ROOF.eaveY],
      ];
      const vd = new VertexData();
      vd.positions = pts.flatMap(([x, y]) => [x, y, z]);
      vd.indices = [0, 2, 1, 0, 3, 2, 0, 4, 3];
      vd.uvs = pts.flatMap(([x, y]) => [(x - ROOF.xL) / 3, (y - F) / 3]);
      const normals: number[] = [];
      VertexData.ComputeNormals(vd.positions, vd.indices, normals);
      vd.normals = normals;
      vd.applyToMesh(g);
      g.material = gable;
      gable.backFaceCulling = false;
      g.isPickable = true;
      a.meshes.push(g);
      // Va chạm: khối vô hình (ngũ giác không cần chính xác — mái đã chặn hai bên).
      const c = MeshBuilder.CreateBox("gacGableCollider", { width: ROOF.xR - ROOF.xL, height: ROOF.ridgeY - F, depth: 0.15 }, this.scene);
      c.position.set((ROOF.xL + ROOF.xR) / 2, (F + ROOF.ridgeY) / 2, z);
      c.isVisible = false;
      c.isPickable = false;
      c.checkCollisions = true;
    }
    const vent = a.color("vent", new Color3(0.4, 0.5, 0.7), 1);
    vent.disableLighting = true;
    const disc = MeshBuilder.CreateDisc("gacVent", { radius: 0.32, tessellation: 18 }, this.scene);
    disc.position.set(ROOF.ridgeX, 5.4, 6.22);
    disc.rotation.y = Math.PI;
    disc.material = vent;
    disc.isPickable = false;
    a.meshes.push(disc);
    this.shaft(a, new Vector3(ROOF.ridgeX, 5.4, 6.1), new Vector3(ROOF.ridgeX - 0.6, F + 0.01, 3.2), 0.5, 0.3);
    // Hai chỗ ngói vỡ trên mái tây: lỗ sáng nhỏ + vệt trăng xiên xuống sàn.
    for (const [x, z] of [[-3.0, 2.2], [-2.2, -4.4]]) {
      const y = roofAt(x);
      a.box("Gap", 0.3, 0.02, 0.24, new Vector3(x, y - 0.03, z), vent, { rot: [0, 0, ang] });
      this.shaft(a, new Vector3(x, y - 0.05, z), new Vector3(x + 1.2, F + 0.01, z + 0.4), 0.32, 0.35);
    }
  }

  // ---------------------------------------------------------------- gác: đồ cất kho

  private buildAtticStorage(): void {
    const a = this.attic;
    const crate = this.house.surface("wood", 1, 1, new Color3(0.42, 0.33, 0.24));
    const cloth = a.tex("dustSheet", clothUrl(), { emissive: 0.08 });
    // Thùng gỗ chồng sát tường, vài thùng trùm vải.
    const crates: [number, number, number][] = [
      [-6.4, 5.4, 2], [-5.7, 5.5, 1], [5.3, -5.4, 2], [4.6, -5.5, 1], [3.7, 5.5, 1], [5.4, 4.4, 2], [-6.4, -5.3, 1],
    ];
    for (const [x, z, n] of crates) {
      for (let i = 0; i < n; i++) a.box("Crate", 0.6, 0.55, 0.6, new Vector3(x, F + 0.275 + i * 0.55, z), crate, { solid: true, rot: [0, (Math.random() - 0.5) * 0.3, 0] });
      if (n === 2) a.box("Sheet", 0.66, 0.02, 0.66, new Vector3(x, F + 1.12, z), cloth);
    }
    // Ngựa giấy, nhà lầu giấy cất dọc tường tây.
    const white = a.color("whitePaper", new Color3(0.86, 0.84, 0.78), 0.06);
    const red = a.color("redPaper", new Color3(0.6, 0.1, 0.07), 0.06);
    for (const [z, mat] of [[1.4, white], [2.8, red], [4.0, white]] as const) this.paperHorse(a, new Vector3(-6.3, F, z), 1.3, mat);
    this.paperHouse(a, new Vector3(-6.2, F, -0.2), 1.1);
    this.paperHouse(a, new Vector3(5.4, F, -3.6), 1.3);
    // Kệ đầu hình nhân dọc tường đông: chín cái đầu chưa thân, mặt hướng vào lối đi.
    const shelf = a.color("shelfWood", new Color3(0.22, 0.14, 0.08));
    a.box("HeadShelf", 0.45, 0.04, 6.2, new Vector3(5.55, F + 1.05, 0), shelf, { solid: true });
    for (const z of [-3, 3]) a.box("HeadShelfLeg", 0.05, 1.05, 0.05, new Vector3(5.5, F + 0.52, z), shelf, { solid: true });
    // Mặt giấy không tự sáng: chỉ hiện ra khi bị đèn pin hay đèn dầu rọi tới.
    const face = a.tex("headFace", effigyFaceUrl(this.late ? "painted" : "blank"), { emissive: 0.015 });
    const hair = a.tex("hair", hairUrl());
    for (let i = 0; i < 9; i++) {
      const root = new TransformNode("gacHead", this.scene);
      root.position.set(5.5, F + 1.2, -2.8 + i * 0.7);
      root.rotation.y = -Math.PI / 2;
      const back = MeshBuilder.CreateSphere("gacHeadBack", { diameter: 0.24, segments: 6 }, this.scene);
      back.parent = root;
      back.material = hair;
      back.isPickable = false;
      const f = MeshBuilder.CreatePlane("gacHeadFace", { width: 0.2, height: 0.26 }, this.scene);
      f.parent = root;
      f.position.z = 0.125;
      f.rotation.y = Math.PI;
      f.material = face;
      f.isPickable = false;
      a.meshes.push(back, f);
      this.heads.push(root);
    }
    // Khối vô hình bao cả kệ: dùng để biết người chơi có đang nhìn về phía kệ không.
    const shelfMark = MeshBuilder.CreateBox("gacHeadsMark", { width: 0.4, height: 0.5, depth: 6.4 }, this.scene);
    shelfMark.position.set(5.5, F + 1.2, 0);
    shelfMark.isVisible = false;
    shelfMark.isPickable = false;
    this.house.targets.set("atticHeads", shelfMark);
    // Bó nan tre, chiếu cói cuộn dựa tường.
    const bamboo = a.color("bamboo", new Color3(0.55, 0.45, 0.25));
    for (let i = 0; i < 6; i++) a.cyl("BambooBundle", 0.02, 0.02, 2.2, new Vector3(-6.6 + i * 0.05, F + 1.0, -0.9), bamboo, { rot: [0, 0, 0.35] });
    const mat = a.color("mat", new Color3(0.5, 0.42, 0.25));
    for (const z of [-2.0, -1.7]) a.cyl("RolledMat", 0.25, 0.25, 1.6, new Vector3(4.9, F + 0.9, z), mat, { rot: [0, 0, 0.25], sides: 10 });
  }

  private buildAtticProps(): void {
    const a = this.attic;
    // Lồng đèn giấy đỏ và khung nan hình người treo trên xà — đung đưa khi có gió lùa qua mái vỡ.
    const lantern = a.tex("lantern", lanternUrl(), { emissive: 0.12 });
    const string = a.color("string", new Color3(0.3, 0.27, 0.22));
    for (const [x, z] of [[-2.4, -4.8], [1.4, -1.6], [-2.2, 1.6], [1.2, 4.8]]) {
      const pivot = new TransformNode("gacLanternPivot", this.scene);
      pivot.position.set(x, 5.94, z);
      const l = MeshBuilder.CreateSphere("gacLantern", { diameter: 0.34, segments: 8 }, this.scene);
      l.scaling.y = 1.25;
      l.parent = pivot;
      l.position.y = -0.55;
      l.material = lantern;
      l.isPickable = false;
      const s = MeshBuilder.CreateCylinder("gacLanternString", { diameter: 0.008, height: 0.35, tessellation: 3 }, this.scene);
      s.parent = pivot;
      s.position.y = -0.18;
      s.material = string;
      s.isPickable = false;
      a.meshes.push(l, s);
      this.hanging.push(pivot);
    }
    const bamboo = a.color("bamboo", new Color3(0.55, 0.45, 0.25));
    // Treo lệch khỏi lối đi giữa (gần kệ đầu hình nhân), chân khung lơ lửng ngang ngực.
    for (const z of [-3.2, 0.1, 3.2]) {
      const pivot = new TransformNode("gacFramePivot", this.scene);
      pivot.position.set(3.0, 5.6, z);
      const kit = new PropKit(this.scene, "gac");
      this.bambooFrame(kit, new Vector3(0, -1.45, 0), bamboo, 0.8);
      kit.finish();
      for (const m of kit.meshes) {
        m.parent = pivot;
        a.meshes.push(m);
      }
      const rope = MeshBuilder.CreateCylinder("gacFrameRope", { diameter: 0.008, height: 0.25, tessellation: 3 }, this.scene);
      rope.parent = pivot;
      rope.position.y = -0.12;
      rope.material = string;
      a.meshes.push(rope);
      this.hanging.push(pivot);
    }

    // Rương gỗ của gia đình ở cuối gác (hồi bắc): Đêm 1 có vở cũ của Út, Đêm 3 có ảnh.
    const wood = this.house.surface("wood", 1, 1, new Color3(0.38, 0.24, 0.16));
    const brass = a.color("brass", new Color3(0.55, 0.42, 0.18), 0.05);
    const trunk = a.box("Trunk", 1.1, 0.5, 0.6, new Vector3(ROOF.ridgeX, F + 0.25, 5.45), wood, { solid: true, keep: true });
    a.box("TrunkBand", 1.12, 0.06, 0.62, new Vector3(ROOF.ridgeX, F + 0.32, 5.45), brass);
    this.trunkLid = new TransformNode("gacTrunkHinge", this.scene);
    this.trunkLid.position.set(ROOF.ridgeX, F + 0.5, 5.75);
    const lid = MeshBuilder.CreateBox("gacTrunkLid", { width: 1.12, height: 0.08, depth: 0.62 }, this.scene);
    lid.parent = this.trunkLid;
    lid.position.set(0, 0.04, -0.31);
    lid.material = wood;
    lid.isPickable = false;
    a.meshes.push(lid);
    let opened = false;
    makeInteractable(trunk, {
      prompt: () => {
        const n = this.house.night;
        // Năm 2003 cái vở tập làm văn còn chưa viết.
        if (this.house.past) return null;
        if (n === 3) return this.game.director.has("has_photo") ? null : this.game.director.has("read_master_note") ? "Lục cái rương" : "Rương gỗ";
        return opened ? "Đọc lại vở cũ" : "Mở rương";
      },
      interact: () => {
        const n = this.house.night;
        if (!opened) {
          opened = true;
          this.trunkLid.rotation.x = 1.2;
          this.game.audio.play("creak", trunk.position);
        }
        if (n === 3) {
          if (!this.game.director.has("read_master_note")) {
            this.game.hud.subtitle("Rương đồ cũ của nhà mình. Mùi long não xộc lên.", 3.5);
            return;
          }
          this.house.collect("photo", "Ảnh thẻ của mình hồi cấp ba, kẹp trong album gia đình.\nSau lưng bà ghi: “Út — đừng để nó lấy.”");
          return;
        }
        // Các đêm khác: quyển vở tập làm văn hồi lớp Một của Út.
        this.game.openNote(notes.schoolEssay);
        this.game.director.set("read_school_essay");
      },
    });

    // Đèn dầu trên thùng gỗ gần đầu cầu thang — thắp lên thì gác có một quầng sáng vàng.
    const crate = this.house.surface("wood", 1, 1, new Color3(0.42, 0.33, 0.24));
    a.box("LampCrate", 0.5, 0.5, 0.5, new Vector3(-4.7, F + 0.25, -0.5), crate, { solid: true });
    const base = a.cyl("LampBase", 0.12, 0.14, 0.08, new Vector3(-4.7, F + 0.54, -0.5), brass, { keep: true });
    base.isPickable = true;
    const glass = new StandardMaterial("gacLampGlass", this.scene);
    glass.diffuseColor = new Color3(0.6, 0.65, 0.6);
    glass.alpha = 0.35;
    glass.specularColor = new Color3(0.3, 0.3, 0.3);
    const chimney = MeshBuilder.CreateCylinder("gacLampGlass", { diameterTop: 0.06, diameterBottom: 0.1, height: 0.2, tessellation: 10 }, this.scene);
    chimney.position.set(-4.7, F + 0.68, -0.5);
    chimney.material = glass;
    chimney.isPickable = false;
    a.meshes.push(chimney);
    const flameMat = a.color("lampFlame", new Color3(1, 0.65, 0.25), 1);
    flameMat.disableLighting = true;
    this.lampFlame = MeshBuilder.CreateSphere("gacLampFlame", { diameter: 0.03, segments: 4 }, this.scene);
    this.lampFlame.position.set(-4.7, F + 0.66, -0.5);
    this.lampFlame.scaling.y = 1.8;
    this.lampFlame.material = flameMat;
    this.lampFlame.isPickable = false;
    this.lampFlame.setEnabled(false);
    a.meshes.push(this.lampFlame);
    // Trăng lọt qua mái vỡ và lỗ thông gió: rất yếu, lạnh — đủ để thấy hình khối, không đủ để thấy mặt.
    const moon = new PointLight("gacMoonFill", new Vector3(-1.5, 6.2, 1.5), this.scene);
    moon.diffuse = new Color3(0.45, 0.55, 0.8);
    moon.specular = Color3.Black();
    moon.range = 13;
    moon.intensity = 0.42;
    this.lamp = new PointLight("gacLamp", new Vector3(-4.7, F + 0.75, -0.5), this.scene);
    this.lamp.diffuse = new Color3(1, 0.7, 0.4);
    this.lamp.specular = Color3.Black();
    this.lamp.range = 8;
    this.lamp.intensity = 0;
    makeInteractable(base, {
      prompt: () => (this.lampLit ? "Tắt đèn dầu" : "Thắp đèn dầu"),
      interact: () => {
        this.lampLit = !this.lampLit;
        this.lampFlame.setEnabled(this.lampLit);
        this.game.audio.play("click", base.position);
        if (this.lampLit && !this.game.director.has("lamp_lit")) {
          this.game.director.set("lamp_lit");
          this.game.hud.subtitle("Đèn dầu của ông. Vẫn còn dầu — như có người châm thêm mỗi ngày.", 4);
        }
      },
    });

    // Hình nhân thế mạng cỡ con nít ngồi quay mặt vào góc đông bắc.
    const child = buildPaperDoll(this.scene, "gacChild", "standIn");
    child.root.position.set(4.4, F, 5.0);
    child.root.scaling.setAll(0.62);
    child.root.rotation.y = Math.PI * 0.25;
    child.setFace("blank");
    this.child = child;
    this.house.targets.set("atticChild", child.body);
    const corner = MeshBuilder.CreateBox("gacCornerMark", { size: 0.6 }, this.scene);
    corner.position.set(4.4, F + 0.6, 5.0);
    corner.isVisible = false;
    corner.isPickable = false;
    this.house.targets.set("atticCorner", corner);

    // Dấu chân nhỏ trong lớp bụi: từ lỗ cầu thang tới cái rương.
    const print = a.color("footprint", new Color3(0.08, 0.06, 0.05));
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const x = -5.5 + (ROOF.ridgeX + 5.0) * t + (i % 2 ? 0.1 : -0.1);
      const z = -1.0 + 6.0 * t;
      a.box("Print", 0.07, 0.004, 0.15, new Vector3(x, F + 0.013, z), print, { rot: [0, Math.atan2(ROOF.ridgeX + 5.0, 6.0), 0] });
    }
    // Mạng nhện giữa các kèo.
    const web = a.tex("web", cobwebUrl(), { alpha: true, emissive: 0.14 });
    for (const [x, z] of [[-4.6, -3.6], [3.4, 2.0], [-3.6, 4.8], [2.8, -4.8]]) {
      a.plane("Web", 1.1, 1.1, new Vector3(x, roofAt(x) - 0.45, z), web, { rot: [0.6, x < ROOF.ridgeX ? Math.PI / 2 : -Math.PI / 2, 0] });
    }
  }

  // ---------------------------------------------------------------- điểm dẫn đường, kịch bản

  /** Điểm dẫn đường trong tiệm (tầng dưới). Trên gác thực thể đi thẳng (xem floors.ATTIC_POINTS). */
  buildNav(nav: NavGraph): void {
    nav
      .node("S0", -1.8, -2.8, "shop")
      .node("S1", -3.1, -2.5, "shop", true)
      .node("S2", -4.3, -1.5, "shop")
      // Lối hẹp giữa mấy cỗ hòm và nhà lầu giấy (S3); góc chân cầu thang (S4). Không đi xuyên qua hòm.
      .node("S3", -2.5, -4.6, "shop", true)
      .node("S4", -5.6, -2.1, "shop", true)
      .link("H1", "S0", "shopDoor")
      .link("S0", "S1")
      .link("S1", "S2")
      .link("S1", "S3")
      .link("S2", "S4");
  }

  /** Thay đổi của thế giới do kịch bản gọi (action `beat`). Trả về false nếu không biết beat này. */
  beat(name: string): boolean {
    const cam = this.game.player.camera.position;
    switch (name) {
      case "shopDollsLook":
        // Ba hình nhân giữa tiệm quay về phía người chơi — lúc người chơi đang quay lưng.
        for (const d of this.shopDolls) d.root.rotation.y = Math.atan2(cam.x - d.root.position.x, cam.z - d.root.position.z);
        return true;
      case "atticChildGone":
        this.child?.root.setEnabled(false);
        return true;
      case "atticHeadsTrack":
        this.headsTrack = true;
        return true;
    }
    return false;
  }

  update(dt: number): void {
    this.time += dt;
    // Gió lùa qua mái vỡ: lồng đèn, khung nan đung đưa.
    this.hanging.forEach((p, i) => {
      p.rotation.z = Math.sin(this.time * 0.8 + i * 1.3) * 0.05;
      p.rotation.x = Math.sin(this.time * 0.6 + i) * 0.03;
    });
    if (this.lampLit) {
      this.lamp.intensity = 0.85 + Math.sin(this.time * 9) * 0.06 + Math.random() * 0.05;
      this.lampFlame.scaling.y = 1.6 + Math.random() * 0.4;
    } else {
      this.lamp.intensity = 0;
    }
    // Kệ đầu hình nhân: khi người chơi trên gác và KHÔNG nhìn về phía kệ, các đầu xoay dần theo — quay lại thì
    // thấy chín cái mặt cùng nhìn mình.
    if (this.headsTrack && this.game.player.floor === 1) {
      const cam = this.game.player.camera;
      const shelfVisible = cam.isInFrustum(this.house.targets.get("atticHeads")!);
      if (!shelfVisible) {
        for (const h of this.heads) {
          const target = Math.atan2(cam.position.x - h.position.x, cam.position.z - h.position.z);
          let d = target - h.rotation.y;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          h.rotation.y += d * Math.min(1, dt * 2);
        }
      }
    }
  }
}
