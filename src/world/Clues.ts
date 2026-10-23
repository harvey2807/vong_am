import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "../babylon";
import type { Game } from "../core/Game";
import { makeInteractable } from "../interaction/Interaction";
import notes from "../data/notes.json";
import type { House } from "./House";

/**
 * Đồ vật manh mối của kịch bản v2 (docs/SCRIPT_V2.md) — loại "đời thường bất thường":
 * - Đêm 1: mâm cơm cúng đầu thất trên sập (bốn chén, bốn đôi đũa; quay lại thì có chén thứ năm đựng cháo trắng — thứ
 *   người ta cúng cô hồn), đôi chân con nít đứng cạnh bàn thờ lúc mất điện;
 * - mọi đêm trong nhà: hộp thuốc hạ sốt "bé Út" trên tủ đầu giường, xấp lịch tháng Bảy sau cửa phòng bà.
 */
export class Clues {
  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    if (house.night === 1) {
      this.buildMeal();
      this.buildChildFeet();
      // Ngoài cửa phòng bà (phía hành lang): chỗ bước chân dừng lại lúc có tiếng gõ.
      house.anchors.set("bedroomDoorOut", new Vector3(0.45, 0.2, 3.6));
    }
    this.buildMedicine();
    this.buildJulyPages();
  }

  private mat(name: string, color: Color3, emissive = 0.04): StandardMaterial {
    const m = new StandardMaterial(`clue-${name}`, this.scene);
    m.diffuseColor = color;
    m.specularColor = Color3.Black();
    m.emissiveColor = color.scale(emissive);
    return m;
  }

  private part(m: Mesh, pos: Vector3, mat: StandardMaterial): Mesh {
    m.position = pos;
    m.material = mat;
    m.isPickable = false;
    return m;
  }

  /** Mâm cơm cúng đầu thất trên sập gỗ, nhìn thẳng ra bàn thờ. Chén thứ năm (cháo trắng) ẩn tới khi kịch bản cho hiện. */
  private buildMeal(): void {
    const top = 0.45;
    const c = new Vector3(-2.85, top, 4.95);
    const tray = this.part(MeshBuilder.CreateCylinder("mamTray", { diameter: 0.64, height: 0.03, tessellation: 20 }, this.scene), c.add(new Vector3(0, 0.015, 0)), this.mat("tray", new Color3(0.42, 0.1, 0.06)));
    this.house.targets.set("mam", tray);
    this.house.anchors.set("mam", c.add(new Vector3(0, 0.3, 0)));
    const bowlMat = this.mat("bowl", new Color3(0.78, 0.8, 0.82), 0.06);
    const rice = this.mat("rice", new Color3(0.92, 0.9, 0.84), 0.12);
    const stick = this.mat("chopstick", new Color3(0.55, 0.42, 0.25));
    const bowl = (at: Vector3, fill: StandardMaterial, name: string) => {
      const b = this.part(MeshBuilder.CreateCylinder(name, { diameterTop: 0.11, diameterBottom: 0.055, height: 0.05, tessellation: 10 }, this.scene), at.add(new Vector3(0, 0.055, 0)), bowlMat);
      const f = this.part(MeshBuilder.CreateCylinder(`${name}Fill`, { diameter: 0.1, height: 0.005, tessellation: 10 }, this.scene), at.add(new Vector3(0, 0.078, 0)), fill);
      return [b, f];
    };
    // Bốn chén, bốn đôi đũa quanh mâm.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const at = c.add(new Vector3(Math.cos(a) * 0.22, 0.03, Math.sin(a) * 0.22));
      bowl(at, rice, "mamBowl");
      for (const d of [-0.012, 0.012]) {
        const s = this.part(MeshBuilder.CreateCylinder("mamStick", { diameter: 0.006, height: 0.2, tessellation: 4 }, this.scene), at.add(new Vector3(Math.cos(a) * 0.09, 0.006, Math.sin(a) * 0.09 + d)), stick);
        s.rotation.set(0, -a, Math.PI / 2);
      }
    }
    // Giữa mâm: dĩa gà luộc, dĩa rau, chén nước mắm.
    this.part(MeshBuilder.CreateCylinder("mamPlate", { diameter: 0.18, height: 0.015, tessellation: 12 }, this.scene), c.add(new Vector3(-0.04, 0.04, 0)), bowlMat);
    this.part(MeshBuilder.CreateSphere("mamChicken", { diameter: 0.12, segments: 5 }, this.scene), c.add(new Vector3(-0.04, 0.07, 0)), this.mat("chicken", new Color3(0.85, 0.65, 0.25), 0.08)).scaling.y = 0.55;
    this.part(MeshBuilder.CreateCylinder("mamGreens", { diameter: 0.13, height: 0.03, tessellation: 8 }, this.scene), c.add(new Vector3(0.09, 0.05, -0.06)), this.mat("greens", new Color3(0.2, 0.35, 0.12)));

    // Chén thứ năm, sát mép sập phía tường: cháo trắng loãng, không có đũa.
    const porridge = this.mat("porridge", new Color3(0.9, 0.9, 0.86), 0.25);
    const fifth = bowl(new Vector3(-2.6, top, 5.52), porridge, "mamBowl5");
    const mark = this.part(MeshBuilder.CreateBox("mamBowl5Mark", { size: 0.16 }, this.scene), new Vector3(-2.6, top + 0.06, 5.52), bowlMat);
    mark.isVisible = false;
    fifth.forEach((m) => (m.parent = mark));
    fifth.forEach((m) => m.position.subtractInPlace(mark.position));
    mark.setEnabled(false);
    this.house.targets.set("bowl5", mark);
  }

  /** Đôi chân con nít đứng cạnh đầu bàn thờ — chỉ hiện lúc mất điện, nếu người chơi đang ở phòng khách khi nghe gõ. */
  private buildChildFeet(): void {
    const skin = this.mat("feet", new Color3(0.72, 0.62, 0.55), 0.12);
    const root = MeshBuilder.CreateBox("childFeetMark", { width: 0.3, height: 0.5, depth: 0.3 }, this.scene);
    root.position = new Vector3(-5.6, 0.25, 1.7);
    root.isVisible = false;
    root.isPickable = false;
    for (const dz of [-0.06, 0.06]) {
      const foot = this.part(MeshBuilder.CreateBox("childFoot", { width: 0.14, height: 0.045, depth: 0.065 }, this.scene), new Vector3(0.03, -0.23, dz), skin);
      foot.parent = root;
      const shin = this.part(MeshBuilder.CreateCylinder("childShin", { diameterTop: 0.05, diameterBottom: 0.04, height: 0.32, tessellation: 6 }, this.scene), new Vector3(-0.02, -0.05, dz), skin);
      shin.parent = root;
    }
    root.setEnabled(false);
    this.house.targets.set("childFeet", root);
  }

  /** Hộp thuốc hạ sốt trên tủ đầu giường: tháng Bảy nào Út cũng sốt — những lần bà dán thêm giấy. */
  private buildMedicine(): void {
    const box = MeshBuilder.CreateBox("medicineBox", { width: 0.11, height: 0.05, depth: 0.07 }, this.scene);
    // Góc trong của tủ đầu giường — chừa chỗ cho tờ giấy chú Tư (Đêm 2).
    box.position = new Vector3(3.9, 0.575, 5.75);
    box.rotation.y = 0.4;
    box.material = this.mat("medicine", new Color3(0.85, 0.55, 0.2), 0.12);
    makeInteractable(box, {
      prompt: () => "Hộp thuốc cũ",
      interact: () => {
        this.game.openNote(notes.medicineBox);
        this.game.director.set("read_medicine");
      },
    });
  }

  /** Xấp lịch tháng Bảy dán sau cửa phòng bà (mặt tường hành lang nhìn vào phòng). */
  private buildJulyPages(): void {
    const paper = this.mat("julyPages", new Color3(0.86, 0.8, 0.68), 0.1);
    const red = this.mat("julyRed", new Color3(0.6, 0.1, 0.07), 0.1);
    const pick = MeshBuilder.CreatePlane("julyPages", { width: 0.3, height: 0.4 }, this.scene);
    pick.position = new Vector3(1.115, 1.55, 2.3);
    pick.rotation.y = -Math.PI / 2;
    pick.material = paper;
    for (let i = 0; i < 5; i++) {
      const sheet = this.part(MeshBuilder.CreatePlane("julySheet", { width: 0.3, height: 0.4 }, this.scene), new Vector3(1.112 - i * 0.0015, 1.55 + i * 0.006, 2.3 + (i % 2 ? 0.01 : -0.01)), paper);
      sheet.rotation.set(0, -Math.PI / 2, (i - 2) * 0.03);
    }
    // Vòng mực đỏ khoanh ngày Rằm.
    const ring = this.part(MeshBuilder.CreateTorus("julyRing", { diameter: 0.07, thickness: 0.006, tessellation: 12 }, this.scene), new Vector3(1.105, 1.5, 2.33), red);
    ring.rotation.z = Math.PI / 2;
    makeInteractable(pick, {
      prompt: () => "Xấp lịch cũ",
      interact: () => {
        this.game.openNote(notes.julyPages);
        this.game.director.set("read_july");
      },
    });
  }
}
