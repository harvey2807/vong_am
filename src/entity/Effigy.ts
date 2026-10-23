import { Color3, Mesh, MeshBuilder, Ray, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import type { Game } from "../core/Game";
import { effigyFaceUrl, effigyRobeUrl } from "../world/decorTextures";
import type { Waypoint } from "./NavGraph";
import { diff } from "../core/difficulty";
import { Sprite, SPRITES } from "../world/sprites";

const HEAD_HEIGHT = 1.38;
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

/**
 * Hình nhân giấy — đồ mã thế mạng trong đám tang. Thân phễu dán giấy màu, tay áo phẳng,
 * mặt vẽ phấn trắng má đỏ. Gốc tọa độ ở chân, mặt nhìn về +z.
 */
export function buildEffigy(scene: Scene, name: string, robe: string, faceless: boolean): { root: TransformNode; body: Mesh; face: StandardMaterial } {
  const root = new TransformNode(name, scene);
  const paper = (n: string, color?: Color3, url?: string) => {
    const m = new StandardMaterial(`${name}-${n}`, scene);
    m.specularColor = Color3.Black();
    if (url) m.diffuseTexture = new Texture(url, scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    if (color) m.diffuseColor = color;
    m.emissiveColor = new Color3(0.04, 0.035, 0.03);
    return m;
  };
  const robeMat = paper("robe", undefined, effigyRobeUrl(robe));
  const skin = paper("skin", new Color3(0.92, 0.89, 0.83));
  const hair = paper("hair", new Color3(0.03, 0.03, 0.03));
  const bamboo = paper("bamboo", new Color3(0.45, 0.38, 0.22));
  const face = paper("face", undefined, effigyFaceUrl(faceless ? "blank" : "painted"));
  face.emissiveColor = new Color3(0.18, 0.17, 0.16);

  const part = (m: Mesh, mat: StandardMaterial, parent: TransformNode = root) => {
    m.parent = parent;
    m.material = mat;
    m.isPickable = false;
    return m;
  };
  part(MeshBuilder.CreateBox(`${name}Base`, { width: 0.42, height: 0.04, depth: 0.42 }, scene), bamboo).position.y = 0.02;
  const body = part(MeshBuilder.CreateCylinder(`${name}Body`, { height: 1.12, diameterTop: 0.3, diameterBottom: 0.56, tessellation: 10 }, scene), robeMat);
  body.position.y = 0.6;
  for (const side of [-1, 1]) {
    const sleeve = part(MeshBuilder.CreateBox(`${name}Sleeve`, { width: 0.06, height: 0.58, depth: 0.16 }, scene), robeMat);
    sleeve.position.set(side * 0.22, 0.9, 0.02);
    sleeve.rotation.z = side * 0.18;
    part(MeshBuilder.CreateBox(`${name}Hand`, { width: 0.05, height: 0.1, depth: 0.08 }, scene), skin).position.set(side * 0.27, 0.58, 0.04);
  }
  part(MeshBuilder.CreateCylinder(`${name}Neck`, { height: 0.12, diameter: 0.08, tessellation: 6 }, scene), skin).position.y = 1.2;
  const head = new TransformNode(`${name}Head`, scene);
  head.parent = root;
  head.position.y = HEAD_HEIGHT;
  const skull = part(MeshBuilder.CreateSphere(`${name}Skull`, { diameter: 0.25, segments: 6 }, scene), skin, head);
  skull.scaling.set(0.95, 1.1, 0.85);
  const hat = part(MeshBuilder.CreateSphere(`${name}Hair`, { diameter: 0.27, segments: 6, slice: 0.5 }, scene), hair, head);
  hat.position.y = 0.02;
  const facePlane = part(MeshBuilder.CreatePlane(`${name}Face`, { width: 0.2, height: 0.25 }, scene), face, head);
  facePlane.rotation.y = Math.PI;
  facePlane.position.set(0, -0.01, 0.125);
  return { root, body, face };
}

/** Cao của hình nhân giấy (m) — cỡ người thật, như đồ mã đốt cho người chết. */
const DOLL_HEIGHT = 1.58;

/**
 * Hình nhân giấy dạng ảnh (cắt từ concept art): bé trai áo xanh, bé gái áo đỏ, mặt phấn trắng má hồng.
 * `index` chẵn/lẻ chọn trai/gái. Mặt phẳng luôn quay về người chơi.
 */
export function buildPaperDoll(scene: Scene, name: string, index: number): { root: TransformNode; sprite: Sprite } {
  const root = new TransformNode(name, scene);
  const sprite = new Sprite(scene, `${name}Sprite`, index % 2 ? SPRITES.effigyGirl : SPRITES.effigyBoy, DOLL_HEIGHT, root);
  sprite.mat.emissiveColor = new Color3(0.09, 0.085, 0.08);
  return { root, sprite };
}

interface Doll {
  root: TransformNode;
  body: Mesh;
  sprite: Sprite;
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

  spawn(spots: [number, number, number][]): void {
    spots.forEach(([x, z, yaw], i) => {
      const { root, sprite } = buildPaperDoll(this.scene, `effigy${i}`, i);
      root.position.set(x, 0, z);
      root.rotation.y = (yaw * Math.PI) / 180;
      this.dolls.push({ root, body: sprite.mesh, sprite, route: [], repath: Math.random() * REPATH_EVERY, rustle: 0 });
    });
  }

  /** Thức dậy: mặt bị xóa trắng, bắt đầu đi. */
  wake(): void {
    this.active = true;
    for (const d of this.dolls) d.sprite.setFace("blank");
  }

  sleep(): void {
    this.active = false;
  }

  get threat(): number {
    if (!this.active || !this.dolls.length) return 0;
    const cam = this.game.player.camera.position;
    const nearest = Math.min(...this.dolls.map((d) => Math.hypot(d.root.position.x - cam.x, d.root.position.z - cam.z)));
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
      if (player.hidden || this.isSeen(d)) continue;
      const pos = d.root.position;
      const dist = Math.hypot(pos.x - cam.x, pos.z - cam.z);
      if (dist < GRAB_DISTANCE) return this.grab(d);
      if (dist > AWARE_DISTANCE) continue;

      d.repath -= dt;
      if (d.repath <= 0 || !d.route.length) {
        d.repath = REPATH_EVERY;
        d.route = this.game.house.nav.route(flat(pos), flat(cam), (a, b) => this.clear(a, b));
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
      d.rustle -= step;
      if (d.rustle <= 0) {
        d.rustle = RUSTLE_EVERY;
        this.game.audio.play("rustle", new Vector3(pos.x, 1, pos.z));
      }
    }
  }

  private isSeen(d: Doll): boolean {
    const cam = this.game.player.camera;
    if (!cam.isInFrustum(d.body)) return false;
    const head = d.root.position.add(new Vector3(0, d.sprite.faceHeight - 0.3, 0));
    const dist = Vector3.Distance(head, cam.position);
    const lit = this.game.house.lightState === "on" || (this.game.player.flashlightOn && dist < FLASHLIGHT_SIGHT) || dist < DARK_SIGHT;
    if (!lit) return false;
    return this.ray(cam.position, head);
  }

  private clear(a: Vector3, b: Vector3): boolean {
    return this.ray(new Vector3(a.x, 1.0, a.z), new Vector3(b.x, 1.0, b.z));
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
    d.sprite.setFace("grab");
    d.sprite.mat.emissiveColor = new Color3(0.5, 0.48, 0.45);
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
    d.root.position.set(cam.position.x + fwd.x * dist, cam.position.y - d.sprite.faceHeight, cam.position.z + fwd.z * dist);
    d.sprite.mesh.scaling.set(1 + Math.random() * 0.05, 1 + Math.sin(this.grabTime * 35) * 0.03, 1);
    cam.rotation.z = (Math.random() - 0.5) * 0.05;
  }
}
