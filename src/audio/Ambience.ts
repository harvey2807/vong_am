import { Vector3 } from "../babylon";
import type { AudioSystem } from "./AudioSystem";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Chỗ thạch sùng hay bám: góc tường sát trần trong nhà (x, y, z). */
const GECKO_SPOTS: [number, number, number][] = [
  [-6.8, 2.6, 0.4],
  [-1.2, 2.7, 5.6],
  [5.7, 2.6, 5.7],
  [5.6, 2.6, -5.6],
  [-0.8, 2.6, -5.4],
  [0.8, 2.6, 2.2],
];

export interface AmbienceWhere {
  /** Có nhà bà (các đêm trong nhà + ngõ). */
  house: boolean;
  /** Đường ngoài để xe máy chạy ngang (z), không có thì không có xe. */
  roadZ?: number;
  /** Ở ngoài đồng: chỉ có chó tru rất xa. */
  fields: boolean;
}

/**
 * Tiếng sống của xóm: thạch sùng chặc lưỡi trong nhà, chó tru xa, xe máy chạy ngang ngoài đường.
 * Quy tắc: tiếng sống chỉ có khi căn nhà còn yên. Khi có tiếng gõ cửa / đi săn / mất điện thì im bặt —
 * người chơi học được rằng **sự im lặng** mới là dấu hiệu nguy hiểm. `hush()` cắt tiếng sống theo kịch bản.
 */
export class Ambience {
  private gecko = rand(12, 25);
  private dog = rand(20, 45);
  private moto = rand(25, 60);
  private hushed = 0;

  constructor(
    private readonly audio: AudioSystem,
    private readonly where: AmbienceWhere,
  ) {}

  /** Im lặng có chủ đích trong `seconds` giây (đếm lại từ đầu mỗi lần gọi). */
  hush(seconds: number): void {
    this.hushed = Math.max(this.hushed, seconds);
  }

  update(dt: number, calm: boolean, listener: Vector3): void {
    this.hushed = Math.max(0, this.hushed - dt);
    // Trong lúc không yên: đồng hồ của từng loại tiếng vẫn dừng lại, nên khi yên trở lại không bị dồn cả loạt.
    if (!calm || this.hushed > 0) return;

    if (this.where.house) {
      this.gecko -= dt;
      if (this.gecko <= 0) {
        this.gecko = rand(35, 80);
        const nearest = GECKO_SPOTS.map((p) => new Vector3(...p)).sort((a, b) => Vector3.Distance(a, listener) - Vector3.Distance(b, listener));
        // Không phải con gần nhất — nghe vọng từ phòng bên mới thật.
        this.audio.play("gecko", nearest[1 + Math.floor(Math.random() * 2)]);
      }
    }

    this.dog -= dt;
    if (this.dog <= 0) {
      this.dog = rand(55, 110);
      const a = Math.random() * Math.PI * 2;
      const far = this.where.fields ? 70 : 38;
      this.audio.play("dog", listener.add(new Vector3(Math.cos(a) * far, 0, Math.sin(a) * far)));
    }

    if (this.where.roadZ !== undefined) {
      this.moto -= dt;
      if (this.moto <= 0) {
        this.moto = rand(70, 150);
        this.audio.play("motorbike", new Vector3(listener.x, 0.8, this.where.roadZ));
      }
    }
  }
}
