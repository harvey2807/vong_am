import { Color3, Mesh, MeshBuilder, Ray, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "../babylon";
import type { Game } from "../core/Game";
import { bannerUrl, dollFaceUrl, hairUrl, lanternUrl, PALETTES, plainPaperUrl, robeUrl, shoeUrl, type DollFace, type DollKind } from "../world/paperTextures";
import type { Waypoint } from "./NavGraph";
import { diff } from "../core/difficulty";
import { FLOOR1_Y } from "../world/floors";

/** Đèn sáng thì nhích chậm; đèn chập chờn hay tắt thì lao nhanh. Người chơi đi bộ 1.8, chạy 3.3. */
const SPEED_LIT = 1.2;
const SPEED_DARK = 2.3;
/** Chỉ hình nhân trong tầm này mới "biết" người chơi ở đâu — con ở phòng xa đứng yên. */
const AWARE_DISTANCE = 7;
const GRAB_DISTANCE = 0.75;
/** Ngoài tầm này, trong bóng tối không đèn pin, người chơi coi như không thấy gì. */
const DARK_SIGHT = 2.5;
const FLASHLIGHT_SIGHT = 12;
const REPATH_EVERY = 0.5;
const RUSTLE_EVERY = 0.55;

const flat = (v: Vector3) => new Vector3(v.x, 0, v.z);

/** Một hình nhân giấy đã dựng: thân (để kiểm tra "đang bị nhìn"), đầu (nghiêng được), đổi mặt và áo. */
export interface PaperDoll {
  root: TransformNode;
  body: Mesh;
  head: TransformNode;
  robe: StandardMaterial;
  /** Độ cao tâm mặt tính từ chân (m) — jumpscare đặt mặt đúng tầm mắt. */
  faceHeight: number;
  setFace(mode: DollFace): void;
}

/** Xoay khối cầu đầu để mặt vẽ ở u = 0.75 của ảnh nhìn về +z. */
const FACE_YAW = 0;

/**
 * Hình nhân giấy kiểu Hoa (纸扎): Kim Đồng (boy) áo xanh mũ quả dưa cầm phướn dẫn hồn, Ngọc Nữ (girl) áo hồng
 * búi hai bên cầm lồng đèn, hoặc hình nhân thế mạng (standIn) giấy trắng trơn. Thân áo tiện tròn bằng lathe,
 * tay áo rộng buông thõng, bàn tay giấy, quần, giày vải đế trắng, đứng trên đế nan tre. Gốc ở chân, mặt nhìn +z.
 */
export function buildPaperDoll(scene: Scene, name: string, kind: DollKind, variant = 0): PaperDoll {
  const pal = PALETTES[kind];
  const root = new TransformNode(name, scene);
  const paper = (n: string, url?: string, color?: Color3, invertY = true) => {
    const m = new StandardMaterial(`${name}-${n}`, scene);
    m.specularColor = new Color3(0.04, 0.04, 0.04);
    if (url) m.diffuseTexture = new Texture(url, scene, false, invertY, Texture.TRILINEAR_SAMPLINGMODE);
    if (color) m.diffuseColor = color;
    m.emissiveColor = new Color3(0.05, 0.045, 0.04);
    m.backFaceCulling = false;
    return m;
  };
  const robe = paper("robe", robeUrl(kind, variant));
  const trousers = paper("trousers", plainPaperUrl(pal.trousers, "trousers"));
  const sleeveMat = paper("sleeve", plainPaperUrl(pal.robe, "sleeve"));
  const trim = paper("trim", plainPaperUrl(pal.trim, "trim"));
  const skin = paper("skin", undefined, new Color3(0.94, 0.91, 0.85));
  const hair = paper("hair", hairUrl());
  const shoe = paper("shoe", shoeUrl());
  const bamboo = paper("bamboo", undefined, new Color3(0.45, 0.37, 0.2));
  // Ảnh mặt trải quanh khối cầu: không lật dọc (UV của sphere đã tính từ đỉnh xuống).
  const face = paper("face", dollFaceUrl(kind, kind === "standIn" ? "blank" : "undotted"), undefined, false);
  face.emissiveColor = new Color3(0.07, 0.065, 0.06);

  const part = <T extends Mesh>(m: T, mat: StandardMaterial, parent: TransformNode = root): T => {
    m.parent = parent;
    m.material = mat;
    m.isPickable = false;
    return m;
  };
  const v = (x: number, y: number) => new Vector3(x, y, 0);

  // Đế nan tre.
  part(MeshBuilder.CreateBox(`${name}Base`, { width: 0.42, height: 0.03, depth: 0.32 }, scene), bamboo).position.y = 0.015;
  // Giày + chân (quần).
  for (const sx of [-1, 1]) {
    const sh = part(MeshBuilder.CreateSphere(`${name}Shoe`, { diameter: 1, segments: 8 }, scene), shoe);
    sh.scaling.set(0.085, 0.07, 0.17);
    sh.position.set(sx * 0.075, 0.06, 0.025);
    const leg = part(MeshBuilder.CreateCylinder(`${name}Leg`, { height: 0.44, diameterTop: 0.12, diameterBottom: 0.095, tessellation: 10 }, scene), trousers);
    leg.position.set(sx * 0.075, 0.3, 0);
  }
  // Thân áo: tiện tròn từ cổ xuống gấu, ép dẹt trước-sau như giấy bồi trên khung tre.
  // Thứ tự từ gấu lên cổ để pháp tuyến hướng ra ngoài.
  const profile = [v(0.24, 0.435), v(0.262, 0.44), v(0.25, 0.48), v(0.215, 0.6), v(0.175, 0.74), v(0.165, 0.86), v(0.17, 1.0), v(0.165, 1.09), v(0.12, 1.135), v(0.045, 1.16)];
  const body = part(MeshBuilder.CreateLathe(`${name}Body`, { shape: profile, tessellation: 20, closed: true }, scene), robe);
  body.scaling.z = 0.72;
  // Đai lưng và cổ áo viền vàng.
  const sash = part(MeshBuilder.CreateCylinder(`${name}Sash`, { height: 0.05, diameter: 0.345, tessellation: 20 }, scene), trim);
  sash.position.y = 0.8;
  sash.scaling.z = 0.74;
  const collar = part(MeshBuilder.CreateTorus(`${name}Collar`, { diameter: 0.11, thickness: 0.03, tessellation: 16 }, scene), trim);
  collar.position.y = 1.15;
  // Tay áo rộng buông thõng, cổ tay viền, bàn tay giấy dẹt.
  for (const sx of [-1, 1]) {
    const arm = new TransformNode(`${name}Arm`, scene);
    arm.parent = root;
    arm.position.set(sx * 0.165, 1.08, 0);
    arm.rotation.z = sx * 0.13;
    arm.rotation.x = -0.06;
    const sleeve = part(MeshBuilder.CreateCylinder(`${name}Sleeve`, { height: 0.44, diameterTop: 0.1, diameterBottom: 0.17, tessellation: 12 }, scene), sleeveMat, arm);
    sleeve.position.y = -0.22;
    sleeve.scaling.z = 0.8;
    const cuff = part(MeshBuilder.CreateCylinder(`${name}Cuff`, { height: 0.035, diameter: 0.175, tessellation: 12 }, scene), trim, arm);
    cuff.position.y = -0.44;
    cuff.scaling.z = 0.8;
    // Bàn tay giấy cắt phẳng, lòng bàn tay quay ra trước như mọi hình nhân; ngón cái chĩa vào trong.
    part(MeshBuilder.CreateBox(`${name}Hand`, { width: 0.065, height: 0.12, depth: 0.02 }, scene), skin, arm).position.set(0, -0.51, 0.03);
    const thumb = part(MeshBuilder.CreateBox(`${name}Thumb`, { width: 0.022, height: 0.055, depth: 0.018 }, scene), skin, arm);
    thumb.position.set(-sx * 0.04, -0.47, 0.03);
    thumb.rotation.z = sx * 0.6;
  }
  part(MeshBuilder.CreateCylinder(`${name}Neck`, { height: 0.07, diameter: 0.06, tessellation: 8 }, scene), skin).position.y = 1.18;
  // Đầu: khối cầu hơi dài, mặt vẽ trải quanh (xem dollFaceUrl).
  const head = new TransformNode(`${name}Head`, scene);
  head.parent = root;
  head.position.y = 1.3;
  const skull = part(MeshBuilder.CreateSphere(`${name}Skull`, { diameter: 0.25, segments: 16 }, scene), face, head);
  skull.scaling.set(0.9, 1.06, 0.92);
  skull.rotation.y = FACE_YAW;
  if (kind === "boy") {
    // Mũ quả dưa đen chóp đỏ.
    const cap = part(MeshBuilder.CreateSphere(`${name}Cap`, { diameter: 0.245, segments: 12, slice: 0.5 }, scene), hair, head);
    cap.position.y = 0.035;
    cap.scaling.set(0.95, 0.85, 0.97);
    const knob = part(MeshBuilder.CreateSphere(`${name}Knob`, { diameter: 0.035, segments: 6 }, scene), paper("knob", undefined, new Color3(0.7, 0.08, 0.06)), head);
    knob.position.y = 0.145;
    const brim = part(MeshBuilder.CreateTorus(`${name}Brim`, { diameter: 0.225, thickness: 0.018, tessellation: 18 }, scene), hair, head);
    brim.position.y = 0.04;
  } else if (kind === "girl") {
    // Búi tóc hai bên, cài hoa giấy đỏ, ruy băng thả xuống.
    const flower = paper("flower", undefined, new Color3(0.85, 0.1, 0.16));
    for (const sx of [-1, 1]) {
      const bun = part(MeshBuilder.CreateSphere(`${name}Bun`, { diameter: 0.09, segments: 8 }, scene), hair, head);
      bun.position.set(sx * 0.085, 0.11, -0.01);
      const f = part(MeshBuilder.CreateSphere(`${name}Flower`, { diameter: 0.045, segments: 6 }, scene), flower, head);
      f.position.set(sx * 0.105, 0.09, 0.04);
      const ribbon = part(MeshBuilder.CreatePlane(`${name}Ribbon`, { width: 0.025, height: 0.22 }, scene), flower, head);
      ribbon.position.set(sx * 0.12, -0.02, -0.02);
      ribbon.rotation.set(0, Math.PI, sx * 0.1);
    }
  }
  // Đồ cầm tay: Kim Đồng cầm phướn dẫn hồn, Ngọc Nữ xách lồng đèn giấy đỏ.
  if (kind === "boy") {
    const pole = part(MeshBuilder.CreateCylinder(`${name}Pole`, { height: 1.75, diameter: 0.018, tessellation: 5 }, scene), bamboo);
    pole.position.set(0.26, 0.9, 0.06);
    const bar = part(MeshBuilder.CreateCylinder(`${name}Bar`, { height: 0.32, diameter: 0.014, tessellation: 5 }, scene), bamboo);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0.26, 1.72, 0.06);
    const flag = paper("banner", bannerUrl());
    flag.useAlphaFromDiffuseTexture = true;
    (flag.diffuseTexture as Texture).hasAlpha = true;
    for (const dx of [-0.1, 0, 0.1]) {
      const strip = part(MeshBuilder.CreatePlane(`${name}Banner`, { width: 0.075, height: 0.7 }, scene), flag);
      strip.position.set(0.26 + dx, 1.36 - Math.abs(dx) * 0.6, 0.065);
      strip.rotation.y = Math.PI;
    }
  } else if (kind === "girl") {
    const stick = part(MeshBuilder.CreateCylinder(`${name}Stick`, { height: 0.32, diameter: 0.012, tessellation: 5 }, scene), bamboo);
    stick.position.set(-0.235, 0.62, 0.1);
    stick.rotation.x = 0.5;
    const lantern = part(MeshBuilder.CreateSphere(`${name}Lantern`, { diameter: 0.16, segments: 10 }, scene), paper("lantern", lanternUrl()));
    lantern.scaling.y = 1.2;
    lantern.position.set(-0.235, 0.42, 0.2);
    (lantern.material as StandardMaterial).emissiveColor = new Color3(0.25, 0.05, 0.03);
  }

  return {
    root,
    body,
    head,
    robe,
    faceHeight: 1.29,
    setFace(mode: DollFace) {
      const old = face.diffuseTexture;
      face.diffuseTexture = new Texture(dollFaceUrl(kind, mode), scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
      old?.dispose();
    },
  };
}

interface Doll {
  root: TransformNode;
  body: Mesh;
  doll: PaperDoll;
  route: Waypoint[];
  repath: number;
  rustle: number;
}

/**
 * Kẻ Không Có Mặt (Đêm 3): các hình nhân chỉ di chuyển khi không ai nhìn chúng.
 * "Nhìn" = trong khung hình + không bị che + đủ sáng (đèn nhà đang sáng, hoặc đèn pin chiếu tới, hoặc rất gần).
 * Chạm được người chơi là bắt.
 */
export class Effigies {
  private readonly dolls: Doll[] = [];
  private active = false;
  /** Chỉ di chuyển khi đèn nhà tắt (đêm cuối) — đèn sáng là nơi trú ẩn khỏi chúng. */
  darkOnly = false;
  private grabbed?: Doll;
  private grabTime = 0;

  constructor(
    private readonly scene: Scene,
    private readonly game: Game,
  ) {}

  /** Chỗ đứng (x, z, hướng nhìn độ, độ cao sàn — bỏ trống là nhà dưới, FLOOR1_Y là trên gác). */
  spawn(spots: ([number, number, number] | [number, number, number, number])[]): void {
    spots.forEach(([x, z, yaw, y = 0], i) => {
      const doll = buildPaperDoll(this.scene, `effigy${i}`, i % 2 ? "boy" : "girl", i);
      const root = doll.root;
      root.position.set(x, y, z);
      root.rotation.y = (yaw * Math.PI) / 180;
      this.dolls.push({ root, body: doll.body, doll, route: [], repath: Math.random() * REPATH_EVERY, rustle: 0 });
    });
  }

  /** Thức dậy: ai đó đã điểm mắt cho chúng (đại kỵ của nghề trát giấy) — bắt đầu đi. */
  wake(): void {
    this.active = true;
    for (const d of this.dolls) d.doll.setFace("dotted");
  }

  sleep(): void {
    this.active = false;
  }

  get threat(): number {
    if (!this.active || !this.dolls.length) return 0;
    const cam = this.game.player.camera.position;
    const floor = this.game.player.floor;
    const same = this.dolls.filter((d) => this.floorOf(d) === floor);
    if (!same.length) return 0;
    const nearest = Math.min(...same.map((d) => Math.hypot(d.root.position.x - cam.x, d.root.position.z - cam.z)));
    return Math.max(0, 1 - nearest / 8);
  }

  update(dt: number): void {
    if (this.grabbed) return this.updateGrab(dt);
    if (!this.active) return;
    if (this.darkOnly && this.game.house.lightState === "on") return;
    const player = this.game.player;
    const cam = player.camera.position;
    for (const d of this.dolls) {
      // Trốn trong tủ thì chúng mất dấu và đứng im.
      if (player.hidden || this.floorOf(d) !== player.floor || this.isSeen(d)) continue;
      const pos = d.root.position;
      const dist = Math.hypot(pos.x - cam.x, pos.z - cam.z);
      if (dist < GRAB_DISTANCE) return this.grab(d);
      if (dist > AWARE_DISTANCE) continue;

      d.repath -= dt;
      if (d.repath <= 0 || !d.route.length) {
        d.repath = REPATH_EVERY;
        // Trên gác là khoảng trống liền — đi thẳng; nhà dưới thì theo điểm dẫn đường.
        const up = this.floorOf(d) === 1;
        d.route = up ? [{ pos: flat(cam) }] : this.game.house.nav.route(flat(pos), flat(cam), (a, b) => this.clear(a, b, pos.y));
      }
      const wp = d.route[0];
      if (!wp) continue;
      const to = wp.pos.subtract(flat(pos));
      const len = to.length();
      const step = Math.min(len, (this.game.house.lightState === "on" ? SPEED_LIT : SPEED_DARK) * diff().effigySpeed * dt);
      if (len > 0.01) pos.addInPlace(to.scale(step / len));
      if (len < 0.1) d.route.shift();
      // Luôn quay mặt về phía người chơi — lúc quay lại sẽ thấy tất cả đều đang nhìn mình.
      d.root.rotation.y = Math.atan2(cam.x - pos.x, cam.z - pos.z);
      // Càng lại gần, đầu càng nghẹo sang một bên — như đang tò mò xem mặt mình.
      d.doll.head.rotation.z = Math.min(0.35, Math.max(0, (AWARE_DISTANCE - dist) / AWARE_DISTANCE) * 0.4);
      d.rustle -= step;
      if (d.rustle <= 0) {
        d.rustle = RUSTLE_EVERY;
        this.game.audio.play("rustle", new Vector3(pos.x, pos.y + 1, pos.z));
      }
    }
  }

  private isSeen(d: Doll): boolean {
    const cam = this.game.player.camera;
    if (!cam.isInFrustum(d.body)) return false;
    const head = d.root.position.add(new Vector3(0, d.doll.faceHeight - 0.3, 0));
    const dist = Vector3.Distance(head, cam.position);
    const lit = this.game.house.lightState === "on" || (this.game.player.flashlightOn && dist < FLASHLIGHT_SIGHT) || dist < DARK_SIGHT;
    if (!lit) return false;
    return this.ray(cam.position, head);
  }

  private clear(a: Vector3, b: Vector3, base = 0): boolean {
    return this.ray(new Vector3(a.x, base + 1.0, a.z), new Vector3(b.x, base + 1.0, b.z));
  }

  private floorOf(d: Doll): 0 | 1 {
    return d.root.position.y > FLOOR1_Y / 2 ? 1 : 0;
  }

  private ray(a: Vector3, b: Vector3): boolean {
    const d = b.subtract(a);
    const len = d.length();
    if (len < 0.01) return true;
    const hit = this.scene.pickWithRay(new Ray(a, d.scale(1 / len), len), (m) => m.isPickable && m.isEnabled());
    return !(hit?.hit && hit.distance < len - 0.05);
  }

  /** Bắt: hình nhân áp sát mặt, khuôn mặt trắng trơn hiện lại nét vẽ — rồi Director diễn đoạn kết. */
  private grab(d: Doll): void {
    this.grabbed = d;
    this.grabTime = 0;
    this.active = false;
    d.doll.setFace("grab");
    this.game.player.camera.rotation.x = 0;
    this.game.audio.play("shriek");
    this.game.onCaught();
    this.updateGrab(0);
  }

  private updateGrab(dt: number): void {
    const d = this.grabbed!;
    this.grabTime += dt;
    const cam = this.game.player.camera;
    const fwd = flat(cam.getDirection(Vector3.Forward())).normalize();
    const dist = Math.max(0.42, 0.9 - this.grabTime * 3);
    d.root.position.set(cam.position.x + fwd.x * dist, cam.position.y - d.doll.faceHeight, cam.position.z + fwd.z * dist);
    d.root.rotation.y = Math.atan2(-fwd.x, -fwd.z);
    d.doll.head.rotation.z = Math.sin(this.grabTime * 35) * 0.12;
    cam.rotation.z = (Math.random() - 0.5) * 0.05;
  }
}
