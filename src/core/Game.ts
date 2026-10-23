import {
  Color3,
  Color4,
  ColorCurves,
  DefaultRenderingPipeline,
  Engine,
  type AbstractMesh,
  HemisphericLight,
  Light,
  PointLight,
  Ray,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { AudioSystem } from "../audio/AudioSystem";
import { HorrorDirector } from "../director/HorrorDirector";
import type { DirectorContext, EntityCommand, LightState, SoundId, TvState } from "../director/types";
import { Knocker } from "../entity/Knocker";
import { Stalker } from "../entity/Stalker";
import { Effigies } from "../entity/Effigy";
import { allRelicsFound } from "./relics";
import { Scarecrows } from "../entity/Scarecrow";
import { ALTAR_EFFIGIES } from "../world/Funeral";
import { InteractionSystem } from "../interaction/Interaction";
import { Player } from "../player/Player";
import { Hud, type Note } from "../ui/Hud";
import { Fx } from "../world/Fx";
import { House, type HidingSpot } from "../world/House";
import {
  LEVELS,
  currentLevel,
  goToChapter,
  goToMenu,
  hasCompleted,
  markCompleted,
  resetProgress,
  saveNight,
  savedNight,
  takeChapterFlag,
  type Level,
} from "./levels";
import { PlaytestLog } from "./Playtest";
import { diff, setDifficulty } from "./difficulty";
import { Settings } from "./Settings";

/**
 * Độ phân giải render thấp + điểm ảnh to = phong cách PS1, che bớt sự đơn giản của mô hình.
 * Theo cài đặt "Chất lượng hình": thấp / vừa / cao (số càng lớn điểm ảnh càng to, càng nhẹ máy).
 */
const PIXEL_SCALE = [3.2, 2.5, 1.75];
const SUBTITLE_SCALE = [0.85, 1, 1.25];
const LOOK_DISTANCE = 4;
const LOOK_ANGLE = (10 * Math.PI) / 180;
/**
 * Số đèn tối đa mỗi vật liệu. WebGL2 tốn một uniform block cho mỗi đèn, cộng 3 block của scene/material/mesh;
 * nhiều GPU chỉ cho 12 block → quá con số này là shader không biên dịch được (màn hình đen / vật biến mất).
 */
const MAX_LIGHTS_PER_MATERIAL = 8;

type State = "menu" | "paused" | "playing" | "ended";

export class Game implements DirectorContext {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly hud = new Hud();
  readonly audio = new AudioSystem();
  readonly player: Player;
  readonly house: House;
  readonly director: HorrorDirector;
  readonly interaction: InteractionSystem;
  readonly knocker: Knocker;
  readonly stalker: Stalker;
  readonly dolls: Effigies;
  readonly crows: Scarecrows;
  readonly fx: Fx;
  readonly level: Level = currentLevel();
  readonly settings = new Settings();
  readonly playtest = new PlaytestLog(this.level.id);
  private state: State = "menu";
  private hidingSpot?: HidingSpot;
  /** Lựa chọn [E] đang mở (vd. trả lời tiếng gọi từ giếng). */
  private pendingChoice?: { text: string; flag: string; left: number };
  private outdoor?: boolean;
  /** Nín thở trong tủ: đang giữ Space, đã nín bao lâu, đã để lộ hơi thở bao lâu. */
  private breathKey = false;
  private breathHeld = 0;
  private breathSlip = 0;
  private breathHinted = false;
  private shadows!: ShadowGenerator;
  private readonly shadowCasters: AbstractMesh[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, false, { stencil: false, audioEngine: false });
    this.engine.setHardwareScalingLevel(PIXEL_SCALE[1]);

    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0.012, 0.012, 0.016, 1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.14;
    scene.fogColor = new Color3(0.012, 0.012, 0.016);
    scene.collisionsEnabled = true;
    scene.gravity = new Vector3(0, -0.15, 0);
    this.scene = scene;

    this.player = new Player(scene, this.audio);
    this.fx = new Fx(scene, this.player.camera);
    this.house = new House(scene, this);
    this.director = new HorrorDirector(this.level.events, this);
    this.director.onLog = (kind, name) => this.playtest.log(kind, name);
    this.interaction = new InteractionSystem(scene, this.player.camera, this.hud);
    this.knocker = new Knocker(scene, this);
    this.stalker = new Stalker(this);
    this.dolls = new Effigies(scene, this);
    if (this.level.effigies) this.dolls.spawn([...ALTAR_EFFIGIES, ...this.level.effigies]);
    this.dolls.darkOnly = !!this.level.effigiesDarkOnly;
    this.crows = new Scarecrows(scene, this);
    if (this.level.scarecrows) this.crows.spawn(this.level.scarecrows);
    this.applyLevel();
    this.setupShadows();
    this.assignLights();

    const pipeline = new DefaultRenderingPipeline("post", false, scene, [this.player.camera]);
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 14;
    pipeline.grain.animated = true;
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 8;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 2.6;
    pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
    pipeline.imageProcessing.contrast = 1.25;
    pipeline.imageProcessing.exposure = 1.3;
    // Bóng tối ngả xanh rêu, vùng sáng ngả vàng nến — tông màu quen của kinh dị Á Đông.
    const curves = new ColorCurves();
    curves.globalSaturation = -18;
    curves.shadowsHue = 165;
    curves.shadowsDensity = 45;
    curves.shadowsSaturation = 45;
    curves.highlightsHue = 32;
    curves.highlightsDensity = 35;
    curves.highlightsSaturation = 35;
    pipeline.imageProcessing.colorCurvesEnabled = true;
    pipeline.imageProcessing.colorCurves = curves;
    // Bóng đèn, đèn thờ, đầu nhang, màn hình TV tỏa quầng.
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.45;
    pipeline.bloomWeight = 0.45;
    pipeline.bloomKernel = 48;
    pipeline.bloomScale = 0.5;

    this.hud.mountSettings(this.settings);
    this.settings.onChange((v) => {
      this.player.setSensitivity(v.sensitivity);
      pipeline.imageProcessing.exposure = 1.3 * v.brightness;
      setDifficulty(v.difficulty);
      this.audio.setVolume(v.volume);
      this.audio.setMusicVolume(v.music);
      this.audio.setSfxVolume(v.sfx);
      this.hud.setSubtitleScale(SUBTITLE_SCALE[v.subtitles] ?? 1);
      document.body.classList.toggle("print-notes", v.paperFont === 1);
      this.engine.setHardwareScalingLevel(PIXEL_SCALE[v.quality] ?? PIXEL_SCALE[1]);
      // Chất lượng thấp: tắt bóng đổ (giữ đèn pin là đèn ưu tiên — chỉ làm rỗng danh sách vật đổ bóng).
      const shadowMap = this.shadows.getShadowMap()!;
      shadowMap.renderList = v.quality > 0 ? [...this.shadowCasters] : [];
      pipeline.grainEnabled = v.film > 0;
      pipeline.chromaticAberrationEnabled = v.film > 0;
    });

    this.bindInput();
    scene.onBeforeRenderObservable.add(() => this.update(Math.min(this.engine.getDeltaTime() / 1000, 0.1)));
    this.engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => this.engine.resize());
  }

  /**
   * Nín thở khi nó đứng nghe ngoài cửa tủ: không giữ Space quá 1,2 giây → nó nghe thấy;
   * giữ quá lâu (theo độ khó) → sặc ra một hơi → nó nghe thấy. Thả ra khi nó đi thì hồi lại.
   */
  private updateBreath(dt: number): void {
    if (!this.player.hidden || !this.knocker.listeningAtWardrobe) {
      this.breathHeld = Math.max(0, this.breathHeld - dt * 2);
      this.breathSlip = 0;
      return;
    }
    if (!this.breathHinted) {
      this.breathHinted = true;
      this.hud.subtitle("Nó đứng ngay ngoài cửa tủ. Nín thở…", 3.5);
    }
    if (this.breathKey) {
      this.breathHeld += dt;
      this.breathSlip = 0;
      if (this.breathHeld > diff().breathHold) {
        this.audio.play("breath");
        this.hud.subtitle("…Không nín được nữa.", 2.5);
        this.knocker.hearHiddenPlayer();
      }
    } else {
      this.breathSlip += dt;
      if (this.breathSlip > 1.2) {
        this.audio.play("breath");
        this.knocker.hearHiddenPlayer();
      }
    }
  }

  private applyLevel(): void {
    const lv = this.level;
    const s = lv.start;
    this.player.camera.position.set(s.x, 1.6, s.z);
    this.player.camera.rotation.set(0, (s.yaw * Math.PI) / 180, 0);
    for (const f of lv.flags) this.director.set(f);
    // Đã gom đủ di vật từ những lần chơi trước: Đêm cuối mở Kết thật.
    if (allRelicsFound()) this.director.set("all_relics");
    this.house.setPhoto(lv.photo);
    if (lv.rain) this.fx.startRain(new Vector3(6.2, 0, -9), new Vector3(13.2, 0, 3.1));
    document.title = `VONG ÂM — ${lv.title}`;
  }

  /**
   * Mỗi bóng đèn chỉ chiếu những vật trong tầm của nó, để một vật không phải gánh mọi đèn trong nhà.
   * Thực thể di chuyển khắp nơi nên được mọi đèn chiếu; khi vượt giới hạn, Babylon giữ đèn ưu tiên cao
   * (đèn pin đổ bóng luôn đứng đầu, rồi ánh sáng nền, rồi bóng đèn trần).
   */
  private assignLights(): void {
    const meshes = this.scene.meshes;
    for (const m of meshes) m.computeWorldMatrix(true);
    // Thứ di chuyển (thực thể, hình nhân dạng ảnh "…Sprite") phải được mọi đèn chiếu tới.
    const roams = (m: AbstractMesh) => m.name.startsWith("knocker") || m.name.endsWith("Sprite");
    const knocker = meshes.filter(roams);
    for (const light of this.scene.lights) {
      if (light instanceof PointLight) {
        light.includedOnlyMeshes = meshes.filter((m) => {
          if (roams(m)) return true;
          const s = m.getBoundingInfo().boundingSphere;
          return Vector3.Distance(s.centerWorld, light.position) < light.range + s.radiusWorld;
        });
        light.renderPriority = light.name.endsWith("Light") && !["altarLight", "tvLight", "porchLight"].includes(light.name) ? 3 : 1;
      } else if (light instanceof HemisphericLight) {
        light.renderPriority = 4;
      } else if (light.includedOnlyMeshes.length) {
        light.includedOnlyMeshes.push(...knocker);
      }
    }
    // Babylon chỉ lấy N đèn đầu trong danh sách của từng vật, theo thứ tự thêm vào — phải tự xếp theo ưu tiên.
    const rank = (l: Light) => (l.shadowEnabled && l.getShadowGenerator() ? 100 : 0) + l.renderPriority;
    for (const m of meshes) m.lightSources.sort((a, b) => rank(b) - rank(a));
    for (const m of this.scene.materials) if (m instanceof StandardMaterial) m.maxSimultaneousLights = MAX_LIGHTS_PER_MATERIAL;
  }

  /** Chỉ đèn pin đổ bóng: rẻ, và bóng thực thể chạy theo luồng đèn là thứ đáng sợ nhất. */
  private setupShadows(): void {
    const light = this.player.flashlight;
    light.shadowMinZ = 0.1;
    light.shadowMaxZ = 16;
    const sg = new ShadowGenerator(1024, light);
    this.shadows = sg;
    sg.usePercentageCloserFiltering = true;
    sg.filteringQuality = ShadowGenerator.QUALITY_LOW;
    sg.bias = 0.0006;
    sg.normalBias = 0.015;
    for (const m of this.scene.meshes) {
      m.receiveShadows = true;
      if (m.checkCollisions || m.name.startsWith("knocker")) {
        sg.addShadowCaster(m, false);
        this.shadowCasters.push(m);
      }
    }
  }

  // ---------------------------------------------------------------- vòng lặp

  private update(dt: number): void {
    this.house.update(dt);
    const cam = this.player.camera;
    this.audio.updateListener(cam.globalPosition, cam.getDirection(Vector3.Forward()));
    if (this.state !== "playing") return;

    if (this.pendingChoice) {
      this.pendingChoice.left -= dt;
      if (this.pendingChoice.left <= 0) this.pendingChoice = undefined;
    }
    if (this.hud.readerOpen) {
      this.interaction.clear();
    } else {
      this.player.update(dt);
      if (this.pendingChoice && this.knocker.state !== "caught") this.hud.setPrompt(this.pendingChoice.text, true);
      else if (this.player.hidden && this.knocker.listeningAtWardrobe) this.hud.setPrompt("Giữ để nín thở", false, "Space");
      else if (this.player.hidden) this.hud.setPrompt(this.knocker.state === "caught" ? null : "Ra khỏi tủ");
      else this.interaction.update();
    }
    this.playtest.update(dt, cam.position.x, cam.position.z);
    this.updateBreath(dt);
    this.stalker.update(dt);
    this.dolls.update(dt);
    this.crows.update(dt);
    const fields = this.house.fields;
    this.player.inWater = !!fields && fields.inWater(cam.position.x, cam.position.z);
    this.fx.update(this.player.flashlightOn, this.house.lightsOn);
    if (this.level.rain) {
      const outdoor = cam.position.x > 6.05;
      if (outdoor !== this.outdoor) {
        this.outdoor = outdoor;
        this.audio.setRain(outdoor);
      }
    }
    // Thực thể vẫn đi khi người chơi đang đọc giấy — đọc giữa lúc bị săn là một lựa chọn có giá.
    this.knocker.update(dt);
    this.director.update(dt);
    this.audio.setTension(Math.max(this.director.tension, this.knocker.threat, this.dolls.threat, this.crows.threat));
    // Viền tối-đỏ chỉ hiện khi thật sự bị đe dọa (bị đuổi, hình nhân áp sát) — không phải lúc nào cũng có.
    const danger = Math.max(
      this.knocker.state === "chase" ? 1 : this.knocker.state === "investigate" ? 0.45 : 0,
      this.dolls.threat,
      this.crows.threat,
      this.player.winded ? 0.55 : 0,
    );
    this.hud.setThreat(Math.max(0, (danger - 0.35) / 0.65) * 0.9);
  }

  // ---------------------------------------------------------------- input & trạng thái

  private bindInput(): void {
    // Âm thanh màn hình chính: trình duyệt chỉ cho phát sau thao tác đầu tiên của người dùng.
    let menuAudio = false;
    const enableMenuAudio = () => {
      if (menuAudio || this.state !== "menu") return;
      menuAudio = true;
      this.audio.init();
      this.audio.setRain(true);
      this.hud.setSoundHint(false);
    };
    window.addEventListener("pointerdown", enableMenuAudio, { once: true });
    window.addEventListener("keydown", enableMenuAudio, { once: true });
    // Âm thanh "sau cánh cửa": đặt phía trước, cách vài mét để nghe như vọng từ trong nhà.
    const ahead = (d: number) => this.player.camera.position.add(this.player.camera.getDirection(Vector3.Forward()).scale(d));
    this.hud.onMenuEvent((e) => {
      if (!menuAudio || this.state !== "menu") return;
      if (e === "knock") this.audio.play("knock", ahead(4));
      else if (e === "shadow") this.audio.play("heavyStep", ahead(5));
      else if (e === "face") this.audio.play("whisper", ahead(3.5));
      else window.setTimeout(() => this.audio.play("thunder"), 600 + Math.random() * 1400);
    });

    const begin = () => {
      if (this.state !== "menu") return;
      this.audio.init();
      // Mưa ở màn hình chính; vào đêm không mưa thì tắt dần (đêm có mưa tự bật lại theo trong/ngoài nhà).
      if (!this.level.rain) this.audio.stopRain();
      if (this.house.fields) this.audio.startCrickets();
      this.hud.hideStart();
      this.state = "paused";
      this.lock();
    };
    // Đêm này được mở từ màn kết thúc đêm trước (hoặc "Thử lại") → vào thẳng màn chuyển chương.
    if (takeChapterFlag(this.level.id)) {
      this.hud.showChapter(this.level, begin);
    } else {
      this.hud.showMenu({
        saved: LEVELS[savedNight()],
        completed: hasCompleted(),
        nights: Object.values(LEVELS).sort((a, b) => a.id - b.id),
        onPlay: (n) => (n === this.level.id ? this.hud.showChapter(this.level, begin) : goToChapter(n)),
        onNewGame: () => {
          resetProgress();
          if (this.level.id === 0) this.hud.showChapter(this.level, begin);
          else goToChapter(0);
        },
      });
    }
    this.hud.onResume(() => this.lock());
    this.hud.onPauseMenu(() => goToMenu());

    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.canvas;
      this.engine.isPointerLock = locked;
      if (locked && this.state === "paused") {
        this.state = "playing";
        this.hud.showPause(false);
        if (!this.hud.readerOpen) this.player.enable();
      } else if (!locked && this.state === "playing") {
        this.state = "paused";
        this.closeReader();
        this.player.disable();
        this.hud.showPause(true);
        this.playtest.counts.pauses++;
      }
    });
    document.addEventListener("pointerlockerror", () => {
      if (this.state === "paused") this.hud.showPause(true);
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") this.breathKey = false;
    });
    window.addEventListener("blur", () => (this.breathKey = false));
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") this.breathKey = true;
      if (this.state !== "playing" || e.repeat) return;
      if (e.code === "KeyE") {
        if (this.pendingChoice && !this.hud.readerOpen) {
          this.director.set(this.pendingChoice.flag);
          this.pendingChoice = undefined;
        } else if (this.hud.readerOpen) this.closeReader();
        else if (this.player.hidden) this.leaveHiding();
        else this.interaction.tryInteract();
      } else if (e.code === "KeyF") {
        this.player.toggleFlashlight();
        this.playtest.counts.flashlight++;
      }
    });
  }

  private lock(): void {
    this.canvas.focus();
    this.engine.enterPointerlock();
  }

  openNote(note: Note): void {
    // Dòng mực lạ tự viết: tiếng giấy sột soạt + tiếng thì thầm ngay sát tai.
    this.hud.openNote(note, () => {
      this.audio.play("rustle");
      this.audio.play("whisper", this.player.behind(0.6));
      this.playtest.log("action", `late-ink:${note.title}`);
    });
    this.player.disable();
  }

  openPhoto(variant: number, caption: string): void {
    this.hud.openPhoto(variant, caption);
    this.player.disable();
  }

  hide(spot: HidingSpot): void {
    // Báo thực thể TRƯỚC khi dời camera, để nó còn kịp "thấy" người chơi chui vào.
    this.knocker.onPlayerHide(spot);
    this.hidingSpot = spot;
    this.player.hide(spot.inside, spot.insideYaw);
    this.hud.setHiding(true);
    this.audio.play("creak", spot.inside);
    this.director.set("hid");
    this.playtest.counts.hides++;
  }

  private leaveHiding(): void {
    const spot = this.hidingSpot;
    if (!spot || this.knocker.state === "caught") return;
    this.hidingSpot = undefined;
    this.player.unhide(spot.outside, spot.outsideYaw);
    this.hud.setHiding(false);
    this.audio.play("creak", spot.inside);
    this.knocker.onPlayerUnhide();
  }

  /** Thực thể bắt được người chơi: khóa điều khiển, còn đoạn kết do Director (cờ "caught") quyết định. */
  onCaught(): void {
    this.closeReader();
    this.player.disable();
    this.hud.setHiding(false);
    this.hud.setPrompt(null);
    this.director.set("caught");
  }

  private closeReader(): void {
    if (!this.hud.readerOpen) return;
    this.hud.closeReader();
    if (this.state === "playing") this.player.enable();
  }

  // ---------------------------------------------------------------- DirectorContext

  subtitle(text: string, duration: number, voice: boolean, glitch?: string): void {
    this.hud.subtitle(text, duration, voice, glitch);
  }

  playSound(sound: SoundId, at?: string): void {
    const pos = at === "behindPlayer" ? this.player.behind(1.3) : at ? this.house.anchors.get(at) : undefined;
    this.audio.play(sound, pos);
    // Tiếng gõ cửa "chạm" vào cả giao diện.
    if (sound === "knock") this.hud.uiFlicker();
  }

  setPhoto(variant: number): void {
    this.house.setPhoto(variant);
  }

  setLights(state: LightState): void {
    this.house.setLights(state);
    if (state === "flicker") this.hud.uiFlicker();
    this.house.fields?.setLights(state);
  }

  entity(cmd: EntityCommand, at?: string): void {
    this.knocker.command(cmd, at);
  }

  objective(text: string, glitch?: string): void {
    this.hud.setObjective(text, glitch);
  }

  door(name: string, open: boolean): void {
    this.house.setDoor(name, open);
  }

  scarecrowRage(seconds: number): void {
    this.crows.rage(seconds);
  }

  show(target: string, visible: boolean): void {
    this.house.targets.get(target)?.setEnabled(visible);
  }

  isNear(anchor: string, radius: number): boolean {
    const a = this.house.anchors.get(anchor);
    if (!a) return false;
    const p = this.player.camera.position;
    return Math.hypot(p.x - a.x, p.z - a.z) < radius;
  }

  choice(text: string, flag: string, seconds: number): void {
    this.pendingChoice = { text, flag, left: seconds };
  }

  footstepsBehind(): void {
    this.stalker.start();
  }

  tv(state: TvState): void {
    this.house.setTv(state);
  }

  effigies(cmd: "wake" | "sleep"): void {
    if (cmd === "wake") this.dolls.wake();
    else this.dolls.sleep();
  }

  end(title: string, text: string, next?: number, final?: boolean): void {
    if (next && next > savedNight()) saveNight(next);
    if (final) markCompleted();
    this.state = "ended";
    this.closeReader();
    this.player.disable();
    this.hud.setHiding(false);
    this.playtest.log("ending", title);
    this.hud.setupPlaytest(this.playtest.summary(), (answers) => this.playtest.download(answers));
    const lv = this.level;
    if (next) {
      const n = LEVELS[next];
      this.hud.showEnding("Trời sáng", title, text, [{ label: `Tiếp tục — ${n.title}`, primary: true, onClick: () => goToChapter(next) }]);
    } else if (final) {
      this.hud.showEnding(lv.title, title, `${text}\n\n\nVONG ÂM — Tiếng Gọi Sau Cánh Cửa\nCảm ơn bạn đã ở lại đến hết bốn đêm.`, [
        { label: "Về màn hình chính", primary: true, onClick: () => goToMenu() },
      ]);
    } else {
      this.hud.showEnding(lv.title, title, text, [
        { label: "Thử lại đêm này", primary: true, onClick: () => goToChapter(lv.id) },
        { label: "Về màn hình chính", onClick: () => goToMenu() },
      ]);
    }
    document.exitPointerLock();
  }

  /** Mục tiêu nằm trong khung hình VÀ không bị tường/vật che khuất. */
  isVisible(target: string): boolean {
    const mesh = this.house.targets.get(target);
    if (!mesh?.isEnabled()) return false;
    const cam = this.player.camera;
    if (!cam.isInFrustum(mesh)) return false;
    const origin = cam.globalPosition;
    const center = mesh.getBoundingInfo().boundingSphere.centerWorld;
    const toTarget = center.subtract(origin);
    const dist = toTarget.length();
    const hit = this.scene.pickWithRay(new Ray(origin, toTarget.normalize(), dist), (m) => m !== mesh && m.isPickable && m.isEnabled());
    return !(hit?.hit && hit.distance < dist - 0.05);
  }

  /** Người chơi đang nhìn thẳng vào mục tiêu ở cự ly gần. */
  isLookedAt(target: string): boolean {
    const mesh = this.house.targets.get(target);
    if (!mesh || !this.isVisible(target)) return false;
    const cam = this.player.camera;
    const toTarget = mesh.getBoundingInfo().boundingSphere.centerWorld.subtract(cam.globalPosition);
    if (toTarget.length() > LOOK_DISTANCE) return false;
    // Kẹp về [-1, 1]: nhìn đúng tâm thì sai số làm tròn có thể cho tích vô hướng > 1 → acos = NaN → "không nhìn".
    const dot = Math.min(1, Math.max(-1, Vector3.Dot(toTarget.normalize(), cam.getDirection(Vector3.Forward()))));
    const angle = Math.acos(dot);
    return angle < LOOK_ANGLE;
  }
}
