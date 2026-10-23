/**
 * Cài đặt của người chơi. Lưu trong trình duyệt của từng người (mất cũng không sao — quay về mặc định).
 * Mỗi giá trị đều được Game áp vào thật: độ nhạy camera, độ phơi sáng, âm lượng Web Audio,
 * cỡ chữ phụ đề, độ phân giải render + bóng đổ, nhiễu hạt/quang sai.
 */
export interface SettingsValues {
  /** Hệ số nhân độ nhạy chuột, 1 = mặc định. */
  sensitivity: number;
  /** Hệ số nhân độ phơi sáng, 1 = mặc định. Game cố ý tối; màn hình tối thì tăng lên. */
  brightness: number;
  /** Âm lượng tổng 0..1. */
  volume: number;
  /** Nhạc nền & không khí (tiếng ù, drone, mưa) 0..1. */
  music: number;
  /** Hiệu ứng (gõ cửa, bước chân, giọng nói...) 0..1. */
  sfx: number;
  /** Độ khó: 0 dễ, 1 thường, 2 khó (core/difficulty.ts). */
  difficulty: number;
  /** Chữ trên giấy: 0 viết tay, 1 chữ in (dễ đọc hơn). */
  paperFont: number;
  /** Cỡ phụ đề: 0 nhỏ, 1 vừa, 2 lớn. */
  subtitles: number;
  /** Chất lượng: 0 thấp (điểm ảnh to, không bóng đổ), 1 vừa, 2 cao. */
  quality: number;
  /** Nhiễu hạt + quang sai màu: 1 bật, 0 tắt. */
  film: number;
  /** Giảm chớp sáng & rung: 1 bật (đèn chập chờn dịu đi, không rung camera, không chớp giao diện). */
  calm: number;
  /** Thời gian hiện chữ (phụ đề, lời kể): 0 vừa, 1 lâu, 2 rất lâu. */
  textTime: number;
}

type RangeSpec = { kind: "range"; min: number; max: number; step: number; label: string; format: (v: number) => string };
type ChoiceSpec = { kind: "choice"; options: string[]; label: string };
export type SettingSpec = RangeSpec | ChoiceSpec;

const KEY = "vongam.settings";
const prefersCalm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const DEFAULTS: SettingsValues = {
  sensitivity: 1, brightness: 1, volume: 0.9, music: 1, sfx: 1, difficulty: 1, paperFont: 0, subtitles: 1, quality: 1, film: 1,
  calm: prefersCalm ? 1 : 0, textTime: 0,
};
const TEXT_TIME = [1, 1.5, 2];

/**
 * Tùy chọn dễ chịu mà nhiều hệ thống cần đọc (đèn, giao diện, thực thể) — để không phải truyền Settings đi khắp nơi.
 * `calm`: giảm chớp & rung. `textTime`: hệ số nhân thời gian hiện chữ.
 */
export const comfort = { calm: DEFAULTS.calm === 1, textTime: 1 };
const percent = (v: number) => `${Math.round(v * 100)}%`;

const times = (v: number) => `${v.toFixed(2)}×`;

export const SETTING_SPECS: Record<keyof SettingsValues, SettingSpec> = {
  difficulty: { kind: "choice", options: ["Dễ", "Thường", "Khó"], label: "Độ khó" },
  sensitivity: { kind: "range", min: 0.3, max: 2.5, step: 0.05, label: "Độ nhạy chuột", format: times },
  brightness: { kind: "range", min: 0.6, max: 2, step: 0.05, label: "Độ sáng", format: times },
  volume: { kind: "range", min: 0, max: 1, step: 0.05, label: "Âm lượng tổng", format: percent },
  music: { kind: "range", min: 0, max: 1, step: 0.05, label: "Nhạc nền, mưa", format: percent },
  sfx: { kind: "range", min: 0, max: 1, step: 0.05, label: "Hiệu ứng", format: percent },
  subtitles: { kind: "choice", options: ["Nhỏ", "Vừa", "Lớn"], label: "Cỡ phụ đề" },
  paperFont: { kind: "choice", options: ["Viết tay", "Chữ in"], label: "Chữ trên giấy" },
  quality: { kind: "choice", options: ["Thấp", "Vừa", "Cao"], label: "Chất lượng hình" },
  film: { kind: "choice", options: ["Tắt", "Bật"], label: "Nhiễu hạt phim" },
  calm: { kind: "choice", options: ["Tắt", "Bật"], label: "Giảm chớp & rung" },
  textTime: { kind: "choice", options: ["Vừa", "Lâu", "Rất lâu"], label: "Thời gian hiện chữ" },
};

export class Settings {
  values: SettingsValues = { ...DEFAULTS };
  private listeners: ((v: SettingsValues) => void)[] = [];

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SettingsValues>;
      for (const k of Object.keys(DEFAULTS) as (keyof SettingsValues)[]) {
        if (typeof saved[k] === "number" && Number.isFinite(saved[k])) this.values[k] = saved[k]!;
      }
    } catch {
      // Không đọc được bộ nhớ trình duyệt: dùng mặc định.
    }
    this.syncComfort();
  }

  private syncComfort(): void {
    comfort.calm = this.values.calm === 1;
    comfort.textTime = TEXT_TIME[this.values.textTime] ?? 1;
    document.body.classList.toggle("calm", comfort.calm);
  }

  onChange(cb: (v: SettingsValues) => void): void {
    this.listeners.push(cb);
    cb(this.values);
  }

  set(key: keyof SettingsValues, value: number): void {
    this.values[key] = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.values));
    } catch {
      // Không lưu được: cài đặt vẫn áp dụng cho lần chơi này.
    }
    this.syncComfort();
    for (const cb of this.listeners) cb(this.values);
  }
}
