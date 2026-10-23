import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Texture, Vector3 } from "../babylon";
import type { Game } from "../core/Game";
import { makeInteractable } from "../interaction/Interaction";
import notes from "../data/notes.json";
import type { HidingSpot, House } from "./House";
import { PropKit } from "./PropKit";
import { clothUrl, jossPaperUrl, talismanUrl } from "./decorTextures";
import { painted, type Ctx } from "./textures";

/** Chữ Thọ 壽 dán đầu hòm: nền son, chữ kim nhũ. */
function thoUrl(): string {
  return painted("tho", 64, (ctx: Ctx, s) => {
    ctx.fillStyle = "#4a120c";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#a8873a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#d8b65a";
    ctx.font = `bold ${Math.round(s * 0.62)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("壽", s / 2, s / 2 + 2);
  });
}

/** Lụa đỏ lót hòm của bà: còn lõm một vệt tối hình người nằm. */
function liningUrl(indent: boolean): string {
  return painted(indent ? "liningIndent" : "lining", 64, (ctx: Ctx, s) => {
    ctx.fillStyle = "#6a0f0a";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(20,0,0,${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * s, 0, 1, s);
    }
    if (!indent) return;
    // Đầu ở mép phải (+x), chân ở mép trái.
    ctx.fillStyle = "rgba(15,0,0,0.55)";
    ctx.beginPath();
    ctx.ellipse(s * 0.84, s / 2, s * 0.08, s * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(s * 0.55, s / 2, s * 0.22, s * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(s * 0.2, s / 2, s * 0.18, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Mặt trong nắp thọ mộc: vết móng tay cào, và năm vạch đếm. */
function scratchUrl(): string {
  return painted("lidScratch", 128, (ctx: Ctx, s) => {
    ctx.fillStyle = "#3a2216";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(205,170,130,0.75)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = s * 0.15 + Math.random() * s * 0.45;
      const y = s * 0.2 + Math.random() * s * 0.5;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 3, y);
        ctx.lineTo(x + k * 3 + (Math.random() - 0.5) * 6, y + 14 + Math.random() * 16);
        ctx.stroke();
      }
    }
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s * 0.72 + i * 6, s * 0.32);
      ctx.lineTo(s * 0.72 + i * 6, s * 0.52);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(s * 0.7, s * 0.5);
    ctx.lineTo(s * 0.92, s * 0.34);
    ctx.stroke();
  });
}

/** Vé xe khách nằm trong thọ mộc của bà. */
function ticketUrl(): string {
  return painted("busTicket", 64, (ctx: Ctx, s) => {
    ctx.fillStyle = "#e9e4d6";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#2a5a8a";
    ctx.fillRect(0, 0, s, s * 0.18);
    ctx.fillStyle = "#333";
    for (let i = 0; i < 5; i++) ctx.fillRect(s * 0.1, s * (0.3 + i * 0.12), s * (0.5 + Math.random() * 0.35), 2);
  });
}

interface Box {
  center: Vector3;
  len: number;
  w: number;
  h: number;
  /** Trục dọc của hòm. */
  axis: "x" | "z";
}

interface Built {
  lid: Mesh;
  lining: Mesh;
  pick: Mesh;
}

/**
 * Quan tài trong nhà (LORE_DEEPDIVE §6):
 * - gian tiệm Phúc Ký: những cỗ hòm ông đóng sẵn chưa bán, vơi dần qua từng đêm; cỗ phía đông trốn vào được;
 * - thọ mộc của bà trong phòng bà: nắp kẹt từ sáng bà mất, đêm cuối mới mở được;
 * - cỗ hòm trẻ con dưới gầm bàn thờ: bảy đinh trấn, bùa bong — đêm cuối dỡ vàng mã mới thấy.
 * Đêm hồi tưởng (2003) không dựng ở đây — xem Past.
 */
export class Coffins {
  private readonly kit: PropKit;
  private readonly old: StandardMaterial;
  private tomb?: { lid: Mesh; rope: Mesh[]; mat: Mesh; items: Mesh[]; opened: boolean; lidFrom: Vector3; lidTo: Vector3; t: number };
  private child?: { root: Mesh[]; lid: Mesh; inside: Mesh[]; opened: boolean };
  private shopLid?: { lid: Mesh; closed: Vector3; ajar: Vector3; closedRot: number; ajarRot: number };

  constructor(
    private readonly scene: Scene,
    private readonly house: House,
    private readonly game: Game,
  ) {
    this.kit = new PropKit(scene, "coffin");
    this.old = house.surface("wood", 1, 1, new Color3(0.42, 0.2, 0.13));
    this.buildShop();
    this.buildTomb();
    this.buildAltar();
    this.kit.finish();
  }

  private get night(): number {
    return this.house.night;
  }

  private get director() {
    return this.game.director;
  }

  /**
   * Thân hòm rỗng (đáy + bốn vách) để mở nắp thì nhìn được vào trong; nắp và lớp lót tách riêng.
   * `lidKeep`: nắp cần cử động (mở, đóng khi trốn) thì không gộp.
   */
  private coffin(k: PropKit, b: Box, wood: StandardMaterial, opts: { lidKeep?: boolean; lining?: StandardMaterial; head?: 1 | -1 } = {}): Built {
    const t = 0.04;
    const [sx, sz] = b.axis === "z" ? [b.w, b.len] : [b.len, b.w];
    const { x, y, z } = b.center;
    k.box("Bottom", sx, t, sz, new Vector3(x, y + t / 2, z), wood, { solid: true });
    if (b.axis === "z") {
      for (const s of [-1, 1]) k.box("Side", t, b.h, b.len, new Vector3(x + s * (b.w / 2 - t / 2), y + b.h / 2, z), wood, { solid: true });
      for (const s of [-1, 1]) k.box("End", b.w, b.h, t, new Vector3(x, y + b.h / 2, z + s * (b.len / 2 - t / 2)), wood, { solid: true });
    } else {
      for (const s of [-1, 1]) k.box("Side", b.len, b.h, t, new Vector3(x, y + b.h / 2, z + s * (b.w / 2 - t / 2)), wood, { solid: true });
      for (const s of [-1, 1]) k.box("End", t, b.h, b.w, new Vector3(x + s * (b.len / 2 - t / 2), y + b.h / 2, z), wood, { solid: true });
    }
    const lining = k.plane("Lining", sx - 2 * t, sz - 2 * t, new Vector3(x, y + t + 0.003, z), opts.lining ?? k.tex("lining", liningUrl(false), { emissive: 0.05 }), {
      rot: [Math.PI / 2, 0, 0],
      keep: !!opts.lining,
    });
    const lid = MeshBuilder.CreateBox("coffinLid", { width: sx + 0.06, height: 0.07, depth: sz + 0.06 }, this.scene);
    lid.position.set(x, y + b.h + 0.035, z);
    lid.material = wood;
    lid.checkCollisions = true;
    lid.receiveShadows = true;
    const under = MeshBuilder.CreatePlane("coffinLidUnder", { width: sx, height: sz }, this.scene);
    under.parent = lid;
    under.position.y = -0.036;
    under.rotation.x = -Math.PI / 2;
    under.material = wood;
    under.isPickable = false;
    if (!opts.lidKeep) lid.isPickable = false;
    k.meshes.push(lid, under);
    // Chữ Thọ ở đầu hòm.
    const head = opts.head ?? -1;
    const tho = k.tex("tho", thoUrl(), { emissive: 0.08 });
    if (b.axis === "z") k.plane("Tho", b.w * 0.55, b.h * 0.6, new Vector3(x, y + b.h * 0.55, z + head * (b.len / 2 + 0.004)), tho, { rot: [0, head < 0 ? 0 : Math.PI, 0] });
    else k.plane("Tho", b.w * 0.55, b.h * 0.6, new Vector3(x + head * (b.len / 2 + 0.004), y + b.h * 0.55, z), tho, { rot: [0, head > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    // Khối chọn: tia tương tác trúng khối này trước mọi mảnh vách bên trong. Trong suốt hoàn toàn.
    const pick = MeshBuilder.CreateBox("coffinPick", { width: sx + 0.08, height: b.h + 0.12, depth: sz + 0.08 }, this.scene);
    pick.position.set(x, y + (b.h + 0.12) / 2, z);
    pick.visibility = 0;
    pick.isPickable = true;
    return { lid, lining, pick };
  }

  /** Mễ kê hòm: hai khúc gỗ ngang. */
  private trestles(b: Box, h: number, wood: StandardMaterial): void {
    const off = b.len / 2 - 0.35;
    for (const s of [-1, 1]) {
      if (b.axis === "z") this.kit.box("Trestle", b.w + 0.12, h, 0.1, new Vector3(b.center.x, h / 2, b.center.z + s * off), wood, { solid: true });
      else this.kit.box("Trestle", 0.1, h, b.w + 0.12, new Vector3(b.center.x + s * off, h / 2, b.center.z), wood, { solid: true });
    }
  }

  // ---------------------------------------------------------------- gian tiệm Phúc Ký

  /**
   * Ba cỗ hòm trên mễ sát cửa ván, hai cỗ chồng lên trên (Đêm 1: năm cỗ). Mỗi đêm mất một cỗ chồng, để lại vệt kéo
   * trên nền xi măng; Đêm cuối cả ba cỗ dưới xô lệch nắp, trống trơn.
   */
  private buildShop(): void {
    const n = this.night;
    const past = this.house.past;
    const wood = past ? this.house.surface("wood", 1, 1, new Color3(0.72, 0.46, 0.28)) : this.old;
    const trestle = this.kit.color("trestle", new Color3(0.2, 0.13, 0.08));
    const drape = this.kit.tex("drape", clothUrl(), { emissive: 0.04, tint: new Color3(0.55, 0.12, 0.08) });
    const base = 0.35;
    const xs = [-4.95, -4.05, -3.15];
    const tops = past || n <= 1 ? 2 : n === 2 ? 1 : 0;
    const open = !past && n >= 4;
    this.house.anchors.set("shopCoffins", new Vector3(-4.05, 0.8, -4.75));

    xs.forEach((x, i) => {
      const b: Box = { center: new Vector3(x, base, -4.75), len: 1.9, w: 0.6, h: 0.55, axis: "z" };
      this.trestles(b, base, trestle);
      const hide = i === 2;
      const c = this.coffin(this.kit, b, wood, { lidKeep: hide });
      const closed = c.lid.position.clone();
      // Nắp xô lệch, hé một khe tối.
      const ajar = closed.add(new Vector3(0.24, 0.01, 0.15));
      if (open) {
        c.lid.position.copyFrom(ajar);
        c.lid.rotation.y = 0.22;
      } else if (!past) {
        this.kit.plane("Drape", 0.66, 1.3, new Vector3(x, closed.y + 0.04, -4.75), drape, { rot: [Math.PI / 2, 0, 0] });
      }
      if (hide) this.shopLid = { lid: c.lid, closed, ajar, closedRot: 0, ajarRot: open ? 0.22 : 0 };
      this.shopInteract(c.pick, hide, b);
      if (i < tops) {
        const top: Box = { center: new Vector3(x, base + 0.55 + 0.07, -4.75), len: 1.9, w: 0.6, h: 0.55, axis: "z" };
        const t = this.coffin(this.kit, top, wood);
        t.pick.dispose();
        if (!past) this.kit.plane("Drape", 0.66, 1.3, new Vector3(x, top.center.y + 0.55 + 0.11, -4.75), drape, { rot: [Math.PI / 2, 0, 0] });
      }
    });

    // Vệt kéo trên nền: từ chỗ để hòm, men theo mép tiệm, ra cửa hành lang.
    if (!past && n >= 2) {
      const drag = this.kit.color("drag", new Color3(0.05, 0.04, 0.035), 0);
      const seg = (from: Vector3, to: Vector3, w: number) => {
        const d = to.subtract(from);
        this.kit.plane("Drag", w, d.length(), from.add(to).scale(0.5).add(new Vector3(0, 0.009, 0)), drag, {
          rot: [Math.PI / 2, Math.atan2(d.x, d.z), 0],
        });
      };
      for (const off of [-0.18, 0.18]) {
        seg(new Vector3(-4.6, 0, -3.75 + off * 0.3), new Vector3(-2.0, 0, -3.75 + off * 0.3), 0.06);
        seg(new Vector3(-2.0, 0, -3.75 + off * 0.3), new Vector3(-1.15, 0, -2.85 + off * 0.3), 0.06);
      }
    }
  }

  private shopInteract(pick: Mesh, hide: boolean, b: Box): void {
    const n = this.night;
    const spot: HidingSpot = {
      inside: new Vector3(b.center.x, b.center.y + 0.27, b.center.z),
      insideYaw: 0,
      insidePitch: -1.45,
      outside: new Vector3(-2.45, 1.6, -5.2),
      outsideYaw: -Math.PI / 2,
      front: new Vector3(-2.45, 0, -5.2),
      kind: "coffin",
      exit: "Ra khỏi hòm",
    };
    makeInteractable(pick, {
      prompt: () => {
        if (this.director.has("ending")) return null;
        if (hide && this.house.dangerous) return "Nằm vào hòm, kéo nắp lại";
        return this.house.past ? "Hòm ông mới đóng" : "Hòm của tiệm Phúc Ký";
      },
      interact: () => {
        if (hide && this.house.dangerous) {
          this.closeShopLid(true);
          this.game.hide(spot);
          return;
        }
        const line = this.house.past
          ? "Hòm ông mới đóng, gỗ còn thơm mùi dầu.\nÔng dặn con nít không được chui vô."
          : n <= 1
            ? "Năm cỗ hòm ông đóng sẵn, chưa kịp bán. Hai mươi năm bà không cho ai khiêng đi.\nBà nói hòm đóng rồi là có chủ."
            : n === 2
              ? "Hôm qua còn năm cỗ. Giờ còn bốn.\nVệt kéo trên nền xi măng dẫn ra cửa. Đêm qua mình không nghe tiếng khiêng hòm."
              : n === 3
                ? "Còn ba cỗ. Hai cỗ chồng bên trên đã đi đâu mất."
                : "Nắp hòm xô lệch. Bên trong trống trơn, lớp lụa đỏ còn lõm hình một người nằm.";
        this.game.hud.subtitle(line, 5);
      },
    });
  }

  /** Trốn: kéo nắp đóng lại. Ra khỏi hòm: đẩy nắp hé như cũ. */
  closeShopLid(closed: boolean): void {
    const s = this.shopLid;
    if (!s) return;
    s.lid.position.copyFrom(closed ? s.closed : s.ajar);
    s.lid.rotation.y = closed ? s.closedRot : s.ajarRot;
    this.game.audio.play("creak", s.closed);
  }

  // ---------------------------------------------------------------- thọ mộc của bà

  private buildTomb(): void {
    if (this.house.past) return;
    const n = this.night;
    // Mễ thấp: đứng cạnh là nhìn được xuống lòng hòm.
    const b: Box = { center: new Vector3(2.95, 0.2, 0.5), len: 1.95, w: 0.62, h: 0.55, axis: "x" };
    const trestle = this.kit.color("trestle", new Color3(0.2, 0.13, 0.08));
    this.trestles(b, 0.2, trestle);
    const lining = new StandardMaterial("coffinTombLining", this.scene);
    lining.diffuseTexture = new Texture(liningUrl(true), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    lining.specularColor = Color3.Black();
    // Đêm cuối mất điện: lớp lụa đỏ phải tự hắt chút sáng thì mới thấy vệt lõm.
    lining.emissiveColor = new Color3(0.22, 0.07, 0.06);
    const c = this.coffin(this.kit, b, this.old, { lidKeep: true, lining, head: 1 });
    // Mặt trong nắp: vết cào (chỉ thấy khi nắp dựng lên).
    const scratch = new StandardMaterial("coffinScratch", this.scene);
    scratch.diffuseTexture = new Texture(scratchUrl(), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    scratch.specularColor = Color3.Black();
    scratch.emissiveColor = new Color3(0.05, 0.04, 0.03);
    const under = c.lid.getChildMeshes()[0] as Mesh;
    under.material = scratch;

    // Chiếu phủ và hai vòng dây buộc nắp.
    const top = c.lid.position.y + 0.036;
    const mat = MeshBuilder.CreatePlane("coffinMat", { width: 1.7, height: 0.7 }, this.scene);
    mat.position.set(2.95, top + 0.004, 0.5);
    mat.rotation.x = Math.PI / 2;
    mat.material = this.kit.tex("strawMat", clothUrl(), { emissive: 0.05, tint: new Color3(0.72, 0.6, 0.36) });
    mat.isPickable = false;
    const ropeMat = this.kit.color("rope", new Color3(0.32, 0.26, 0.16));
    const rope = [-0.55, 0.55].map((dx) => {
      const r = MeshBuilder.CreateBox("coffinRope", { width: 0.03, height: 0.63, depth: 0.7 }, this.scene);
      r.position.set(2.95 + dx, 0.2 + 0.315, 0.5);
      r.material = ropeMat;
      r.isPickable = false;
      return r;
    });

    // Bên trong: vé xe khách, cục sạc điện thoại của mình.
    const ticket = MeshBuilder.CreatePlane("coffinTicket", { width: 0.12, height: 0.07 }, this.scene);
    ticket.position.set(2.55, 0.2 + 0.05, 0.47);
    ticket.rotation.set(Math.PI / 2, 0.4, 0);
    const tm = new StandardMaterial("coffinTicketMat", this.scene);
    tm.diffuseTexture = new Texture(ticketUrl(), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    tm.emissiveColor = new Color3(0.35, 0.34, 0.3);
    tm.specularColor = Color3.Black();
    ticket.material = tm;
    const white = this.kit.color("charger", new Color3(0.85, 0.85, 0.82), 0.08);
    const charger = MeshBuilder.CreateBox("coffinCharger", { width: 0.05, height: 0.03, depth: 0.05 }, this.scene);
    charger.position.set(3.35, 0.2 + 0.06, 0.55);
    charger.material = white;
    charger.isPickable = false;
    const cable = MeshBuilder.CreateTorus("coffinCable", { diameter: 0.16, thickness: 0.008, tessellation: 14 }, this.scene);
    cable.position.set(3.45, 0.2 + 0.05, 0.5);
    cable.material = white;
    cable.isPickable = false;
    for (const m of [ticket, charger, cable]) m.setEnabled(false);

    const lidFrom = c.lid.position.clone();
    // Nắp lật úp xuống sàn phía trước hòm: mặt trong (vết cào) ngửa lên, không che lòng hòm.
    this.tomb = { lid: c.lid, rope, mat, items: [ticket, charger, cable], opened: false, lidFrom, lidTo: new Vector3(2.95, 0.04, 1.32), t: -1 };
    this.house.anchors.set("tomb", new Vector3(2.95, 0.8, 0.5));

    makeInteractable(c.pick, {
      prompt: () => {
        if (this.tomb!.opened) return "Nhìn vào trong hòm";
        if (n >= 4 && this.director.has("has_scissors") && !this.director.has("ending")) return "Cắt dây, mở nắp hòm của bà";
        return "Hòm của bà";
      },
      interact: () => {
        const tomb = this.tomb!;
        if (tomb.opened) {
          this.game.openNote(notes.busTicket);
          this.director.set("read_ticket");
          return;
        }
        if (n >= 4 && this.director.has("has_scissors")) {
          tomb.opened = true;
          tomb.t = 0;
          // Nắp nằm dưới sàn: bước qua được.
          tomb.lid.checkCollisions = false;
          for (const r of rope) r.setEnabled(false);
          mat.setEnabled(false);
          for (const m of tomb.items) m.setEnabled(true);
          this.game.audio.play("rustle", lidFrom);
          this.game.audio.play("creak", lidFrom);
          this.director.set("opened_tho_moc");
          return;
        }
        this.game.hud.subtitle(
          n <= 1
            ? "Cỗ thọ mộc bà mua sẵn từ năm sáu mươi tuổi, phủ chiếu, dây buộc chặt nắp.\nBà hay nói: có sẵn cái nhà cho mình rồi thì đi đâu cũng yên."
            : n < 4
              ? "Chú Tư nói lúc khâm liệm, nắp hòm này không mở được.\nNhư có ai gài từ bên trong."
              : "Dây buộc chặt quá. Phải có kéo.",
          5,
        );
      },
    });
  }

  // ---------------------------------------------------------------- gầm bàn thờ

  /** Khăn đỏ phủ chấm đất trước bàn thờ; Đêm cuối dỡ ra thì thấy cỗ hòm trẻ con. */
  private buildAltar(): void {
    if (this.house.past) return;
    const red = new StandardMaterial("coffinValance", this.scene);
    red.diffuseColor = new Color3(0.42, 0.05, 0.04);
    red.emissiveColor = new Color3(0.05, 0.005, 0.005);
    red.specularColor = Color3.Black();
    const valance = MeshBuilder.CreatePlane("altarValance", { width: 1.8, height: 1.0 }, this.scene);
    valance.position.set(-6.185, 0.52, 3);
    valance.rotation.y = -Math.PI / 2;
    valance.material = red;
    this.house.targets.set("altarValance", valance);

    // Cỗ hòm nhỏ (ẩn tới khi dỡ vàng mã): dài một thước hai, sơn son đã tróc.
    const lacquer = this.house.surface("wood", 1, 1, new Color3(0.38, 0.08, 0.05));
    const b: Box = { center: new Vector3(-5.78, 0, 3.0), len: 1.15, w: 0.42, h: 0.36, axis: "z" };
    // Bộ dựng riêng: cả cỗ hòm ẩn/hiện cùng nhau.
    const kit = new PropKit(this.scene, "coffinChild");
    const c = this.coffin(kit, b, lacquer, { lidKeep: true, head: 1 });
    // Bảy cây đinh trấn chạy dọc nắp, lá bùa bong một nửa.
    const iron = kit.color("nail", new Color3(0.08, 0.07, 0.06));
    for (let i = 0; i < 7; i++) {
      const nail = MeshBuilder.CreateCylinder("coffinNail", { diameter: 0.03, height: 0.03, tessellation: 6 }, this.scene);
      nail.parent = c.lid;
      nail.position.set(0, 0.045, -0.48 + i * 0.16);
      nail.material = iron;
      nail.isPickable = false;
    }
    const tal = new StandardMaterial("coffinTalisman", this.scene);
    tal.diffuseTexture = new Texture(talismanUrl("childCoffin"), this.scene, false, true, Texture.NEAREST_SAMPLINGMODE);
    tal.emissiveColor = new Color3(0.1, 0.08, 0.03);
    tal.specularColor = Color3.Black();
    tal.backFaceCulling = false;
    const talisman = MeshBuilder.CreatePlane("coffinTalismanPaper", { width: 0.12, height: 0.36 }, this.scene);
    talisman.parent = c.lid;
    talisman.position.set(0.02, 0.05, 0.1);
    talisman.rotation.set(Math.PI / 2 - 0.35, 0.15, 0);
    talisman.material = tal;
    talisman.isPickable = false;
    // Bên trong: bọc áo bà ba hoa của bà, xấp thư buộc dây.
    const floral = kit.tex("floral", clothUrl(), { emissive: 0.05, tint: new Color3(0.45, 0.5, 0.7) });
    const bundle = MeshBuilder.CreateBox("coffinBundle", { width: 0.26, height: 0.14, depth: 0.7 }, this.scene);
    bundle.position.set(-5.78, 0.12, 3.08);
    bundle.material = floral;
    bundle.isPickable = false;
    const paperMat = kit.color("letters", new Color3(0.82, 0.78, 0.66), 0.08);
    const letters = MeshBuilder.CreateBox("coffinLetters", { width: 0.14, height: 0.08, depth: 0.2 }, this.scene);
    letters.position.set(-5.78, 0.08, 2.6);
    letters.material = paperMat;
    letters.isPickable = false;
    kit.finish();

    // Vàng mã dỡ ra vương quanh.
    const joss = kit.tex("joss", jossPaperUrl(), { emissive: 0.05 });
    const scattered: Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const p = MeshBuilder.CreatePlane("coffinJoss", { size: 0.14 }, this.scene);
      p.position.set(-5.9 + Math.random() * 0.9, 0.006 + i * 0.0003, 2.1 + Math.random() * 1.8);
      p.rotation.set(Math.PI / 2, Math.random() * Math.PI, 0);
      p.material = joss;
      p.isPickable = false;
      scattered.push(p);
    }
    const all = [...kit.meshes, c.pick, bundle, letters, ...scattered];
    for (const m of all) m.setEnabled(false);
    this.child = { root: all, lid: c.lid, inside: [bundle, letters], opened: false };

    makeInteractable(valance, {
      prompt: () => {
        if (this.director.has("found_child_coffin")) return null;
        return this.night >= 4 && this.director.has("read_last_page") && !this.director.has("ending") ? "Vén khăn, dỡ vàng mã dưới gầm bàn thờ" : "Khăn bàn thờ";
      },
      interact: () => {
        if (this.night >= 4 && this.director.has("read_last_page")) {
          valance.setEnabled(false);
          for (const m of all) m.setEnabled(true);
          this.game.audio.play("rustle", valance.position);
          this.game.audio.play("creak", valance.position);
          this.director.set("found_child_coffin");
          return;
        }
        this.game.hud.subtitle("Khăn đỏ phủ chấm đất. Dưới gầm bàn thờ, vàng mã chất cao.\nMặt bàn thờ hơi kênh lên, như có cái gì bên dưới đội lên.", 5);
      },
    });

    makeInteractable(c.pick, {
      prompt: () => {
        const d = this.director;
        if (d.has("ending")) return null;
        if (!this.child!.opened) return d.has("all_relics") ? "Nhổ đinh, mở cỗ hòm nhỏ" : "Cỗ hòm nhỏ";
        if (d.has("has_family_photo") && !d.has("fifth_burned")) return "Cắt đứa sáu tuổi ra khỏi ảnh, đặt vào hòm";
        return "Đọc lại thư của bà";
      },
      interact: () => {
        const d = this.director;
        const child = this.child!;
        if (!child.opened) {
          if (!d.has("all_relics")) {
            this.game.hud.subtitle("Bảy cây đinh trấn. Lá bùa bong một nửa, góc còn ghi: Rằm tháng Bảy, Giáp Thìn.\nMình không dám nhổ.", 5);
            return;
          }
          child.opened = true;
          child.lid.position.addInPlace(new Vector3(0.42, -0.3, 0.1));
          child.lid.rotation.set(0, 0.35, 0.12);
          this.game.audio.play("rattle", child.lid.position);
          this.game.audio.play("creak", child.lid.position);
          this.game.openNote(notes.childLetters);
          d.set("opened_child_coffin");
          return;
        }
        if (d.has("has_family_photo") && !d.has("fifth_burned")) {
          this.game.audio.play("rustle", child.lid.position);
          d.set("self_returned");
          return;
        }
        this.game.openNote(notes.childLetters);
      },
    });
  }

  /** Beat kịch bản của các cỗ hòm. */
  beat(name: string): boolean {
    switch (name) {
      case "selfBurn": {
        // Kết Trả hồn: lửa bén từ tay mình.
        const cam = this.game.player.camera;
        const p = cam.position.add(cam.getDirection(Vector3.Forward()).scale(0.45));
        this.game.fx.fire(new Vector3(p.x, Math.max(0.6, p.y - 0.6), p.z), 0.3);
        this.game.audio.play("whoosh", p);
        return true;
      }
    }
    return false;
  }

  update(dt: number): void {
    const tomb = this.tomb;
    if (tomb && tomb.t >= 0 && tomb.t < 1) {
      // Nắp trượt khỏi hòm, lật úp xuống sàn: mặt trong (vết cào) ngửa lên.
      tomb.t = Math.min(1, tomb.t + dt * 0.8);
      const e = tomb.t * tomb.t * (3 - 2 * tomb.t);
      Vector3.LerpToRef(tomb.lidFrom, tomb.lidTo, e, tomb.lid.position);
      // Nhấc lên giữa chừng để không xuyên qua vách hòm khi lật.
      tomb.lid.position.y += Math.sin(e * Math.PI) * 0.5;
      tomb.lid.rotation.x = -Math.PI * e;
    }
  }
}
