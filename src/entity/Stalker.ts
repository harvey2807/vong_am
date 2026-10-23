import type { Game } from "../core/Game";

const STEPS = 5;
const STEP_INTERVAL = 0.62;
const WATCH_TIME = 3;
/** Xoay quá góc này trong lúc phải đứng yên = quay lại nhìn. */
const TURN_LIMIT = (75 * Math.PI) / 180;

/**
 * Bóng Sau Lưng (quy tắc 4): tiếng bước chân tiến dần tới sát sau lưng rồi dừng.
 * Trong 3 giây sau đó người chơi không được quay lại. Không có hình — chỉ có âm thanh,
 * và cảm giác chắc chắn rằng có cái gì đó đang đứng ngay sau mình.
 */
export class Stalker {
  private phase: "idle" | "approach" | "watch" = "idle";
  private timer = 0;
  private steps = 0;
  private yaw0 = 0;

  constructor(private readonly game: Game) {}

  start(): void {
    this.phase = "approach";
    this.steps = 0;
    this.timer = 0.4;
  }

  update(dt: number): void {
    if (this.phase === "idle") return;
    const cam = this.game.player.camera;
    this.timer -= dt;

    if (this.phase === "approach") {
      if (this.timer > 0) return;
      // Luôn phát đúng sau lưng theo hướng nhìn hiện tại, mỗi bước gần thêm một chút.
      const at = this.game.player.behind(4.2 - this.steps * 0.75);
      at.y = 0.1;
      this.game.audio.play("step", at);
      this.steps++;
      this.timer = STEP_INTERVAL;
      if (this.steps >= STEPS) {
        this.phase = "watch";
        this.timer = WATCH_TIME;
        this.yaw0 = cam.rotation.y;
        // Nhắc quy tắc ngay lúc phải giữ — người chơi đang vội rất dễ quên mà quay người.
        this.game.hud.subtitle("Bước chân dừng ngay sau lưng. Đừng quay lại — đếm tới ba.", WATCH_TIME);
      }
      return;
    }

    let diff = cam.rotation.y - this.yaw0;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) > TURN_LIMIT) {
      this.phase = "idle";
      this.game.director.set("rule4_broken");
    } else if (this.timer <= 0) {
      this.phase = "idle";
      this.game.director.set("rule4_kept");
    }
  }
}
