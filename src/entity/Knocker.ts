import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Ray,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { Game } from "../core/Game";
import type { EntityCommand } from "../director/types";
import type { HidingSpot } from "../world/House";
import type { Waypoint } from "./NavGraph";
import { drawEntityFace, drawHumanFace } from "../world/textures";
import { Sprite, SPRITES } from "../world/sprites";
import tuning from "../data/knocker.json";
import { diff } from "../core/difficulty";

type State = "inactive" | "idle" | "patrol" | "investigate" | "search" | "chase" | "caught";


const EYE_HEIGHT = 1.72;
/** Tia nhìn/đường đi thử ở tầm ngực: cao hơn giường, sập, bàn thờ — thực thể không cần né đồ đạc thấp. */
const PROBE_HEIGHT = 1.3;
const STEP_LENGTH = 0.75;
const DEG = Math.PI / 180;

const rand = ([a, b]: number[]) => a + Math.random() * (b - a);
const flat = (v: Vector3) => new Vector3(v.x, 0, v.z);

/**
 * Người Gõ Cửa: máy trạng thái đứng (idle) → tuần tra → nghi ngờ (investigate/search) → truy đuổi.
 * Director quyết định KHI NÀO nó xuất hiện (action "entity"); còn cách nó săn thì nằm ở đây,
 * thông số trong data/knocker.json.
 */
export class Knocker {
  state: State = "inactive";
  private readonly root: TransformNode;
  private readonly head: TransformNode;
  private readonly faceMat: StandardMaterial;
  private readonly faceTex: DynamicTexture;
  private readonly cloth: StandardMaterial;
  private readonly locks: Mesh;
  /** Đang mang mặt Út (đêm cuối). Lúc bắt người chơi, lớp mặt này rơi ra. */
  private disguised = false;
  private readonly body: Mesh;
  /** Hình con ma (ảnh concept đã tách nền) — dáng thật thay cho khối hình học; khối hình học chỉ dùng khi nó giả làm Út. */
  private readonly sprite: Sprite;
  private readonly model: Mesh[];

  private route: Waypoint[] = [];
  private doorWait = 0;
  private hurry = false;
  private alert = 0;
  private lastKnown?: Vector3;
  private lostTime = 0;
  private timer = 0;
  private lureTimer = rand(tuning.lureEvery);
  private stepDistance = 0;
  private searchYaw = 0;
  private lastPatrolNode?: string;
  /** Nó đã thấy người chơi chui vào chỗ trốn → sẽ lôi ra. */
  private sawHide = false;
  private spot?: HidingSpot;
  private time = 0;
  /** Giật đầu/người: thời gian còn lại và hướng. */
  private twitch = 0;
  private twitchDir = 1;
  private twitchIn = 2;
  /** Lúc đuổi, hình ảnh chỉ cập nhật vị trí theo từng nhịp — giật cục như phim tua thiếu khung. */
  private stutter = 0;

