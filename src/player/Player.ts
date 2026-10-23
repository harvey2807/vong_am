import { Scene, SpotLight, UniversalCamera, Vector3, Color3 } from "@babylonjs/core";
import type { AudioSystem } from "../audio/AudioSystem";
import { diff } from "../core/difficulty";

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

/**
 * Điều khiển góc nhìn thứ nhất. Di chuyển tự viết (thay cho input bàn phím của Babylon)
 * để kiểm soát chính xác tốc độ; chuột và va chạm vẫn dùng của Babylon.
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
  /** Đang lội ruộng nước: đi chậm, chạy không nổi, bước chân thành tiếng nước. */
  inWater = false;
  /** Đang trốn (trong tủ): không di chuyển, thực thể không nhìn thấy. */
  hidden = false;
  /** Tiếng động người chơi gây ra: 0 đứng yên, 1 đi bộ, 2 chạy. Thực thể nghe theo mức này. */
  noise: 0 | 1 | 2 = 0;

  constructor(scene: Scene, private readonly audio: AudioSystem) {
    const cam = new UniversalCamera("player", new Vector3(0, EYE_HEIGHT, -4.8), scene);
    cam.setTarget(new Vector3(0, EYE_HEIGHT, 0));
    cam.minZ = 0.05;
    cam.maxZ = 60;
    cam.fov = 1.15;
    cam.inertia = 0;
    cam.angularSensibility = BASE_SENSIBILITY;
    cam.inputs.removeByType("FreeCameraKeyboardMoveInput");
    cam.checkCollisions = true;
    cam.applyGravity = true;
    // Ellipsoid cao 1.6m tính từ mắt xuống chân.
    cam.ellipsoid = new Vector3(0.3, EYE_HEIGHT / 2, 0.3);
    this.camera = cam;
    this.lastPos = cam.position.clone();

    const light = new SpotLight("flashlight", new Vector3(0.12, -0.12, 0.1), new Vector3(0, 0.02, 1), Math.PI / 3.4, 6, scene);
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

  setSensitivity(k: number): void {
    this.camera.angularSensibility = BASE_SENSIBILITY / k;
  }

  get flashlightOn(): boolean {
    return this.flashlight.intensity > 0;
  }

  /** Đặt camera vào chỗ trốn. Tắt va chạm vì camera nằm bên trong khối đồ vật. */
  hide(at: Vector3, yaw: number): void {
    this.hidden = true;
    this.placeAt(at, yaw);
    this.camera.checkCollisions = false;
    this.camera.applyGravity = false;
  }

  unhide(at: Vector3, yaw: number): void {
    this.hidden = false;
    this.placeAt(at, yaw);
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
  }

  private placeAt(at: Vector3, yaw: number): void {
    this.camera.position.copyFrom(at);
    this.camera.rotation.set(0, yaw, 0);
    this.camera.cameraDirection.setAll(0);
    this.lastPos.copyFrom(at);
    this.noise = 0;
  }

  toggleFlashlight(): void {
    this.flashlight.intensity = this.flashlightOn ? 0 : FLASHLIGHT_INTENSITY;
    this.audio.play("click");
  }

  /** Điểm nằm ngay sau lưng người chơi, ngang tầm tai. */
  behind(distance: number): Vector3 {
    const ry = this.camera.rotation.y;
    return this.camera.position.subtract(new Vector3(Math.sin(ry), 0, Math.cos(ry)).scale(distance));
  }

  update(dt: number): void {
    if (!this.active || this.hidden) {
      this.noise = 0;
      return;
    }
    const k = this.keys;
    const forward = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const strafe = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    const wantSprint = k.has("ShiftLeft") || k.has("ShiftRight");
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

    // Tiếng bước chân theo quãng đường thực đi được (đâm vào tường thì không kêu).
    const pos = this.camera.position;
    const moved = Math.hypot(pos.x - this.lastPos.x, pos.z - this.lastPos.z);
    this.stepDistance += moved;
    this.lastPos.copyFrom(pos);
    const speed = dt > 0 ? moved / dt : 0;
    this.noise = speed > (WALK_SPEED + SPRINT_SPEED) / 2 ? 2 : speed > 0.3 || this.winded ? 1 : 0;
    if (this.stepDistance > (sprinting ? 0.8 : 0.62)) {
      this.stepDistance = 0;
      if (this.inWater) this.audio.play("splash", new Vector3(pos.x, 0.1, pos.z));
      else this.audio.play("step");
    }
  }
}
