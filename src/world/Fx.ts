import { Color4, Mesh, MeshBuilder, ParticleSystem, Scene, Texture, UniversalCamera, Vector3 } from "../babylon";
import { softDotUrl } from "./decorTextures";

/**
 * Hạt: bụi lơ lửng (chỉ thấy rõ trong luồng đèn pin), mưa ngoài vườn, khói nhang.
 * Hạt không nhận ánh sáng nên phải tự bật/tắt theo đèn — bụi phát sáng trong bóng tối là sai.
 */
export class Fx {
  private readonly dot: Texture;
  private readonly dust: ParticleSystem;
  private rain?: ParticleSystem;
  private smoke: ParticleSystem[] = [];

  constructor(
    private readonly scene: Scene,
    camera: UniversalCamera,
  ) {
    this.dot = new Texture(softDotUrl(), scene);

    // Bụi: phát ra trong hộp phía trước camera.
    const emitter = MeshBuilder.CreateBox("dustEmitter", { size: 0.01 }, scene);
    emitter.parent = camera;
    emitter.position = new Vector3(0, 0, 2);
    emitter.isVisible = false;
    emitter.isPickable = false;
    const dust = new ParticleSystem("dust", 400, scene);
    dust.particleTexture = this.dot;
    dust.emitter = emitter as Mesh;
    dust.minEmitBox = new Vector3(-1.6, -1, -1.4);
    dust.maxEmitBox = new Vector3(1.6, 1, 1.4);
    dust.color1 = new Color4(1, 0.92, 0.8, 0.35);
    dust.color2 = new Color4(0.9, 0.85, 0.75, 0.2);
    dust.colorDead = new Color4(1, 1, 1, 0);
    dust.minSize = 0.006;
    dust.maxSize = 0.016;
    dust.minLifeTime = 3;
    dust.maxLifeTime = 7;
    dust.emitRate = 0;
    dust.direction1 = new Vector3(-0.04, -0.02, -0.04);
    dust.direction2 = new Vector3(0.04, 0.03, 0.04);
    dust.minEmitPower = 0.5;
    dust.maxEmitPower = 1;
    dust.blendMode = ParticleSystem.BLENDMODE_ADD;
    dust.start();
    this.dust = dust;
  }

  startRain(min: Vector3, max: Vector3): void {
    const rain = new ParticleSystem("rain", 2500, this.scene);
    rain.particleTexture = this.dot;
    rain.emitter = new Vector3(0, 0, 0);
    rain.minEmitBox = new Vector3(min.x, 5, min.z);
    rain.maxEmitBox = new Vector3(max.x, 6, max.z);
    rain.color1 = new Color4(0.6, 0.68, 0.8, 0.35);
    rain.color2 = new Color4(0.5, 0.58, 0.7, 0.2);
    rain.colorDead = new Color4(0.5, 0.58, 0.7, 0);
    rain.minSize = 0.015;
    rain.maxSize = 0.025;
    rain.minScaleY = 12;
    rain.maxScaleY = 18;
    rain.minLifeTime = 0.55;
    rain.maxLifeTime = 0.65;
    rain.emitRate = 2600;
    rain.direction1 = new Vector3(-0.6, -10, 0.2);
    rain.direction2 = new Vector3(-0.4, -10, 0.4);
    rain.minEmitPower = 0.95;
    rain.maxEmitPower = 1.05;
    rain.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
    rain.blendMode = ParticleSystem.BLENDMODE_ADD;
    rain.start();
    this.rain = rain;
  }

  /** Khói nhang: sợi mảnh bốc thẳng, xoắn nhẹ, loang ra rồi tan. */
  addSmoke(at: Vector3): void {
    const s = new ParticleSystem("smoke", 120, this.scene);
    s.particleTexture = this.dot;
    s.emitter = at.clone();
    s.minEmitBox = s.maxEmitBox = Vector3.Zero();
    s.color1 = new Color4(0.75, 0.72, 0.68, 0.16);
    s.color2 = new Color4(0.6, 0.6, 0.6, 0.1);
    s.colorDead = new Color4(0.5, 0.5, 0.5, 0);
    s.addSizeGradient(0, 0.015);
    s.addSizeGradient(1, 0.22);
    s.minLifeTime = 3;
    s.maxLifeTime = 4.5;
    s.emitRate = 14;
    s.direction1 = new Vector3(-0.02, 0.22, -0.02);
    s.direction2 = new Vector3(0.02, 0.3, 0.02);
    s.minEmitPower = 0.6;
    s.maxEmitPower = 0.8;
    s.gravity = new Vector3(0.012, 0, 0.006);
    s.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    s.start();
    this.smoke.push(s);
  }

