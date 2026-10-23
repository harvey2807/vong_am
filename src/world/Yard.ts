import { Color3, DirectionalLight, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import { buildEffigy } from "../entity/Effigy";
import type { Game } from "../core/Game";
import { makeInteractable } from "../interaction/Interaction";
import type { House } from "./House";
import { bananaLeafUrl, clothUrl, effigyFaceUrl, effigyRobeUrl, roofTileUrl } from "./decorTextures";

const WELL = new Vector3(10, 0, -5.5);
const CRANK_TIME = 6;
const CRANK_REACH = 2.6;
const BUCKET_LOW = 0.25;
const BUCKET_HIGH = 1.05;
const PYRE = new Vector3(8.6, 0, -2.0);
const BURN_TIME = 9;

/**
 * Vườn sau nhà (x 6..13, z -9..3): giếng gạch, bụi chuối, dây phơi đồ, lu nước, tường rào gạch rêu.
 * Chỉ ra được từ Đêm 2 (cửa sau). Ánh trăng là đèn hướng chỉ chiếu vật trong vườn, không lọt vào nhà.
 */
export class Yard {
  readonly meshes: Mesh[] = [];
  private bucket!: Mesh;
  private rope!: Mesh;
  private crank!: TransformNode;
  private crankProgress = 0;
  private cranking = false;
  private creakTimer = 0;
  private clothes: Mesh[] = [];
  private leaves: Mesh[] = [];
  private time = 0;
  private pyre?: { root: TransformNode; face: StandardMaterial; light: PointLight; burning: number };

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    this.buildGround();
    this.buildWell();
    this.buildBananas();
    this.buildClothesline();
    if (house.night === 3) this.buildPyre();

    const moon = new DirectionalLight("yardMoon", new Vector3(-0.4, -1, 0.35), scene);
    moon.diffuse = new Color3(0.45, 0.55, 0.75);
    moon.specular = Color3.Black();
    moon.intensity = 0.85;
    moon.includedOnlyMeshes = this.meshes;
    // Bóng đèn dưới mái hiên cửa sau: vùng ấm nhỏ giữa khoảng vườn lạnh.
    house.addBulb("porchLight", new Vector3(6.55, 2.55, -5.15), 0.9, true, 7);

    house.anchors.set("well", new Vector3(WELL.x, 0.6, WELL.z));
    house.anchors.set("bananaGrove", new Vector3(12.2, 0, -0.6));
  }

  private get director() {
    return this.game.director;
  }

  private add<T extends Mesh>(m: T, collide = true): T {
    m.checkCollisions = collide;
    m.isPickable = collide;
    m.receiveShadows = true;
    this.meshes.push(m);
    return m;
  }

  private texMat(name: string, url: string, u = 1, v = 1, alpha = false): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    const t = new Texture(url, this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    t.uScale = u;
    t.vScale = v;
    t.hasAlpha = alpha;
    m.diffuseTexture = t;
    m.useAlphaFromDiffuseTexture = alpha;
    m.specularColor = Color3.Black();
    if (alpha) m.backFaceCulling = false;
    return m;
  }

  private buildGround(): void {
    const dirt = this.house.surface("mud", 3, 5, new Color3(0.55, 0.55, 0.5));
    this.add(this.house.box("yardGround", 7.4, 0.2, 12.4, new Vector3(9.7, -0.1, -3), dirt));

    const brick = this.house.surface("fence", 6, 1.2, new Color3(0.7, 0.72, 0.65));
    const brickShort = this.house.surface("fence", 2, 1.2, new Color3(0.7, 0.72, 0.65));
    this.add(this.house.box("fence", 0.25, 2.2, 12.4, new Vector3(13.3, 1.1, -3), brick));
    this.add(this.house.box("fence", 7.4, 2.2, 0.25, new Vector3(9.7, 1.1, -9.15), brick));
    this.add(this.house.box("fence", 7.4, 2.2, 0.25, new Vector3(9.7, 1.1, 3.15), brick));
    this.add(this.house.box("fence", 0.25, 2.2, 3.2, new Vector3(6.05, 1.1, -7.6), brickShort));

    // Mái hiên ngói che cửa sau.
    const tile = this.texMat("roofTile", roofTileUrl(), 10, 1.5);
    const eave = this.add(this.house.box("eave", 1.4, 0.08, 12.6, new Vector3(6.65, 2.95, 0), tile), false);
    eave.rotation.z = -0.25;

    // Lu nước cạnh cửa sau.
    const jar = MeshBuilder.CreateCylinder("yardJar", { diameterTop: 0.5, diameter: 0.85, diameterBottom: 0.5, height: 0.9, tessellation: 12 }, this.scene);
    jar.position = new Vector3(6.75, 0.45, -4.0);
    jar.material = this.house.mat("glaze", undefined, 1, 1, new Color3(0.3, 0.2, 0.12));
    this.add(jar);

    // Trăng sau mây: đĩa mờ ở xa, không bị sương che.
    const moonMat = new StandardMaterial("moonDisc", this.scene);
    moonMat.emissiveColor = new Color3(0.3, 0.33, 0.38);
    moonMat.disableLighting = true;
    moonMat.fogEnabled = false;
    moonMat.backFaceCulling = false;
    const moon = MeshBuilder.CreateDisc("moonDisc", { radius: 1.3, tessellation: 20 }, this.scene);
    moon.position = new Vector3(40, 26, -24);
    moon.lookAt(new Vector3(9, 1.6, -3));
    moon.rotation.y += Math.PI;
    moon.material = moonMat;
    moon.isPickable = false;
  }

  private buildWell(): void {
    const brick = this.house.surface("brick", 3, 0.7, new Color3(0.7, 0.62, 0.55));
    const ring = MeshBuilder.CreateCylinder("well", { diameter: 1.35, height: 0.8, tessellation: 16 }, this.scene);
    ring.position = new Vector3(WELL.x, 0.4, WELL.z);
    ring.material = brick;
    this.add(ring);

    const dark = new StandardMaterial("wellDark", this.scene);
    dark.diffuseColor = Color3.Black();
    dark.specularColor = Color3.Black();
    const hole = MeshBuilder.CreateDisc("wellHole", { radius: 0.56, tessellation: 16 }, this.scene);
    hole.position = new Vector3(WELL.x, 0.805, WELL.z);
    hole.rotation.x = Math.PI / 2;
    hole.material = dark;
    this.add(hole, false);
    const rim = MeshBuilder.CreateTorus("wellRim", { diameter: 1.25, thickness: 0.12, tessellation: 16 }, this.scene);
    rim.position = new Vector3(WELL.x, 0.8, WELL.z);
    rim.material = this.house.mat("stone", undefined, 1, 1, new Color3(0.32, 0.31, 0.28));
    this.add(rim, false);

    const wood = this.house.mat("wellWood", undefined, 1, 1, new Color3(0.2, 0.13, 0.08));
    // Cột mảnh: vẫn va chạm nhưng không chặn tia tương tác, để đứng phía nào cũng kéo gàu được.
    for (const dx of [-0.78, 0.78]) this.add(this.house.box("wellPost", 0.12, 1.95, 0.12, new Vector3(WELL.x + dx, 0.975, WELL.z), wood)).isPickable = false;
    const tile = this.texMat("wellRoof", roofTileUrl(), 2, 1);
    for (const side of [-1, 1]) {
      const r = this.add(this.house.box("wellRoof", 1.9, 0.05, 0.8, new Vector3(WELL.x, 2.12, WELL.z + side * 0.32), tile), false);
      r.rotation.x = side * 0.5;
    }

    // Trục quay + tay quay.
    this.crank = new TransformNode("wellCrank", this.scene);
    this.crank.position = new Vector3(WELL.x, 1.72, WELL.z);
    const axle = this.add(MeshBuilder.CreateCylinder("wellAxle", { diameter: 0.12, height: 1.62, tessellation: 8 }, this.scene), false);
    axle.parent = this.crank;
    axle.rotation.z = Math.PI / 2;
    axle.material = wood;
    const arm = this.add(this.house.box("wellHandle", 0.04, 0.3, 0.04, new Vector3(0.86, 0.15, 0), wood), false);
    arm.parent = this.crank;

    const rope = this.house.mat("rope", undefined, 1, 1, new Color3(0.42, 0.36, 0.25));
    this.rope = this.add(MeshBuilder.CreateCylinder("wellRope", { diameter: 0.02, height: 1, tessellation: 4 }, this.scene), false);
    this.rope.material = rope;
    this.bucket = this.add(MeshBuilder.CreateCylinder("wellBucket", { diameterTop: 0.3, diameterBottom: 0.22, height: 0.28, tessellation: 10 }, this.scene), false);
    this.bucket.material = wood;
    this.setBucket(BUCKET_LOW);

    makeInteractable(ring, {
      prompt: () => {
        if (this.director.has("shard_well") || !this.director.has("read_uncle_note")) return this.director.has("shard_well") ? null : "Giếng";
        return this.cranking ? null : "Kéo gàu lên";
      },
      interact: () => {
        if (!this.director.has("read_uncle_note")) {
          this.game.hud.subtitle("Giếng sâu, tối om. Mùi rêu với nước tù.", 3.5);
          return;
        }
        this.cranking = true;
        this.director.set("cranking");
        this.game.hud.subtitle("Gàu nặng hơn mình tưởng… Phải đứng gần mà quay.", 3.5);
      },
    });
  }

  private setBucket(y: number): void {
    this.bucket.position.set(WELL.x, y, WELL.z);
    const top = 1.66;
    const len = top - (y + 0.14);
    this.rope.scaling.y = len;
    this.rope.position.set(WELL.x, y + 0.14 + len / 2, WELL.z);
  }

  private buildBananas(): void {
    const trunk = this.house.mat("bananaTrunk", undefined, 1, 1, new Color3(0.22, 0.24, 0.12));
    const leaf = this.texMat("bananaLeaf", bananaLeafUrl(), 1, 1, true);
    const trees: [number, number, number][] = [
      [11.9, 1.8, 2.4],
      [12.6, 0.1, 2.1],
      [12.5, -2.1, 2.6],
      [7.2, 2.3, 2.0],
    ];
    for (const [x, z, h] of trees) {
      const t = MeshBuilder.CreateCylinder("bananaTrunk", { diameterTop: 0.16, diameterBottom: 0.26, height: h, tessellation: 7 }, this.scene);
      t.position = new Vector3(x, h / 2, z);
      t.material = trunk;
      this.add(t);
      for (let i = 0; i < 7; i++) {
        const pivot = new TransformNode("leafPivot", this.scene);
        pivot.position = new Vector3(x, h - 0.1, z);
        pivot.rotation.y = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        const l = MeshBuilder.CreatePlane("bananaLeaf", { width: 0.5, height: 1.8 }, this.scene);
        l.parent = pivot;
        l.material = leaf;
        l.setPivotPoint(new Vector3(0, -0.9, 0));
        l.position = new Vector3(0, 0.9, 0);
        // Lá già rủ xuống, lá non dựng đứng.
        l.rotation.x = 0.5 + Math.random() * 1.2;
        this.add(l, false);
        this.leaves.push(l);
      }
    }

    // Ụ đất mới bới dưới gốc chuối — mảnh chén thứ hai.
    const mound = MeshBuilder.CreateSphere("mound", { diameter: 0.6, segments: 5 }, this.scene);
    mound.scaling.y = 0.25;
    mound.position = new Vector3(11.55, 0.02, 1.35);
    mound.material = this.house.surface("mud", 1, 1, new Color3(0.45, 0.4, 0.35));
    this.add(mound, false);
    mound.isPickable = true;
    makeInteractable(mound, {
      prompt: () => (this.director.has("shard_banana") ? null : this.director.has("read_uncle_note") ? "Bới đất dưới gốc chuối" : "Ụ đất"),
      interact: () => {
        if (!this.director.has("read_uncle_note")) {
          this.game.hud.subtitle("Đất mới xới. Ai bới chỗ này?", 3);
          return;
        }
        this.game.audio.play("dig", mound.position);
        mound.scaling.y = 0.08;
        this.house.collect("banana", "Mảnh thứ hai. Đất dưới gốc chuối lạnh ngắt, như vừa có ai đứng đây.");
      },
    });
  }

  private buildClothesline(): void {
    const wood = this.house.mat("wellWood", undefined, 1, 1, new Color3(0.2, 0.13, 0.08));
    for (const x of [7.2, 12.6]) this.add(this.house.box("clothesPost", 0.08, 2.1, 0.08, new Vector3(x, 1.05, -8.4), wood));
    const line = this.add(MeshBuilder.CreateCylinder("clothesLine", { diameter: 0.01, height: 5.4, tessellation: 4 }, this.scene), false);
    line.position = new Vector3(9.9, 2.0, -8.4);
    line.rotation.z = Math.PI / 2;
    line.material = wood;

    const cloth = this.texMat("clothes", clothUrl());
    cloth.backFaceCulling = false;
    const pieces: [number, number, number][] = [
      [8.3, 0.6, 0.8],
      [9.3, 0.55, 0.7],
      [10.9, 0.45, 1.45], // áo dài trắng, dài gần chạm đất
      [11.9, 0.6, 0.8],
    ];
    for (const [x, w, h] of pieces) {
      const c = MeshBuilder.CreatePlane("clothes", { width: w, height: h }, this.scene);
      c.material = cloth;
      c.setPivotPoint(new Vector3(0, h / 2, 0));
      c.position = new Vector3(x, 2.0 - h / 2, -8.4);
      this.add(c, false);
      this.clothes.push(c);
    }
  }

  /** Hình nhân thế mạng thầy dựng sẵn trên giàn tre, quay mặt về phía cửa sau. */
  private buildPyre(): void {
    const { root, body, face } = buildEffigy(this.scene, "standIn", "#d8d2c4", true);
    root.position = PYRE.clone();
    root.rotation.y = -Math.PI / 2;
    root.scaling.setAll(1.12);
    for (const m of root.getChildMeshes()) this.meshes.push(m as Mesh);
    // Đống rơm + củi dưới chân.
    const straw = this.house.mat("straw", undefined, 1, 1, new Color3(0.5, 0.42, 0.2));
    const pile = this.add(MeshBuilder.CreateCylinder("strawPile", { diameterTop: 0.5, diameterBottom: 1.1, height: 0.25, tessellation: 10 }, this.scene), false);
    pile.position = PYRE.add(new Vector3(0, 0.12, 0));
    pile.material = straw;
    body.isPickable = true;
    const light = new PointLight("pyreLight", PYRE.add(new Vector3(0, 1.3, 0)), this.scene);
    light.diffuse = new Color3(1, 0.55, 0.2);
    light.specular = Color3.Black();
    light.range = 9;
    light.intensity = 0;
    this.pyre = { root, face, light, burning: 0 };
    this.house.anchors.set("pyre", PYRE.add(new Vector3(0, 1, 0)));

    const d = () => this.director;
    makeInteractable(body, {
      prompt: () => {
        if (d().has("burned") || !d().has("read_master_note")) return d().has("burned") ? null : "Hình nhân thế mạng";
        if (!d().has("effigy_dressed")) return d().has("has_shirt") && d().has("has_photo") ? "Mặc áo, dán ảnh lên mặt hình nhân" : "Hình nhân thế mạng";
        return d().has("has_matches") ? "Đốt hình nhân" : "Hình nhân thế mạng";
      },
      interact: () => {
        if (!d().has("read_master_note")) {
          this.game.hud.subtitle("Một hình nhân giấy trắng, không mặt, đứng trên đống rơm. Ai dựng ở đây?", 4);
        } else if (!d().has("effigy_dressed")) {
          if (!(d().has("has_shirt") && d().has("has_photo"))) {
            const missing = [!d().has("has_shirt") && "áo cũ", !d().has("has_photo") && "ảnh của mình"].filter(Boolean).join(" và ");
            this.game.hud.subtitle(`Còn thiếu ${missing}.`, 3);
            return;
          }
          this.dress();
        } else if (!d().has("has_matches")) {
          this.game.hud.subtitle("Phải có diêm. Hộp thiếc dưới bếp.", 3);
        } else {
          this.ignite();
        }
      },
    });
  }

  private dress(): void {
    const p = this.pyre!;
    p.face.diffuseTexture = new Texture(effigyFaceUrl("painted"), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    const body = this.scene.getMeshByName("standInBody");
    const robe = body?.material as StandardMaterial | undefined;
    if (robe) robe.diffuseTexture = new Texture(effigyRobeUrl("#e8e4da"), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    this.game.audio.play("rustle", PYRE.add(new Vector3(0, 1, 0)));
    this.director.set("effigy_dressed");
  }

  private ignite(): void {
    const p = this.pyre!;
    p.burning = 0.001;
    this.game.fx.fire(PYRE.clone());
    this.game.audio.play("whoosh", PYRE.add(new Vector3(0, 1, 0)));
    this.director.set("burned");
  }

  update(dt: number): void {
    this.time += dt;
    if (this.pyre && this.pyre.burning > 0) {
      const p = this.pyre;
      p.burning += dt;
      const k = Math.min(1, p.burning / BURN_TIME);
      p.light.intensity = (1.6 + Math.sin(this.time * 17) * 0.25 + Math.random() * 0.3) * (1 - k * 0.5);
      // Giấy cháy xém đen dần, co rúm và đổ xuống.
      p.root.scaling.y = 1.12 * (1 - k * 0.75);
      for (const m of p.root.getChildMeshes()) {
        const mat = m.material as StandardMaterial | null;
        if (mat) mat.diffuseColor = Color3.Lerp(Color3.White(), new Color3(0.08, 0.05, 0.04), k);
      }
    }
    for (let i = 0; i < this.clothes.length; i++) {
      this.clothes[i].rotation.x = Math.sin(this.time * 1.3 + i * 1.7) * 0.18 + Math.sin(this.time * 3.1 + i) * 0.04;
    }
    for (let i = 0; i < this.leaves.length; i += 2) this.leaves[i].rotation.z = Math.sin(this.time * 0.9 + i) * 0.06;

    if (!this.cranking || this.director.has("shard_well")) return;
    const cam = this.game.player.camera.position;
    if (Math.hypot(cam.x - WELL.x, cam.z - WELL.z) > CRANK_REACH || this.game.player.hidden) return;
    this.crankProgress += dt / CRANK_TIME;
    this.crank.rotation.x -= dt * 4;
    this.setBucket(BUCKET_LOW + (BUCKET_HIGH - BUCKET_LOW) * Math.min(1, this.crankProgress));
    this.creakTimer -= dt;
    if (this.creakTimer <= 0) {
      this.creakTimer = 1.3;
      this.game.audio.play("creak", new Vector3(WELL.x, 1.7, WELL.z));
    }
    if (this.crankProgress >= 1) {
      this.cranking = false;
      this.game.audio.play("splash", new Vector3(WELL.x, 0.8, WELL.z));
      this.house.collect("well", "Trong gàu có mảnh chén men lam. Nước dưới giếng ấm, ấm như hơi người.");
    }
  }
}
