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
} from "../babylon";
import { AudioSystem } from "../audio/AudioSystem";
import { Ambience } from "../audio/Ambience";
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
import { Hud, type JournalMessage, type JournalView, type Note } from "../ui/Hud";
import messages from "../data/messages.json";
import items from "../data/items.json";
import { isKey, label, withKeys } from "./Keybinds";
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
/** Có một trong các cờ này (mà chưa hết đêm) = căn nhà hết yên: tiếng sống tắt, đồng hồ ngừng. */
const UNSAFE_FLAGS = ["knocking", "hunting", "lights_off", "awake", "stared", "answered_well", "answered_field"];
const WARNED_KEY = "vongam.warned";

/** Khóa số theo góc nhìn của thế giới (House): Game lo phần khóa/mở điều khiển. */
export interface LockRequest {
  title: string;
  sub: string;
  digits: number;
  onTry: (code: string) => string | null;
  onTurn?: () => void;
  onSolved: () => void;
}

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
  /** Trốn trong hòm: nó đã gõ nắp lần này chưa, còn mấy tiếng gõ, nhịp gõ. */
  private lidKnocked = false;
  private lidKnocks = 0;
  private lidKnockTimer = 0;
  /** Số lần đã nằm vào hòm (lần thứ ba thì nắp bị đóng đinh), số lần đã đẩy nắp. */
  private coffinHides = 0;
  private lidPushes = 0;
  private shadows!: ShadowGenerator;
  private readonly shadowCasters: AbstractMesh[] = [];
  readonly ambience: Ambience;
  /** Giấy đã đọc trong đêm này (đọc lại trong sổ tay), theo thứ tự đọc. */
  private readonly papers = new Map<string, Note>();
  /** Tin nhắn tới trong đêm (sau phần lịch sử có sẵn của nhóm). */
  private readonly liveMessages: JournalMessage[] = [];
  /** Gợi ý của việc cần làm hiện tại, và đã mở bao nhiêu bậc. */
  private hints: string[] = [];
  private hintsShown = 0;

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
    this.player.surfaceAt = (x, z, y) => this.house.surfaceAt(x, z, y);
    this.player.stairHeightAt = (x, z, y) => this.house.stairHeight(x, z, y);
    // Xe máy chạy ngang đầu ngõ (Mở đầu) hay ngoài đường trước cửa nhà (các đêm trong nhà).
    this.ambience = new Ambience(this.audio, {
      house: !this.house.fields,
      fields: !!this.house.fields,
      roadZ: this.house.fields ? undefined : this.level.id === 0 ? -44 : -14,
    });
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
    const coffin = this.hidingSpot?.kind === "coffin";
    // Trong hòm: nó gõ ba tiếng lên nắp, như hỏi có ai nhận chưa.
    if (coffin && !this.lidKnocked) {
      this.lidKnocked = true;
      this.lidKnocks = 3;
      this.lidKnockTimer = 0.6;
      this.hud.subtitle("Nó gõ lên nắp hòm. Đừng gõ lại.", 3.5);
    }
    if (!this.breathHinted) {
      this.breathHinted = true;
      this.hud.subtitle(coffin ? "Nó đứng ngay cạnh hòm. Nín thở…" : "Nó đứng ngay ngoài cửa tủ. Nín thở…", 3.5);
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
    const eye = lv.eye ?? 1.6;
    this.player.setEyeHeight(eye);
    this.player.camera.position.set(s.x, eye, s.z);
    this.player.camera.rotation.set(0, (s.yaw * Math.PI) / 180, 0);
    for (const f of lv.flags) this.director.set(f);
    // Đã gom đủ di vật từ những lần chơi trước: Đêm cuối mở Kết thật.
    if (allRelicsFound()) this.director.set("all_relics");
    this.house.setPhoto(lv.photo);
    if (lv.rain) {
      this.fx.startRain(new Vector3(6.2, 0, -9), new Vector3(13.2, 0, 3.1));
      // Khoảng đất sau vườn rộng: mưa bám theo người chơi khi ra tới đó.
      if (this.house.backland) this.fx.startRoamingRain();
    }
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
    // (Hình nhân "effigy…" đi khắp nhà ở Đêm 3–4 nên cũng phải được mọi đèn chiếu.)
    const roams = (m: AbstractMesh) => m.name.startsWith("knocker") || m.name.endsWith("Sprite") || m.name.startsWith("effigy");
    // Gác kho đồ mã: đèn nhà dưới không xuyên được trần; đèn trên gác ("gac…") chỉ chiếu đồ trên gác.
    const onAttic = (m: AbstractMesh) => m.name.startsWith("gac");
    const knocker = meshes.filter(roams);
    for (const light of this.scene.lights) {
      if (light instanceof PointLight) {
        const atticLight = light.name.startsWith("gac");
        light.includedOnlyMeshes = meshes.filter((m) => {
          if (roams(m)) return true;
          if (onAttic(m) !== atticLight) return false;
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
    if (this.hud.busy) {
      this.interaction.clear();
    } else {
      this.player.update(dt);
      if (this.pendingChoice && this.knocker.state !== "caught") this.hud.setPrompt(this.pendingChoice.text, true);
      else if (this.player.hidden && this.knocker.listeningAtWardrobe) this.hud.setPrompt("Giữ để nín thở", false, label("breath"));
      else if (this.player.hidden) this.hud.setPrompt(this.knocker.state === "caught" ? null : this.exitPrompt());
      else this.interaction.update();
    }
    this.playtest.update(dt, cam.position.x, cam.position.z);
    this.updateBreath(dt);
    if (this.lidKnocks > 0 && (this.lidKnockTimer -= dt) <= 0) {
      this.lidKnocks--;
      this.lidKnockTimer = 0.75;
      this.audio.play("knock", this.hidingSpot?.inside);
      this.hud.uiFlicker();
    }
    this.stalker.update(dt);
    this.dolls.update(dt);
    this.crows.update(dt);
    this.player.inWater = this.house.inWater(cam.position.x, cam.position.z);
    // Đèn pin chập chờn khi Người Gõ Cửa ở gần cùng tầng (hoặc đang đuổi).
    this.player.interference = this.knocker.state === "inactive" || this.knocker.floor !== this.player.floor ? 0 : this.knocker.threat;
    this.fx.update(this.player.flashlightOn, this.house.lightsOn);
    this.fx.updateRoamingRain(cam.position, cam.position.x > 13.3);
    // Cờ khám phá: kịch bản dùng để mở chuyện ở khu mới.
    if (this.player.floor === 1) this.director.set("been_attic");
    if (cam.position.x > 13.6) this.director.set("been_backland");
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
    // Căn nhà còn yên thì có tiếng sống; hết yên thì im bặt và đồng hồ quả lắc ngừng. Hết đêm (đã an toàn) thì sống lại.
    const unsafe = !this.director.has("ending") && UNSAFE_FLAGS.some((f) => this.director.has(f));
    const calm = !unsafe && this.knocker.state === "inactive" && this.director.tension < 0.35;
    this.house.clockStopped = unsafe;
    this.ambience.update(dt, calm, cam.globalPosition);
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
    // Lần đầu chơi: cảnh báo nội dung trước màn chuyển chương (chỉ một lần cho mỗi trình duyệt).
    const chapter = () => {
      let warned = false;
      try {
        warned = localStorage.getItem(WARNED_KEY) === "1";
      } catch {
        // Không đọc được bộ nhớ: hiện cảnh báo mỗi lần — an toàn hơn là bỏ qua.
      }
      const show = () => this.hud.showChapter(this.level, begin);
      if (warned) return show();
      this.hud.hideStart();
      this.hud.showWarning(() => {
        try {
          localStorage.setItem(WARNED_KEY, "1");
        } catch {
          // bỏ qua
        }
        show();
      });
    };
    // Đêm này được mở từ màn kết thúc đêm trước (hoặc "Thử lại") → vào thẳng màn chuyển chương.
    if (takeChapterFlag(this.level.id)) {
      chapter();
    } else {
      this.hud.showMenu({
        saved: LEVELS[savedNight()],
        completed: hasCompleted(),
        nights: Object.values(LEVELS).sort((a, b) => a.id - b.id),
        onPlay: (n) => (n === this.level.id ? chapter() : goToChapter(n)),
        onNewGame: () => {
          resetProgress();
          if (this.level.id === 0) chapter();
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
      if (isKey("breath", e.code)) this.breathKey = false;
    });
    window.addEventListener("blur", () => (this.breathKey = false));
    window.addEventListener("keydown", (e) => {
      if (isKey("breath", e.code)) this.breathKey = true;
      // Tắt tiếng dùng được ở mọi màn hình (kể cả menu, tạm dừng).
      if (e.code === "KeyM" && !e.repeat && !(e.target instanceof HTMLTextAreaElement)) {
        this.audio.setMuted(!this.audio.isMuted);
        this.hud.toast("Âm thanh", this.audio.isMuted ? "Đã tắt tiếng — nhấn M để bật lại." : "Đã bật tiếng.", false, true);
      }
      // Hud đã xử lý phím này (khóa số, sổ tay) — không làm thêm gì nữa.
      if (this.state !== "playing" || e.repeat || e.defaultPrevented) return;
      if (isKey("journal", e.code)) {
        e.preventDefault();
        if (!this.hud.busy && this.knocker.state !== "caught") this.openJournal();
      } else if (isKey("interact", e.code)) {
        if (this.pendingChoice && !this.hud.busy) {
          this.director.set(this.pendingChoice.flag);
          this.pendingChoice = undefined;
        } else if (this.hud.readerOpen) this.closeReader();
        else if (this.hud.busy) return;
        else if (this.player.hidden) this.leaveHiding();
        else this.interaction.tryInteract();
      } else if (isKey("flashlight", e.code)) {
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
    // Ghi vào sổ tay để đọc lại (đọc lại không làm mực lạ hiện lần nữa — Hud tự nhớ theo lần mở).
    this.papers.set(note.title, note);
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

  /** Khóa số: khóa điều khiển trong lúc xoay vòng số; đóng lại (bỏ đi hay mở được) thì trả điều khiển. */
  openLock(req: LockRequest): void {
    this.player.disable();
    this.interaction.clear();
    this.hud.openLock({
      title: req.title,
      sub: req.sub,
      digits: req.digits,
      onTry: req.onTry,
      onTurn: req.onTurn,
      onClose: (solved) => {
        if (solved) req.onSolved();
        if (this.state === "playing" && !this.hud.busy) this.player.enable();
      },
    });
  }

  /** Sổ tay: việc cần làm + gợi ý + đồ mang theo, giấy đã đọc, tin nhắn. Thực thể vẫn đi trong lúc mở. */
  private openJournal(): void {
    this.player.disable();
    this.interaction.clear();
    this.playtest.log("action", "journal");
    this.hud.openJournal(
      () => this.journalView(),
      () => {
        this.hintsShown = Math.min(this.hints.length, this.hintsShown + 1);
        this.playtest.log("action", `hint:${this.hintsShown}`);
      },
      () => {
        if (this.state === "playing" && !this.hud.busy) this.player.enable();
      },
      this.liveMessages.some((m) => !m.self) && !this.seenMessages ? 2 : 0,
    );
    this.seenMessages = true;
  }

  /** Đã mở sổ tay từ lúc có tin mới chưa (có tin chưa xem thì mở thẳng trang tin nhắn). */
  private seenMessages = true;

  private journalView(): JournalView {
    const thread = messages.thread
      .filter((m) => m.night <= this.level.id)
      .map((m) => ({ from: m.from, text: m.text, self: m.from === "Út" }));
    return {
      objective: this.hud.objective,
      hints: this.hints.slice(0, this.hintsShown).map(withKeys),
      hintsLeft: this.hints.length - this.hintsShown,
      items: items.items.filter((it) => this.director.has(it.flag) && !this.director.has(it.until)).map((it) => ({ label: it.label, note: it.note })),
      papers: [...this.papers.values()].map((note) => ({ title: note.title, open: () => this.openNote(note) })),
      group: messages.group,
      messages: [...thread, ...this.liveMessages],
    };
  }

  hide(spot: HidingSpot): void {
    // Báo thực thể TRƯỚC khi dời camera, để nó còn kịp "thấy" người chơi chui vào.
    this.knocker.onPlayerHide(spot);
    this.hidingSpot = spot;
    this.player.hide(spot.inside, spot.insideYaw, spot.insidePitch);
    this.hud.setHiding(true, spot.kind);
    this.audio.play("creak", spot.inside);
    this.director.set("hid");
    this.playtest.counts.hides++;
    this.lidKnocked = false;
    if (spot.kind === "coffin") {
      // Lần thứ ba nằm vào hòm: có tiếng đóng đinh trên nắp. Từ đó muốn ra phải đẩy nắp.
      this.coffinHides++;
      this.lidPushes = 0;
      if (this.coffinHides === 3) {
        this.audio.play("knock", spot.inside);
        this.hud.subtitle("Cộc… cộc… Có tiếng đóng đinh trên nắp hòm.", 4);
      }
    }
  }

  /** Hòm đã bị đóng đinh (từ lần trốn thứ ba): phải đẩy nắp nhiều lần mới ra được. */
  private static readonly LID_PUSHES = 6;

  private exitPrompt(): string | null {
    const spot = this.hidingSpot;
    if (!spot) return null;
    if (spot.exit === null) return null;
    if (spot.kind === "coffin" && this.coffinHides >= 3) return `Đẩy nắp hòm (${this.lidPushes}/${Game.LID_PUSHES})`;
    return spot.exit ?? "Ra khỏi tủ";
  }

  private leaveHiding(): void {
    const spot = this.hidingSpot;
    if (!spot || this.knocker.state === "caught" || spot.exit === null) return;
    if (spot.kind === "coffin") {
      // Đang bị gõ nắp mà động đậy = gõ trả lời.
      if (this.knocker.listeningAtWardrobe) {
        this.audio.play("knock", spot.inside);
        this.hud.subtitle("…Mình vừa gõ lại.", 2.5);
        this.knocker.hearHiddenPlayer();
        return;
      }
      if (this.coffinHides >= 3 && this.lidPushes < Game.LID_PUSHES) {
        this.lidPushes++;
        this.audio.play("rattle", spot.inside);
        if (this.lidPushes < Game.LID_PUSHES) return;
      }
      this.house.coffins?.closeShopLid(false);
    }
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

  /** Đóng giấy đang đọc — và khóa số, sổ tay nếu đang mở (tạm dừng, bị bắt, hết đêm). */
  private closeReader(): void {
    if (!this.hud.busy) return;
    this.hud.closeOverlays();
    if (this.state === "playing") this.player.enable();
  }

  // ---------------------------------------------------------------- DirectorContext

  subtitle(text: string, duration: number, voice: boolean, glitch?: string): void {
    this.hud.subtitle(withKeys(text), duration, voice, glitch);
  }

  playSound(sound: SoundId, at?: string): void {
    const pos = at === "behindPlayer" ? this.player.behind(1.3) : at ? this.house.anchors.get(at) : undefined;
    this.audio.play(sound, pos);
    // Cú hù có chủ đích: góc nhìn giật một nhịp.
    if (sound === "sting") this.player.punch(0.14);
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

  objective(text: string, glitch?: string, hints?: string[]): void {
    this.hud.setObjective(withKeys(text), glitch && withKeys(glitch));
    // Việc mới thì gợi ý mới (kể cả không có gợi ý nào).
    this.hints = hints ?? [];
    this.hintsShown = 0;
  }

  message(from: string, text: string, eerie = false): void {
    this.liveMessages.push({ from, text, self: false, eerie });
    this.seenMessages = false;
    this.audio.play("buzz");
    this.hud.toast(from, text, eerie);
    this.playtest.log("action", `message:${from}`);
  }

  hush(seconds: number): void {
    this.ambience.hush(seconds);
  }

  beat(name: string): void {
    if (!this.house.beat(name) && import.meta.env.DEV) console.warn(`[director] beat không ai nhận: ${name}`);
  }

  playerFloor(): 0 | 1 {
    return this.player.floor;
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