  /** Lửa đốt hình nhân: ngọn lửa cộng màu, tàn lửa bay, khói đen bốc cao. */
  fire(at: Vector3, scale = 1): void {
    const flames = new ParticleSystem("fire", 600, this.scene);
    flames.particleTexture = this.dot;
    flames.emitter = at.clone();
    flames.minEmitBox = new Vector3(-0.25, 0, -0.25).scale(scale);
    flames.maxEmitBox = new Vector3(0.25, 1.3, 0.25).scale(scale);
    flames.color1 = new Color4(1, 0.55, 0.15, 0.9);
    flames.color2 = new Color4(1, 0.3, 0.05, 0.8);
    flames.colorDead = new Color4(0.2, 0.05, 0, 0);
    flames.minSize = 0.15 * scale;
    flames.maxSize = 0.45 * scale;
    flames.minLifeTime = 0.35;
    flames.maxLifeTime = 0.8;
    flames.emitRate = 420 * scale;
    flames.direction1 = new Vector3(-0.2, 1.5, -0.2);
    flames.direction2 = new Vector3(0.2, 2.4, 0.2);
    flames.minEmitPower = 0.6;
    flames.maxEmitPower = 1.1;
    flames.blendMode = ParticleSystem.BLENDMODE_ADD;
    flames.start();

    const sparks = new ParticleSystem("sparks", 150, this.scene);
    sparks.particleTexture = this.dot;
    sparks.emitter = at.add(new Vector3(0, scale, 0));
    sparks.color1 = new Color4(1, 0.7, 0.3, 1);
    sparks.color2 = new Color4(1, 0.4, 0.1, 1);
    sparks.colorDead = new Color4(1, 0.2, 0, 0);
    sparks.minSize = 0.02;
    sparks.maxSize = 0.04;
    sparks.minLifeTime = 1;
    sparks.maxLifeTime = 2.5;
    sparks.emitRate = 40;
    sparks.direction1 = new Vector3(-0.6, 2, -0.6);
    sparks.direction2 = new Vector3(0.6, 3.5, 0.6);
    sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
    sparks.start();

    const smoke = new ParticleSystem("pyreSmoke", 200, this.scene);
    smoke.particleTexture = this.dot;
    smoke.emitter = at.add(new Vector3(0, 1.6 * scale, 0));
    smoke.color1 = new Color4(0.12, 0.11, 0.1, 0.5);
    smoke.color2 = new Color4(0.2, 0.18, 0.16, 0.35);
    smoke.colorDead = new Color4(0.1, 0.1, 0.1, 0);
    smoke.addSizeGradient(0, 0.3);
    smoke.addSizeGradient(1, 1.4);
    smoke.minLifeTime = 2.5;
    smoke.maxLifeTime = 4;
    smoke.emitRate = 30;
    smoke.direction1 = new Vector3(-0.2, 1, -0.2);
    smoke.direction2 = new Vector3(0.3, 1.5, 0.3);
    smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    smoke.start();
  }

  /**
   * Mưa theo người chơi: vùng mưa cố định không phủ được khoảng đất rộng sau vườn, nên ở đó mưa rơi trong một hộp
   * 18×18 m quanh camera (trong nhà thì tắt — hạt mưa không biết có mái).
   */
  startRoamingRain(): void {
    const rain = new ParticleSystem("roamingRain", 2600, this.scene);
    rain.particleTexture = this.dot;
    rain.emitter = new Vector3(0, 0, 0);
    rain.minEmitBox = new Vector3(-9, 5, -9);
    rain.maxEmitBox = new Vector3(9, 6, 9);
    rain.color1 = new Color4(0.6, 0.68, 0.8, 0.35);
    rain.color2 = new Color4(0.5, 0.58, 0.7, 0.2);
    rain.colorDead = new Color4(0.5, 0.58, 0.7, 0);
    rain.minSize = 0.015;
    rain.maxSize = 0.025;
    rain.minScaleY = 12;
    rain.maxScaleY = 18;
    rain.minLifeTime = 0.55;
    rain.maxLifeTime = 0.65;
    rain.emitRate = 0;
    rain.direction1 = new Vector3(-0.6, -10, 0.2);
    rain.direction2 = new Vector3(-0.4, -10, 0.4);
    rain.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
    rain.blendMode = ParticleSystem.BLENDMODE_ADD;
    rain.start();
    this.roamingRain = rain;
  }

  private roamingRain?: ParticleSystem;

  /** `active`: người chơi đang ở ngoài trời rộng — mưa bám theo vị trí `at`. */
  updateRoamingRain(at: Vector3, active: boolean): void {
    const r = this.roamingRain;
    if (!r) return;
    (r.emitter as Vector3).set(at.x, 0, at.z);
    r.emitRate = active ? 2600 : 0;
  }

  update(flashlightOn: boolean, lightsOn: boolean): void {
    this.dust.emitRate = flashlightOn ? 50 : lightsOn ? 12 : 0;
  }
}