  constructor(
    private readonly scene: Scene,
    private readonly game: Game,
  ) {
    this.root = new TransformNode("knocker", scene);
    const cloth = new StandardMaterial("knockerCloth", scene);
    cloth.diffuseColor = new Color3(0.09, 0.08, 0.08);
    cloth.specularColor = Color3.Black();
    const hair = new StandardMaterial("knockerHair", scene);
    hair.diffuseColor = new Color3(0.02, 0.02, 0.02);
    hair.specularColor = Color3.Black();
    const skin = new StandardMaterial("knockerSkin", scene);
    skin.diffuseColor = new Color3(0.55, 0.52, 0.48);
    skin.specularColor = Color3.Black();
    skin.emissiveColor = new Color3(0.08, 0.08, 0.075);

    const part = (mesh: Mesh, mat: StandardMaterial, parent: TransformNode = this.root) => {
      mesh.parent = parent;
      mesh.material = mat;
      mesh.isPickable = false;
      return mesh;
    };

    // Áo dài đen phủ tới đất, vai hẹp: dáng người nhưng hơi quá cao, quá gầy.
    this.body = part(MeshBuilder.CreateCylinder("knockerBody", { height: 1.5, diameterTop: 0.3, diameterBottom: 0.52, tessellation: 9 }, scene), cloth);
    this.body.position.y = 0.75;
    part(MeshBuilder.CreateCylinder("knockerNeck", { height: 0.2, diameter: 0.09, tessellation: 6 }, scene), skin).position.y = 1.58;
    for (const side of [-1, 1]) {
      const arm = part(MeshBuilder.CreateCylinder("knockerArm", { height: 0.95, diameterTop: 0.08, diameterBottom: 0.05, tessellation: 5 }, scene), cloth);
      arm.position.set(side * 0.2, 1.0, 0.03);
      arm.rotation.z = side * 0.06;
      const hand = part(MeshBuilder.CreateBox("knockerHand", { width: 0.05, height: 0.2, depth: 0.07 }, scene), skin);
      hand.position.set(side * 0.23, 0.45, 0.04);
    }

    this.head = new TransformNode("knockerHead", scene);
    this.head.parent = this.root;
    this.head.position.y = EYE_HEIGHT;
    const skull = part(MeshBuilder.CreateSphere("knockerSkull", { diameter: 0.24, segments: 6 }, scene), hair, this.head);
    skull.scaling.y = 1.2;
    this.cloth = cloth;
    const locks = part(MeshBuilder.CreateBox("knockerHairBack", { width: 0.28, height: 0.75, depth: 0.08 }, scene), hair, this.head);
    locks.position.set(0, -0.3, -0.1);
    this.locks = locks;

    const faceTex = new DynamicTexture("knockerFaceTex", { width: 64, height: 96 }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    drawEntityFace(faceTex.getContext() as unknown as CanvasRenderingContext2D, 64, 96);
    faceTex.update();
    this.faceTex = faceTex;
    this.faceMat = new StandardMaterial("knockerFace", scene);
    this.faceMat.diffuseTexture = faceTex;
    this.faceMat.emissiveTexture = faceTex;
    this.faceMat.specularColor = Color3.Black();
    this.faceMat.emissiveColor = new Color3(0.35, 0.35, 0.35);
    // Mặt phẳng hướng về +z (phía trước của thực thể).
    const face = part(MeshBuilder.CreatePlane("knockerFace", { width: 0.2, height: 0.28, sideOrientation: Mesh.FRONTSIDE }, scene), this.faceMat, this.head);
    face.rotation.y = Math.PI;
    face.position.set(0, -0.01, 0.14);

    for (const m of [cloth, hair, skin, this.faceMat]) m.maxSimultaneousLights = 8;
    this.model = this.root.getChildMeshes(false) as Mesh[];
    // Không đặt tên "knocker…" để mặt phẳng billboard không bị đưa vào shadow map.
    this.sprite = new Sprite(scene, "ghostSprite", SPRITES.ghost, 1.95, this.root);
    this.sprite.mat.maxSimultaneousLights = 8;
    this.showModel(false);
    this.root.setEnabled(false);
    game.house.targets.set("entity", this.body);
  }

  private get player() {
    return this.game.player;
  }

  get position(): Vector3 {
    return this.root.position;
  }

  /** 0..1 — đưa vào nhạc nền để tiếng drone dâng lên khi nó tới gần. */
  get threat(): number {
    switch (this.state) {
      case "inactive":
        return 0;
      case "chase":
      case "caught":
        return 1;
      case "investigate":
      case "search":
        return 0.7;
      default:
        return Math.max(0, 1 - this.distanceToPlayer() / 10) * 0.6;
    }
  }

  // ---------------------------------------------------------------- lệnh từ Director

  command(cmd: EntityCommand, at?: string): void {
    switch (cmd) {
      case "appear":
        this.appear(at ?? "hallEnd");
        break;
      case "patrol":
        if (this.state === "inactive") this.appear(at ?? "hallEnd");
        this.startPatrol();
        break;
      case "alert":
        if (this.state === "inactive") this.appear(at ?? "hallEnd");
        this.investigate(flat(this.player.camera.position), true);
        break;
      case "grab":
        this.root.setEnabled(true);
        this.seize();
        break;
      case "disguise":
        this.disguise();
        break;
      case "vanish":
        this.state = "inactive";
        this.root.setEnabled(false);
        break;
    }
  }

  private appear(anchor: string): void {
    let p = flat(this.game.house.anchors.get(anchor) ?? Vector3.Zero());
    // Người chơi đang đứng ngay đó (vd. định mở cửa chính) → hiện ở điểm tuần tra xa nhất mà người chơi vẫn nhìn thấy.
    const cam = flat(this.player.camera.position);
    if (Vector3.Distance(p, cam) < 4) {
      const patrol = [...this.game.house.nav.nodes.values()].filter((n) => n.patrol);
      const inView = patrol.filter((n) => this.clear(cam, n.pos));
      const nodes = inView.length ? inView : patrol;
      p = nodes.reduce((a, b) => (Vector3.Distance(a.pos, cam) > Vector3.Distance(b.pos, cam) ? a : b)).pos;
    }
    this.root.position.set(p.x, 0, p.z);
    this.faceTowards(this.player.camera.position, 1);
    this.root.setEnabled(true);
    this.state = "idle";
    this.route = [];
  }

  // ---------------------------------------------------------------- chỗ trốn

  onPlayerHide(spot: HidingSpot): void {
    this.spot = spot;
    this.sawHide = this.state === "chase" && this.canSeePlayer(true);
    if (this.sawHide) this.investigate(spot.front, true);
  }

  /** Đang đứng sát cửa tủ, nghe ngóng — người chơi phải nín thở (Game kiểm tra). */
  get listeningAtWardrobe(): boolean {
    return this.state === "search" && this.atWardrobe() && !!this.spot && this.player.hidden;
  }

  /** Nghe thấy tiếng thở trong tủ → mở tủ lôi ra. */
  hearHiddenPlayer(): void {
    if (this.state !== "caught") this.seize();
  }

  onPlayerUnhide(): void {
    this.spot = undefined;
    this.sawHide = false;
  }

  // ---------------------------------------------------------------- vòng lặp

  update(dt: number): void {
    if (this.state === "inactive") return;
    this.time += dt;
    this.animateSprite(dt);

    switch (this.state) {
      case "idle":
        this.faceTowards(this.player.camera.position, dt * 0.8);
        this.head.rotation.z = Math.min(0.45, this.head.rotation.z + dt * 0.04);
        if (this.canSeePlayer() && this.distanceToPlayer() < tuning.sight.instantChaseDistance) this.startChase();
        break;

      case "patrol":
        if (this.perceive(dt)) break;
        this.tickLure(dt);
        if (this.timer > 0) {
          this.timer -= dt;
          this.lookAround(dt);
          if (this.timer <= 0) this.nextPatrolPoint();
        } else if (this.follow(dt, tuning.speed.patrol * diff().knockerSpeed)) {
          this.timer = rand(tuning.patrolPause);
          this.searchYaw = this.root.rotation.y;
        }
        break;

      case "investigate":
        if (this.perceive(dt)) break;
        if (this.follow(dt, (this.hurry ? tuning.speed.chase : tuning.speed.investigate) * diff().knockerSpeed)) this.startSearch();
        break;

      case "search":
        if (this.perceive(dt)) break;
        this.timer -= dt;
        if (this.atWardrobe()) {
          this.faceTowards(this.spot!.inside, dt * 3);
          if (this.sawHide && this.timer < tuning.wardrobeSearchTime - 1.2) return this.seize();
        } else {
          this.lookAround(dt);
        }
        if (this.timer <= 0) this.startPatrol();
        break;

      case "chase":
        this.updateChase(dt);
        break;

      case "caught":
        this.updateCaught(dt);
        break;
    }

    if (this.state !== "caught" && this.state !== "idle") this.head.rotation.z *= 1 - Math.min(1, dt * 2);
  }

  /** Nhìn và nghe. Trả về true nếu trạng thái vừa đổi. */
  private perceive(dt: number): boolean {
    const dist = this.distanceToPlayer();
    if (this.canSeePlayer()) {
      this.lastKnown = flat(this.player.camera.position);
      const range = (this.player.flashlightOn ? tuning.sight.rangeFlashlight : tuning.sight.range) * diff().sight;
      if (dist < tuning.sight.instantChaseDistance) return this.startChase();
      this.alert += dt * tuning.sight.alertPerSecond * (1.5 - dist / range);
      if (this.alert >= 1) return this.startChase();
      if (this.alert > 0.3 && this.state !== "investigate") {
        this.investigate(this.lastKnown, false);
        return true;
      }
      return false;
    }

    this.alert = Math.max(0, this.alert - dt * tuning.sight.alertDecayPerSecond);
    const noise = this.player.noise;
    const heard =
      !this.player.hidden && ((noise === 2 && dist < tuning.hearing.sprint * diff().hearing) || (noise === 1 && dist < tuning.hearing.walk * diff().hearing));
    if (heard) {
      const at = flat(this.player.camera.position);
      if (this.state !== "investigate" || !this.lastKnown || Vector3.Distance(at, this.lastKnown) > 1.5) {
        this.lastKnown = at;
        this.investigate(at, false);
        return true;
      }
    }
    return false;
  }

  private updateChase(dt: number): void {
    const seen = this.canSeePlayer();
    if (seen) {
      this.lostTime = 0;
      this.lastKnown = flat(this.player.camera.position);
      this.route = [{ pos: this.lastKnown }];
    } else {
      this.lostTime += dt;
      if (this.route.length === 0 && this.lastKnown) this.routeTo(this.lastKnown);
    }

    if (!this.player.hidden && this.distanceToPlayer() < tuning.catchDistance) return this.seize();

    const arrived = this.follow(dt, tuning.speed.chase * diff().knockerSpeed);
    if (!seen && (arrived || this.lostTime > tuning.loseSightAfter + 4)) {
      this.alert = 0.5;
      this.startSearch();
    }
  }

  // ---------------------------------------------------------------- chuyển trạng thái

  private startChase(): true {
    if (this.state !== "chase") {
      this.game.audio.play("sting");
      this.game.director.set("chased");
    }
    this.state = "chase";
    this.lostTime = 0;
    this.alert = 1;
    return true;
  }

  private startPatrol(): void {
    this.state = "patrol";
    this.alert = 0;
    this.nextPatrolPoint();
  }

  private investigate(at: Vector3, hurry: boolean): void {
    this.state = "investigate";
    this.hurry = hurry;
    // Người chơi trốn trong tủ ngay chỗ nó định tới → nó tới đứng trước cửa tủ.
    const target = this.spot && Vector3.Distance(at, this.spot.front) < 2.2 ? this.spot.front : at;
    this.routeTo(target);
  }

  private startSearch(): void {
    this.state = "search";
    this.searchYaw = this.root.rotation.y;
    if (this.atWardrobe()) {
      this.timer = tuning.wardrobeSearchTime;
      this.game.audio.play("breath", this.headPosition());
      if (!this.sawHide) this.game.audio.play("whisper", this.headPosition());
      this.game.hud.subtitle(tuning.wardrobeLure, 3.5, true);
    } else {
      this.timer = tuning.searchTime;
    }
  }

  private nextPatrolPoint(): void {
    const nav = this.game.house.nav;
    const candidates = [...nav.nodes.values()].filter(
      (n) => n.patrol && n.id !== this.lastPatrolNode && Vector3.Distance(n.pos, flat(this.root.position)) > 1.5,
    );
    // "Dây xích" kiểu AI Director: thỉnh thoảng nó đi về phía phòng người chơi đang ở.
    let pool = candidates;
    if (Math.random() < tuning.patrolTowardsPlayer) {
      const room = nav.nearest(this.player.camera.position, (n) => this.clear(this.player.camera.position, n.pos)).room;
      const inRoom = candidates.filter((n) => n.room === room);
      if (inRoom.length) pool = inRoom;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    this.lastPatrolNode = next.id;
    this.routeTo(next.pos);
  }

  /** Bị bắt: mặt nó áp sát camera (jumpscare), rồi để Director chạy đoạn kết. */
  /** Khoác hình dạng Út: áo sơ mi trắng, tóc ngắn, mặt người — chỉ hơi quá cao. */
  private disguise(): void {
    this.disguised = true;
    this.cloth.diffuseColor = new Color3(0.62, 0.6, 0.55);
    this.locks.setEnabled(false);
    drawHumanFace(this.faceTex.getContext() as unknown as CanvasRenderingContext2D, 64, 96);
    this.faceTex.update();
    this.faceMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
    this.showModel(true);
  }

  /** Ma không chân: lơ lửng nhè nhẹ, thỉnh thoảng giật đầu sang một bên; lúc đuổi thì chúi về trước và đi giật cục. */
  private animateSprite(dt: number): void {
    if (this.state === "caught" || this.disguised) return;
    const m = this.sprite.mesh;
    this.twitchIn -= dt;
    if (this.twitchIn <= 0) {
      this.twitch = 0.16;
      this.twitchDir = Math.random() < 0.5 ? -1 : 1;
      this.twitchIn = rand(this.state === "chase" ? [0.5, 1.5] : [1.5, 4.5]);
    }
    this.twitch = Math.max(0, this.twitch - dt);
    m.rotation.z = this.twitch > 0 ? this.twitchDir * 0.08 : Math.sin(this.time * 0.7) * 0.015;
    m.rotation.x = this.state === "chase" ? -0.12 : -0.03;
    m.position.y = 0.03 + Math.sin(this.time * 1.1) * 0.025;
    const pivot = this.sprite.pivot;
    if (this.state === "chase") {
      this.stutter -= dt;
      if (this.stutter <= 0) {
        this.stutter = 0.11;
        pivot.position.setAll(0);
      } else {
        // Giữ nguyên chỗ cũ trên thế giới trong lúc gốc đã đi tiếp.
        pivot.position.addInPlace(Vector3.TransformNormal(this.lastStep, this.root.getWorldMatrix().clone().invert()).scale(-1));
      }
    } else pivot.position.setAll(0);
  }

  /** Bật khối hình học (giả làm Út) hoặc hình con ma. Thân vẫn bật để Director còn kiểm tra "nhìn thấy". */
  private showModel(on: boolean): void {
    for (const m of this.model) m.isVisible = on;
    this.sprite.pivot.setEnabled(!on);
  }

  /** Nghe tiếng động lớn ở `at` (vd. cầu dao). Đang đi tuần/lục soát thì tới xem. */
  hear(at: Vector3): void {
    if (this.state === "patrol" || this.state === "search" || this.state === "idle") this.investigate(flat(at), false);
  }

  private seize(): void {
    if (this.disguised) {
      // Lớp mặt Út rơi ra ngay trước mắt người chơi.
      drawEntityFace(this.faceTex.getContext() as unknown as CanvasRenderingContext2D, 64, 96);
      this.faceTex.update();
      this.showModel(false);
    }
    this.state = "caught";
    this.timer = 0;
    this.game.onCaught();
    const cam = this.player.camera;
    cam.rotation.x = 0;
    const fwd = flat(cam.getDirection(Vector3.Forward())).normalize();
    this.root.position = cam.position.add(fwd.scale(0.9));
    this.root.position.y = cam.position.y - (this.disguised ? EYE_HEIGHT : this.sprite.faceHeight);
    this.sprite.mat.emissiveColor = new Color3(0.55, 0.53, 0.5);
    this.root.rotation.y = Math.atan2(-fwd.x, -fwd.z);
    this.head.rotation.z = 0.25;
    this.faceMat.emissiveColor = new Color3(0.9, 0.88, 0.85);
    this.game.audio.play("shriek");
  }

  private updateCaught(dt: number): void {
    this.timer += dt;
    const cam = this.player.camera;
    const fwd = flat(cam.getDirection(Vector3.Forward())).normalize();
    const d = Math.max(0.42, 0.9 - this.timer * 3);
    this.root.position.x = cam.position.x + fwd.x * d;
    this.root.position.z = cam.position.z + fwd.z * d;
    cam.rotation.z = (Math.random() - 0.5) * 0.06;
    this.head.rotation.z = 0.25 + Math.sin(this.timer * 40) * 0.05;
    // Ảnh phẳng không nghiêng đầu được — rung giật kích thước thay vào.
    this.sprite.mesh.scaling.set(1 + Math.random() * 0.05, 1 + Math.sin(this.timer * 40) * 0.03, 1);
  }

  // ---------------------------------------------------------------- di chuyển

  private routeTo(target: Vector3): void {
    this.doorWait = 0;
    this.route = this.game.house.nav.route(flat(this.root.position), target, (a, b) => this.clear(a, b));
  }

  /** Đi theo route. Trả về true khi đã tới điểm cuối. */
  private follow(dt: number, speed: number): boolean {
    const wp = this.route[0];
    if (!wp) return true;

    if (wp.door && !this.game.house.isDoorOpen(wp.door)) {
      // Đứng trước cửa một nhịp rồi mới mở — người chơi kịp nghe tiếng cót két.
      if (this.doorWait <= 0) this.doorWait = 0.9;
      this.doorWait -= dt;
      if (this.doorWait <= 0) this.game.house.openDoor(wp.door);
      return false;
    }

    const pos = this.root.position;
    const to = wp.pos.subtract(flat(pos));
    const dist = to.length();
    const step = Math.min(dist, speed * dt);
    if (dist > 0.01) {
      pos.addInPlace(to.scale(step / dist));
      this.faceTowards(wp.pos, dt * 6);
    }
    this.stepDistance += step;
    if (this.stepDistance > STEP_LENGTH) {
      this.stepDistance = 0;
      this.game.audio.play("heavyStep", new Vector3(pos.x, 0.1, pos.z));
    }
    // Dáng đi: nhún nhẹ, nghiêng người như kéo lê chân.
    pos.y = Math.abs(Math.sin(this.time * speed * 4)) * 0.025;
    this.root.rotation.z = Math.sin(this.time * speed * 2) * 0.03;

    if (dist < 0.12) {
      this.route.shift();
      return this.route.length === 0;
    }
    return false;
  }

  private faceTowards(p: Vector3, rate: number): void {
    const dx = p.x - this.root.position.x;
    const dz = p.z - this.root.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    const target = Math.atan2(dx, dz);
    let diff = target - this.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.root.rotation.y += diff * Math.min(1, rate);
  }

  private lookAround(dt: number): void {
    const yaw = this.searchYaw + Math.sin(this.time * 1.4) * 0.9;
    let diff = yaw - this.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.root.rotation.y += diff * Math.min(1, dt * 3);
    this.root.rotation.z *= 1 - Math.min(1, dt * 4);
  }

  private tickLure(dt: number): void {
    this.lureTimer -= dt;
    if (this.lureTimer > 0) return;
    this.lureTimer = rand(tuning.lureEvery);
    // Chỉ gọi khi đủ gần để nghe — giọng gọi vừa là mồi nhử vừa là dấu hiệu nó đang ở đâu.
    if (this.distanceToPlayer() > 9) return;
    this.game.audio.play("whisper", this.headPosition());
    const line = tuning.lures[Math.floor(Math.random() * tuning.lures.length)];
    this.game.hud.subtitle(line, 3.5, true);
  }

  // ---------------------------------------------------------------- cảm nhận

  /** Nhìn thấy người chơi: trong tầm, trong góc nhìn, không bị tường che. Khi truy đuổi thì không xét góc. */
  private canSeePlayer(ignoreHidden = false): boolean {
    if (this.player.hidden && !ignoreHidden) return false;
    const eye = this.headPosition();
    const target = this.player.camera.position;
    const to = target.subtract(eye);
    const dist = to.length();
    const range = (this.state === "chase" || this.player.flashlightOn ? tuning.sight.rangeFlashlight : tuning.sight.range) * diff().sight;
    if (dist > range) return false;
    if (this.state !== "chase" && dist > 1.2) {
      const fwd = new Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
      if (Vector3.Dot(fwd, flat(to).normalize()) < Math.cos((tuning.sight.fov / 2) * DEG)) return false;
    }
    return this.ray(eye, target);
  }

  /** Không có vật cản giữa hai điểm trên sàn (thử ở tầm ngực). */
  private clear(a: Vector3, b: Vector3): boolean {
    return this.ray(new Vector3(a.x, PROBE_HEIGHT, a.z), new Vector3(b.x, PROBE_HEIGHT, b.z));
  }

  private ray(a: Vector3, b: Vector3): boolean {
    const d = b.subtract(a);
    const len = d.length();
    if (len < 0.01) return true;
    const hit = this.scene.pickWithRay(new Ray(a, d.scale(1 / len), len), (m) => m.isPickable && m.isEnabled());
    return !(hit?.hit && hit.distance < len - 0.05);
  }

  private atWardrobe(): boolean {
    return !!this.spot && Vector3.Distance(flat(this.root.position), this.spot.front) < 0.4;
  }

  private headPosition(): Vector3 {
    return this.root.position.add(new Vector3(0, EYE_HEIGHT, 0));
  }

  private distanceToPlayer(): number {
    const p = this.player.camera.position;
    return Math.hypot(p.x - this.root.position.x, p.z - this.root.position.z);
  }
}
