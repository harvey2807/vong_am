import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "../babylon";
import type { Game } from "../core/Game";
import { diff } from "../core/difficulty";
import { sackFaceUrl, strawUrl } from "../world/decorTextures";

const HEAD_Y = 1.75;
const SPEED = 1.5;
const GRAB_DISTANCE = 0.8;
/** Chỉ con trong tầm này mới "thấy" đèn của người chơi. */
const WAKE_DISTANCE = 20;
/** Nửa góc chùm đèn pin và tầm rọi: con nào nằm trong chùm sáng thì đứng im. */
const BEAM_HALF_ANGLE = (24 * Math.PI) / 180;
const BEAM_RANGE = 14;
const RUSTLE_EVERY = 0.7;

interface Crow {
  root: TransformNode;
  head: TransformNode;
  rustle: number;
}

/** Bù nhìn rơm: cọc tre, đòn ngang, áo rách, mặt bao bố, nón lá. Gốc ở chân cọc, mặt nhìn về +z. */
function buildScarecrow(scene: Scene, name: string, mats: Record<string, StandardMaterial>): { root: TransformNode; head: TransformNode } {
  const root = new TransformNode(name, scene);
  const part = (m: Mesh, mat: StandardMaterial, parent: TransformNode = root) => {
    m.parent = parent;
    m.material = mat;
    m.isPickable = false;
    return m;
  };
  part(MeshBuilder.CreateCylinder(`${name}Pole`, { diameter: 0.07, height: 2.0, tessellation: 5 }, scene), mats.bamboo).position.y = 1.0;
  const arm = part(MeshBuilder.CreateCylinder(`${name}Arm`, { diameter: 0.05, height: 1.5, tessellation: 5 }, scene), mats.bamboo);
  arm.position.y = 1.45;
  arm.rotation.z = Math.PI / 2;
  // Áo bà ba rách: thân + hai tay áo phẳng, tua rơm thò ra ở cổ tay.
  const body = part(MeshBuilder.CreateBox(`${name}Body`, { width: 0.5, height: 0.7, depth: 0.22 }, scene), mats.cloth);
  body.position.y = 1.2;
  for (const side of [-1, 1]) {
    const sleeve = part(MeshBuilder.CreateBox(`${name}Sleeve`, { width: 0.5, height: 0.18, depth: 0.16 }, scene), mats.cloth);
    sleeve.position.set(side * 0.45, 1.42, 0);
    const tuft = part(MeshBuilder.CreateCylinder(`${name}Tuft`, { diameterTop: 0.16, diameterBottom: 0.02, height: 0.22, tessellation: 5 }, scene), mats.straw);
    tuft.position.set(side * 0.76, 1.42, 0);
    tuft.rotation.z = (side * Math.PI) / 2;
  }
  const head = new TransformNode(`${name}Head`, scene);
  head.parent = root;
  head.position.y = HEAD_Y;
  const sack = part(MeshBuilder.CreateSphere(`${name}Sack`, { diameter: 0.34, segments: 6 }, scene), mats.burlap, head);
  sack.scaling.set(0.9, 1.05, 0.9);
  // Mặt vẽ than trên một mảnh bao bố khâu phía trước (mặt phẳng nhìn về +z).
  const face = part(MeshBuilder.CreatePlane(`${name}Face`, { width: 0.26, height: 0.28 }, scene), mats.sack, head);
  face.rotation.y = Math.PI;
  face.position.set(0, -0.01, 0.15);
  // Nón lá.
  const hat = part(MeshBuilder.CreateCylinder(`${name}Hat`, { diameterTop: 0, diameterBottom: 0.72, height: 0.26, tessellation: 14 }, scene), mats.straw, head);
  hat.position.y = 0.2;
  hat.rotation.x = 0.12;
  return { root, head };
}

/**
 * Bù nhìn ngoài đồng (màn Chạng vạng): ngược với hình nhân — chúng thức dậy khi thấy ánh đèn.
 * Đèn pin TẮT: tất cả đứng im. Đèn pin BẬT: con nào không nằm trong chùm sáng thì lội ruộng tiến lại;
 * con đang bị rọi thì đứng im. `rage` (sau khi trả lời tiếng gọi): đi cả trong tối một lúc.
 */
export class Scarecrows {
  private readonly crows: Crow[] = [];
  private readonly mats: Record<string, StandardMaterial>;
  private rageTime = 0;
  private grabbed?: Crow;
  private grabTime = 0;

