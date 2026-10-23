/**
 * Nhật ký chơi thử: ghi lại mọi sự kiện kinh dị, cờ tiến trình, lần bị bắt, lần trốn, bật đèn pin,
 * và vị trí người chơi mỗi 2 giây. Cuối đêm người chơi trả lời 3 câu hỏi rồi tải file JSON gửi lại.
 * Thời gian chỉ tính lúc đang chơi (không tính lúc tạm dừng hay đọc menu).
 */
export interface PlaytestAnswers {
  fear: number | null;
  scariest: string;
  boring: string;
}

interface Entry {
  t: number;
  kind: "event" | "flag" | "action" | "ending";
  what: string;
}

const SAMPLE_EVERY = 2;

export class PlaytestLog {
  private time = 0;
  private sampleTimer = 0;
  private readonly entries: Entry[] = [];
  /** [giây, x, z] */
  private readonly path: [number, number, number][] = [];
  readonly counts = { caught: 0, hides: 0, flashlight: 0, pauses: 0 };

  constructor(private readonly night: number) {}

  get elapsed(): number {
    return this.time;
  }

  log(kind: Entry["kind"], what: string): void {
    this.entries.push({ t: Math.round(this.time * 10) / 10, kind, what });
    if (what === "caught") this.counts.caught++;
  }

  update(dt: number, x: number, z: number): void {
    this.time += dt;
    this.sampleTimer -= dt;
    if (this.sampleTimer <= 0) {
      this.sampleTimer = SAMPLE_EVERY;
      this.path.push([Math.round(this.time), Math.round(x * 10) / 10, Math.round(z * 10) / 10]);
    }
  }

  /** Một dòng tóm tắt cho màn hình kết thúc. */
  summary(): string {
    const m = Math.floor(this.time / 60);
    const s = Math.floor(this.time % 60).toString().padStart(2, "0");
    return `Thời gian ${m}:${s} · Trốn tủ ${this.counts.hides} lần · Bật/tắt đèn pin ${this.counts.flashlight} lần`;
  }

  download(answers: PlaytestAnswers): void {
    const data = {
      game: "VONG ÂM prototype",
      night: this.night,
      date: new Date().toISOString(),
      userAgent: navigator.userAgent,
      seconds: Math.round(this.time),
      counts: this.counts,
      answers,
      timeline: this.entries,
      path: this.path,
    };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, "0");
    a.download = `vongam-dem${this.night}-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
