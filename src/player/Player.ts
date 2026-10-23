import { Scene, SpotLight, UniversalCamera, Vector3, Color3 } from "../babylon";
import type { AudioSystem, Surface } from "../audio/AudioSystem";
import { diff } from "../core/difficulty";
import { isKey, type Action } from "../core/Keybinds";
import { comfort } from "../core/Settings";

const EYE_HEIGHT = 1.6;
const WALK_SPEED = 1.8;
const SPRINT_SPEED = 3.3;
/** Chạy được bao nhiêu giây trước khi hết hơi (nhân hệ số độ khó). */
const STAMINA_SECONDS = 5;
/** Hồi thể lực mỗi giây (khi đứng yên); hết hơi thì phải hồi lại tới STAMINA_RESUME mới chạy tiếp được. */
const STAMINA_RECOVER = 0.18;
const STAMINA_RESUME = 0.4;
const FLASHLIGHT_INTENSITY = 1.6;
/** Babylon: số càng lớn chuột càng chậm. */
const BASE_SENSIBILITY = 2500;
const BASE_FOV = 1.15;
/** Bước chân dài (m): mỗi bước là một nhịp lắc đầu. */
const STRIDE = 0.7;
/** Hướng đèn pin trong hệ camera khi đứng yên. */
const LAMP_DIR = new Vector3(0, 0.02, 1);

/**
 * Điều khiển góc nhìn thứ nhất. Di chuyển tự viết (thay cho input bàn phím của Babylon)
 * để kiểm soát chính xác tốc độ; chuột và va chạm vẫn dùng của Babylon.
 *
 * Cảm giác cơ thể: đầu lắc nhẹ theo nhịp bước, đèn pin trễ theo tay khi quay người và đung đưa khi đi,
 * góc nhìn mở rộng một chút khi chạy, ống kính "giật" khi có cú hù. Tắt hết khi bật "Giảm chớp & rung".
 */
export class Player {
  readonly camera: UniversalCamera;
  readonly flashlight: SpotLight;
  private readonly keys = new Set<string>();
  private readonly lastPos: Vector3;
  private stepDistance = 0;
  private active = false;
  /** Thể lực 0..1. Không có thanh hiển thị: người chơi biết qua tiếng thở dốc. */
  stamina = 1;
  /** Hết hơi: không chạy được, thở dốc thành tiếng (thực thể nghe thấy ở gần). */
  winded = false;
  private breathTimer = 0;
  /** Đang lội nước (ruộng, mép ao): đi chậm, chạy không nổi, bước chân thành tiếng nước. */
  inWater = false;
  /** Đang trốn (trong tủ): không di chuyển, thực thể không nhìn thấy. */
  hidden = false;
  /** Tiếng động người chơi gây ra: 0 đứng yên, 1 đi bộ, 2 chạy. Thực thể nghe theo mức này. */
  noise: 0 | 1 | 2 = 0;
  /** Mặt đất tại (x, z, độ cao mắt) — Game nối vào House để tiếng bước đổi theo gạch, xi măng, bùn, ván gác. */
  surfaceAt?: (x: number, z: number, y: number) => Surface;
  /** Độ cao mặt bậc cầu thang dưới chân (null = không đứng trên cầu thang). */
  stairHeightAt?: (x: number, z: number, eyeY: number) => number | null;
  /** 0..1: thực thể ở gần — đèn pin chập chờn theo (Game đặt mỗi khung hình). */
  interference = 0;
  /** Độ cao mắt: người lớn 1,6 m; đứa nhỏ sáu tuổi trong chương hồi tưởng thấp hơn. */
  private eye = EYE_HEIGHT;

  private lampOn = false;
  private flickerTick = 0;
  private time = 0;
  private bobPhase = 0;
  private bobAmp = 0;
  private bobPitch = 0;
  private bobRoll = 0;
  private prevYaw = 0;
  private prevPitch = 0;
  private lagX = 0;
  private lagY = 0;
  private fovPunch = 0;