  constructor(
    private readonly scene: Scene,
    private readonly game: Game,
  ) {
    const mat = (name: string, color?: Color3, url?: string) => {
      const m = new StandardMaterial(`crow-${name}`, scene);
      m.specularColor = Color3.Black();
      if (color) m.diffuseColor = color;
      if (url) m.diffuseTexture = new Texture(url, scene, false, true, Texture.NEAREST_SAMPLINGMODE);
      return m;
    };
    this.mats = {
      bamboo: mat("bamboo", new Color3(0.35, 0.3, 0.16)),
      cloth: mat("cloth", new Color3(0.2, 0.17, 0.13)),
      straw: mat("straw", undefined, strawUrl()),
      sack: mat("sack", undefined, sackFaceUrl()),
      burlap: mat("burlap", new Color3(0.42, 0.35, 0.22)),
    };
    this.mats.sack.emissiveColor = new Color3(0.06, 0.05, 0.04);
  }

  spawn(spots: [number, number, number][]): void {
    spots.forEach(([x, z, yaw], i) => {
      const { root, head } = buildScarecrow(this.scene, `scarecrow${i}`, this.mats);
      root.position.set(x, 0, z);
      root.rotation.y = (yaw * Math.PI) / 180;
      root.rotation.z = (Math.random() - 0.5) * 0.12;
      this.crows.push({ root, head, rustle: Math.random() });
    });
  }

  /** Nổi giận: đi cả trong bóng tối trong `seconds` giây. */
  rage(seconds: number): void {
    this.rageTime = seconds;
  }

  get threat(): number {
    if (!this.crows.length) return 0;
    const cam = this.game.player.camera.position;
    const nearest = Math.min(...this.crows.map((c) => Math.hypot(c.root.position.x - cam.x, c.root.position.z - cam.z)));
    return Math.max(0, 1 - nearest / 7);
  }

  update(dt: number): void {
    if (this.grabbed) return this.updateGrab(dt);
    this.rageTime = Math.max(0, this.rageTime - dt);
    const player = this.game.player;
    const awake = player.flashlightOn || this.rageTime > 0;
    if (!awake || !this.crows.length || this.game.director.has("ending")) return;
    const cam = player.camera.position;
    // Đất thờ quanh gốc đa: chúng dừng ở mép ruộng.
    if (this.game.house.fields?.isSanctuary(cam.x, cam.z)) return;
    const fwd = player.camera.getDirection(Vector3.Forward());
    for (const c of this.crows) {
      const pos = c.root.position;
      const to = new Vector3(cam.x - pos.x, 0, cam.z - pos.z);
      const dist = to.length();
      if (dist < GRAB_DISTANCE) return this.grab(c);
      if (dist > WAKE_DISTANCE) continue;
      // Bị rọi thẳng thì đứng im (chỉ khi đèn bật — lúc nổi giận trong tối thì không gì giữ được chúng).
      if (player.flashlightOn) {
        const toCrow = new Vector3(pos.x - cam.x, HEAD_Y - 0.4 - cam.y, pos.z - cam.z);
        const d = toCrow.length();
        const dot = Math.min(1, Math.max(-1, Vector3.Dot(toCrow.normalize(), fwd)));
        if (d < BEAM_RANGE && Math.acos(dot) < BEAM_HALF_ANGLE) continue;
      }
      const step = Math.min(dist, SPEED * diff().effigySpeed * dt);
      pos.addInPlace(to.scale(step / dist));
      // Luôn quay mặt về phía người chơi, đầu nghiêng như đang tò mò.
      c.root.rotation.y = Math.atan2(to.x, to.z);
      c.head.rotation.z = 0.25;
      c.rustle -= step;
      if (c.rustle <= 0) {
        c.rustle = RUSTLE_EVERY;
        this.game.audio.play("rustle", new Vector3(pos.x, 1.2, pos.z));
        this.game.director.set("scarecrow_moved");
      }
    }
  }

  private grab(c: Crow): void {
    this.grabbed = c;
    this.grabTime = 0;
    this.mats.sack.emissiveColor = new Color3(0.5, 0.45, 0.38);
    this.game.player.camera.rotation.x = 0;
    this.game.audio.play("shriek");
    this.game.onCaught();
    this.updateGrab(0);
  }

  private updateGrab(dt: number): void {
    const c = this.grabbed!;
    this.grabTime += dt;
    const cam = this.game.player.camera;
    const fwd = cam.getDirection(Vector3.Forward());
    const f = new Vector3(fwd.x, 0, fwd.z).normalize();
    const d = Math.max(0.45, 0.9 - this.grabTime * 3);
    c.root.position.set(cam.position.x + f.x * d, cam.position.y - HEAD_Y, cam.position.z + f.z * d);
    c.root.rotation.y = Math.atan2(-f.x, -f.z);
    c.head.rotation.z = Math.sin(this.grabTime * 30) * 0.15;
    cam.rotation.z = (Math.random() - 0.5) * 0.05;
  }
}
