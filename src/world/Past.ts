import { Color3, DynamicTexture, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Texture, TransformNode, Vector3 } from "../babylon";
import type { Game } from "../core/Game";
import { makeInteractable } from "../interaction/Interaction";
import type { HidingSpot, House } from "./House";
import { PropKit } from "./PropKit";
import { drawHumanFace } from "./textures";

/**
 * Chương hồi tưởng "Rằm năm Quý Mùi" (2003), chơi bằng góc nhìn Út sáu tuổi.
 * Ông ngồi bào một cỗ hòm nhỏ trong tiệm; bàn thờ còn rộng, khăn đỏ phủ chấm đất — dưới gầm có chỗ cho trẻ con
 * chui vào, và đã có một đứa nằm sẵn ở đó.
 */
export class Past {
  private readonly kit: PropKit;
  private valance!: Mesh;
  private faceTex!: DynamicTexture;
  private planeTime = 0;

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    this.kit = new PropKit(scene, "past");
    this.buildGrandpa();
    this.buildAltar();
    this.kit.finish();
    house.anchors.set("shopBench", new Vector3(-3.6, 1.1, -1.1));
  }

  /** Ông ngồi trên ghế đẩu, lưng quay ra cửa tiệm, cỗ hòm nhỏ trên bàn. */
  private buildGrandpa(): void {
    const k = this.kit;
    const wood = this.house.surface("wood", 1, 1, new Color3(0.72, 0.48, 0.3));
    const shirt = k.color("ongShirt", new Color3(0.62, 0.58, 0.5), 0.05);
    const pants = k.color("ongPants", new Color3(0.1, 0.09, 0.08));
    const skin = k.color("ongSkin", new Color3(0.5, 0.38, 0.3), 0.04);
    const hair = k.color("ongHair", new Color3(0.55, 0.55, 0.52), 0.04);
    k.box("Stool", 0.36, 0.42, 0.32, new Vector3(-3.6, 0.21, -1.35), wood, { solid: true });
    k.box("OngLegs", 0.34, 0.16, 0.42, new Vector3(-3.6, 0.5, -1.2), pants);
    k.box("OngBody", 0.42, 0.55, 0.24, new Vector3(-3.6, 0.86, -1.38), shirt, { rot: [0.18, 0, 0] });
    k.sphere("OngHead", 0.22, new Vector3(-3.6, 1.26, -1.3), hair);
    k.sphere("OngNeck", 0.11, new Vector3(-3.6, 1.12, -1.33), skin);
    for (const s of [-1, 1]) k.box("OngArm", 0.08, 0.08, 0.42, new Vector3(-3.6 + s * 0.2, 0.92, -1.05), shirt, { rot: [0.35, 0, 0] });

    // Cỗ hòm nhỏ ông đang bào dở, phoi gỗ rơi quanh chân bàn.
    const box = k.box("SmallCoffin", 1.1, 0.3, 0.38, new Vector3(-3.6, 1.0, -0.55), wood, { keep: true });
    box.isPickable = true;
    k.box("Plane", 0.22, 0.06, 0.07, new Vector3(-3.15, 1.18, -0.6), k.color("plane", new Color3(0.3, 0.2, 0.12)));
    const shaving = k.color("shaving", new Color3(0.85, 0.7, 0.48), 0.06);
    for (let i = 0; i < 16; i++) {
      k.plane("Shaving", 0.08, 0.03, new Vector3(-4.3 + Math.random() * 1.4, 0.008 + i * 0.0003, -1.0 - Math.random() * 0.7), shaving, {
        rot: [Math.PI / 2, Math.random() * Math.PI, 0],
      });
    }
    makeInteractable(box, {
      prompt: () => "Cái hòm nhỏ",
      interact: () => {
        this.game.hud.subtitle("Gỗ còn thơm. Dài vừa bằng mình nằm.", 3.5);
        this.game.director.set("saw_small_coffin");
      },
    });
  }

  /**
   * Bàn thờ năm 2003 rộng hơn: tấm ván nối ra phía trước, khăn đỏ phủ chấm đất. Dưới gầm có một đứa trẻ nằm nghiêng,
   * mặt quay ra phía phòng — từ chỗ trốn chỉ thấy gáy nó.
   */
  private buildAltar(): void {
    const k = this.kit;
    const lacquer = k.color("altarBoard", new Color3(0.32, 0.08, 0.05));
    k.box("AltarBoard", 0.5, 0.06, 1.8, new Vector3(-5.95, 1.07, 3), lacquer, { solid: true });
    const red = new StandardMaterial("pastValance", this.scene);
    red.diffuseColor = new Color3(0.5, 0.06, 0.05);
    red.emissiveColor = new Color3(0.06, 0.008, 0.006);
    red.specularColor = Color3.Black();
    red.backFaceCulling = false;
    this.valance = MeshBuilder.CreatePlane("pastValance", { width: 1.8, height: 1.03 }, this.scene);
    this.valance.position.set(-5.71, 0.53, 3);
    this.valance.rotation.y = -Math.PI / 2;
    this.valance.material = red;

    // Đứa trẻ dưới gầm bàn thờ: áo sơ mi trắng, quần sọt, tóc đen. Đầu ở phía z lớn (gần chỗ mình chui vào).
    const kid = new TransformNode("pastKid", this.scene);
    kid.position.set(-5.95, 0, 0);
    const white = k.color("kidShirt", new Color3(0.82, 0.8, 0.74), 0.05);
    const shorts = k.color("kidShorts", new Color3(0.12, 0.14, 0.2));
    const legs = k.color("kidSkin", new Color3(0.62, 0.48, 0.38), 0.04);
    const part = (m: Mesh) => {
      m.parent = kid;
      m.isPickable = false;
      return m;
    };
    const box = (w: number, h: number, d: number, z: number, y: number, mat: StandardMaterial) => {
      const m = part(MeshBuilder.CreateBox("pastKidPart", { width: w, height: h, depth: d }, this.scene));
      m.position.set(0, y, z);
      m.material = mat;
    };
    box(0.18, 0.2, 0.36, 2.66, 0.12, white);
    box(0.17, 0.16, 0.18, 2.4, 0.1, shorts);
    box(0.13, 0.1, 0.36, 2.13, 0.07, legs);
    const head = part(MeshBuilder.CreateSphere("pastKidHead", { diameter: 0.2, segments: 8 }, this.scene));
    head.position.set(0, 0.14, 2.96);
    head.material = k.color("kidHair", new Color3(0.05, 0.04, 0.035));
    this.faceTex = new DynamicTexture("pastKidFace", { width: 64, height: 64 }, this.scene, false, Texture.TRILINEAR_SAMPLINGMODE);
    this.drawFace(false);
    const fm = new StandardMaterial("pastKidFaceMat", this.scene);
    fm.diffuseTexture = this.faceTex;
    fm.emissiveColor = new Color3(0.35, 0.32, 0.28);
    fm.specularColor = Color3.Black();
    const face = part(MeshBuilder.CreatePlane("pastKidFace", { width: 0.16, height: 0.18 }, this.scene));
    face.position.set(0.102, 0.14, 2.96);
    face.rotation.set(0, -Math.PI / 2, -Math.PI / 2);
    face.material = fm;
    // Ánh đèn thờ đỏ lọt qua mép khăn: đủ để thấy chiếc áo trắng nằm cạnh mình.
    const glow = new PointLight("pastUnderGlow", new Vector3(-5.9, 0.35, 3.3), this.scene);
    glow.diffuse = new Color3(1, 0.35, 0.25);
    glow.specular = Color3.Black();
    glow.intensity = 0.35;
    glow.range = 1.8;

    const under: HidingSpot = {
      inside: new Vector3(-5.95, 0.3, 3.55),
      insideYaw: Math.PI,
      insidePitch: 0.12,
      outside: new Vector3(-5.0, 1.05, 3.0),
      outsideYaw: -Math.PI / 2,
      front: new Vector3(-5.0, 0, 3.0),
      kind: "altar",
      exit: null,
    };
    makeInteractable(this.valance, {
      prompt: () => {
        const d = this.game.director;
        if (d.has("under_altar")) return null;
        return d.has("hide_now") ? "Chui xuống gầm bàn thờ" : "Khăn bàn thờ";
      },
      interact: () => {
        const d = this.game.director;
        if (!d.has("hide_now")) {
          this.game.hud.subtitle("Gầm bàn thờ. Mình hay chui vô đây trốn.\nBà thấy mà làm như không thấy.", 4);
          return;
        }
        this.game.hide(under);
        d.set("under_altar");
      },
    });
  }

  /** Mặt đứa trẻ: nhắm mắt, hoặc mở — mắt người, không có hai chấm mực. */
  private drawFace(open: boolean): void {
    const ctx = this.faceTex.getContext() as unknown as CanvasRenderingContext2D;
    drawHumanFace(ctx, 64, 64);
    if (!open) {
      ctx.fillStyle = "#c9b8a2";
      ctx.fillRect(64 * 0.25, 64 * 0.38, 64 * 0.5, 64 * 0.14);
      ctx.strokeStyle = "#2a211a";
      ctx.lineWidth = 1.5;
      for (const dx of [-0.15, 0.15]) {
        ctx.beginPath();
        ctx.moveTo(64 * (0.5 + dx) - 6, 64 * 0.46);
        ctx.quadraticCurveTo(64 * (0.5 + dx), 64 * 0.49, 64 * (0.5 + dx) + 6, 64 * 0.46);
        ctx.stroke();
      }
    }
    this.faceTex.update();
  }

  beat(name: string): boolean {
    switch (name) {
      case "pastLifted":
        // Bà ẵm mình ra: khăn vén lên, nhìn xuống chỗ đứa kia còn nằm.
        this.valance.setEnabled(false);
        this.game.hide({
          inside: new Vector3(-5.3, 0.95, 2.95),
          insideYaw: -Math.PI / 2,
          insidePitch: 0.95,
          outside: new Vector3(-5.05, 1.05, 2.95),
          outsideYaw: -Math.PI / 2,
          front: new Vector3(-5.05, 0, 2.95),
          kind: "held",
          exit: null,
        });
        return true;
      case "pastEyes":
        this.drawFace(true);
        return true;
    }
    return false;
  }

  update(dt: number): void {
    // Tiếng bào gỗ đều đều trong tiệm, tới khi ông ra canh cửa.
    if (this.game.director.has("go_midnight")) return;
    this.planeTime -= dt;
    if (this.planeTime <= 0) {
      this.planeTime = 2.2 + Math.random() * 1.2;
      this.game.audio.play("rustle", this.house.anchors.get("shopBench"));
    }
  }
}