  constructor(scene: Scene, private readonly audio: AudioSystem) {
    const cam = new UniversalCamera("player", new Vector3(0, EYE_HEIGHT, -4.8), scene);
    cam.setTarget(new Vector3(0, EYE_HEIGHT, 0));
    cam.minZ = 0.05;
    cam.maxZ = 60;
    cam.fov = BASE_FOV;
    cam.inertia = 0;
    cam.angularSensibility = BASE_SENSIBILITY;
    cam.inputs.removeByType("FreeCameraKeyboardMoveInput");
    cam.checkCollisions = true;
    cam.applyGravity = true;
    // Ellipsoid cao 1.6m tính từ mắt xuống chân.
    cam.ellipsoid = new Vector3(0.3, EYE_HEIGHT / 2, 0.3);
    this.camera = cam;
    this.lastPos = cam.position.clone();

    const light = new SpotLight("flashlight", new Vector3(0.12, -0.12, 0.1), LAMP_DIR.clone(), Math.PI / 3.4, 6, scene);
    light.parent = cam;
    light.diffuse = new Color3(1, 0.93, 0.8);
    light.specular = Color3.Black();
    // Tắt đèn pin = cường độ 0, KHÔNG setEnabled(false): bật lại bằng setEnabled sẽ đẩy đèn xuống cuối
    // danh sách đèn của từng vật và có thể bị cắt khỏi giới hạn đèn/vật liệu.
    light.intensity = 0;
    light.range = 14;
    this.flashlight = light;

    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  enable(): void {
    this.active = true;
    this.camera.attachControl(true);
  }

  disable(): void {
    this.active = false;
    this.camera.detachControl();
    this.keys.clear();
  }

  setEyeHeight(h: number): void {
    this.eye = h;
    this.camera.ellipsoid = new Vector3(0.3, h / 2, 0.3);
  }

  setSensitivity(k: number): void {
    this.camera.angularSensibility = BASE_SENSIBILITY / k;
  }

  get flashlightOn(): boolean {
    return this.lampOn;
  }

  /** Tầng đang đứng: 0 = nhà dưới / ngoài trời, 1 = gác (chân cao hơn nửa tầng). */
  get floor(): 0 | 1 {
    return this.camera.position.y - this.eye > 1.6 ? 1 : 0;
  }

  /** Đặt camera vào chỗ trốn. Tắt va chạm vì camera nằm bên trong khối đồ vật. */
  hide(at: Vector3, yaw: number, pitch = 0): void {
    this.hidden = true;
    this.placeAt(at, yaw, pitch);
    this.camera.checkCollisions = false;
    this.camera.applyGravity = false;
  }

  unhide(at: Vector3, yaw: number): void {
    this.hidden = false;
    this.placeAt(at, yaw);
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
  }

  private placeAt(at: Vector3, yaw: number, pitch = 0): void {
    this.camera.position.copyFrom(at);
    this.camera.rotation.set(pitch, yaw, 0);
    this.camera.cameraDirection.setAll(0);
    this.lastPos.copyFrom(at);
    this.noise = 0;
    this.bobPitch = this.bobRoll = 0;
    this.prevYaw = yaw;
    this.prevPitch = pitch;
  }

  toggleFlashlight(): void {
    this.lampOn = !this.lampOn;
    this.flashlight.intensity = this.lampOn ? FLASHLIGHT_INTENSITY : 0;
    this.audio.play("click");
  }

  /** Cú hù: góc nhìn co giật một nhịp (dolly-zoom ngắn). */
  punch(amount = 0.12): void {
    if (!comfort.calm) this.fovPunch = Math.max(this.fovPunch, amount);
  }

  /** Điểm nằm ngay sau lưng người chơi, ngang tầm tai. */
  behind(distance: number): Vector3 {
    const ry = this.camera.rotation.y;
    return this.camera.position.subtract(new Vector3(Math.sin(ry), 0, Math.cos(ry)).scale(distance));
  }

  update(dt: number): void {
    this.time += dt;
    this.updateLamp(dt);
    if (!this.active || this.hidden) {
      this.noise = 0;
      this.settleBody(dt, false, false);
      return;
    }
    const held = (a: Action) => [...this.keys].some((code) => isKey(a, code));
    const forward = (held("forward") ? 1 : 0) - (held("back") ? 1 : 0);
    const strafe = (held("right") ? 1 : 0) - (held("left") ? 1 : 0);
    const wantSprint = held("sprint");
    const moving = forward !== 0 || strafe !== 0;
    const sprinting = wantSprint && moving && !this.winded;
    if (sprinting) {
      this.stamina = Math.max(0, this.stamina - dt / (STAMINA_SECONDS * diff().stamina));
      if (this.stamina === 0) {
        this.winded = true;
        this.breathTimer = 0;
      }
    } else {
      // Đứng yên hồi nhanh hơn vừa đi vừa thở.
      this.stamina = Math.min(1, this.stamina + (dt * STAMINA_RECOVER * (moving ? 0.6 : 1)) / diff().stamina);
      if (this.winded && this.stamina >= STAMINA_RESUME) this.winded = false;
    }
    if (this.winded) {
      this.breathTimer -= dt;
      if (this.breathTimer <= 0) {
        this.breathTimer = 2.4;
        this.audio.play("breath");
      }
    }

    if (forward || strafe) {
      const ry = this.camera.rotation.y;
      const dir = new Vector3(Math.sin(ry), 0, Math.cos(ry))
        .scale(forward)
        .add(new Vector3(Math.cos(ry), 0, -Math.sin(ry)).scale(strafe))
        .normalize();
      const wade = this.inWater ? 0.55 : 1;
      this.camera.cameraDirection.addInPlace(dir.scale((sprinting ? SPRINT_SPEED : WALK_SPEED) * wade * dt));
    }

    // Cầu thang: tắt trọng lực, nâng/hạ mắt theo mặt bậc (va chạm của Babylon không leo bậc được ổn định).
    const pos = this.camera.position;
    const stair = this.stairHeightAt?.(pos.x, pos.z, pos.y) ?? null;
    if (stair !== null) {
      this.camera.applyGravity = false;
      pos.y += (stair + this.eye - pos.y) * Math.min(1, dt * 14);
    } else {
      this.camera.applyGravity = true;
    }

    // Tiếng bước chân theo quãng đường thực đi được (đâm vào tường thì không kêu).
    const moved = Math.hypot(pos.x - this.lastPos.x, pos.z - this.lastPos.z);
    this.stepDistance += moved;
    this.bobPhase += (moved / STRIDE) * Math.PI;
    this.lastPos.copyFrom(pos);
    const speed = dt > 0 ? moved / dt : 0;
    this.noise = speed > (WALK_SPEED + SPRINT_SPEED) / 2 ? 2 : speed > 0.3 || this.winded ? 1 : 0;
    if (this.stepDistance > (sprinting ? 0.8 : 0.62)) {
      this.stepDistance = 0;
      if (this.inWater) this.audio.play("splash", new Vector3(pos.x, 0.1, pos.z));
      else this.audio.footstep(this.surfaceAt?.(pos.x, pos.z, pos.y) ?? "tile");
    }
    this.settleBody(dt, speed > 0.3, sprinting);
  }

  /**
   * Lắc đầu, đèn pin trễ theo tay, góc nhìn khi chạy. Cộng thêm phần lệch mới và trừ phần lệch cũ mỗi khung hình,
   * nên chuột (Babylon tự cộng dồn rotation) không bị trôi.
   */
  private settleBody(dt: number, walking: boolean, sprinting: boolean): void {
    const cam = this.camera;
    const calm = comfort.calm;
    const k = Math.min(1, dt * 6);
    this.bobAmp += ((calm || !walking ? 0 : sprinting ? 1 : 0.55) - this.bobAmp) * k;
    // Thở: đứng yên vẫn hơi nhấp nhô; hết hơi thì thấy rõ.
    const breath = calm ? 0 : Math.sin(this.time * (this.winded ? 3.2 : 1.1)) * (this.winded ? 0.006 : 0.0012);
    const pitch = Math.abs(Math.sin(this.bobPhase)) * 0.012 * this.bobAmp + breath;
    const roll = Math.sin(this.bobPhase) * 0.007 * this.bobAmp;
    cam.rotation.x += pitch - this.bobPitch;
    cam.rotation.z += roll - this.bobRoll;
    this.bobPitch = pitch;
    this.bobRoll = roll;

    // Đèn pin trễ theo vòng quay người rồi bắt kịp — như cầm trên tay thật.
    let dYaw = cam.rotation.y - this.prevYaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    const dPitch = cam.rotation.x - this.prevPitch;
    this.prevYaw = cam.rotation.y;
    this.prevPitch = cam.rotation.x;
    const lagK = calm ? 0 : 1;
    const clampLag = (v: number) => Math.max(-0.16, Math.min(0.16, v));
    this.lagX += (clampLag((-dYaw / Math.max(dt, 1e-3)) * 0.045 * lagK) - this.lagX) * Math.min(1, dt * 8);
    this.lagY += (clampLag((dPitch / Math.max(dt, 1e-3)) * 0.045 * lagK) - this.lagY) * Math.min(1, dt * 8);
    const sway = Math.sin(this.bobPhase) * 0.02 * this.bobAmp;
    this.flashlight.direction.set(LAMP_DIR.x + this.lagX + sway, LAMP_DIR.y + this.lagY - Math.abs(sway) * 0.5, LAMP_DIR.z);

    // Góc nhìn: rộng ra chút khi chạy; cú hù thì co lại một nhịp rồi trả về.
    this.fovPunch = Math.max(0, this.fovPunch - dt * 0.6);
    const target = BASE_FOV + (sprinting && !calm ? 0.06 : 0) - this.fovPunch;
    cam.fov += (target - cam.fov) * Math.min(1, dt * (this.fovPunch > 0 ? 20 : 4));
  }

  /** Đèn pin chập chờn khi thực thể ở gần — dấu hiệu, và cũng là cách lấy mất chỗ dựa của người chơi. */
  private updateLamp(dt: number): void {
    if (!this.lampOn) return;
    this.flickerTick -= dt;
    if (this.flickerTick > 0) return;
    this.flickerTick = 0.05 + Math.random() * 0.08;
    const k = this.interference;
    const drop = k > 0.45 && Math.random() < (k - 0.45) * (comfort.calm ? 0.4 : 0.9);
    this.flashlight.intensity = drop ? FLASHLIGHT_INTENSITY * (comfort.calm ? 0.5 : 0.08) : FLASHLIGHT_INTENSITY;
  }
}
