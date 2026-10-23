export type SoundId =
  | "knock" | "whisper" | "sting" | "creak" | "rattle" | "click" | "step"
  | "heavyStep" | "breath" | "shriek" | "dig" | "splash" | "static" | "rustle" | "whoosh" | "thunder";
export type LightState = "on" | "off" | "flicker" | "blackout";
/**
 * appear: đứng yên tại anchor · patrol: đi săn · alert: lao tới chỗ người chơi · grab: bắt ngay · vanish: biến mất
 * disguise: khoác hình dạng của Út (áo sơ mi trắng, tóc ngắn, mặt người) — đêm cuối.
 */
export type EntityCommand = "appear" | "patrol" | "alert" | "grab" | "vanish" | "disguise";
export type TvState = "off" | "static" | "face";

/** Điều kiện kích hoạt một sự kiện. Tất cả các trường đều phải thỏa. */
export interface Condition {
  /** Mọi cờ này phải đã được bật. */
  all?: string[];
  /** Không cờ nào trong số này được bật. */
  none?: string[];
  /** Số giây phải trôi qua kể từ khi all/none thỏa. */
  delay?: number;
  /** Mục tiêu (vd. "photo") phải nằm NGOÀI tầm nhìn của người chơi. */
  hidden?: string;
  /** Người chơi phải đang nhìn thẳng vào mục tiêu ở cự ly gần. */
  look?: string;
  /** Mục tiêu đang nằm TRONG tầm nhìn (mọi khoảng cách). */
  visible?: string;
  /** Người chơi đang ở gần anchor này (trong `nearRadius` mét, mặc định 3) — dùng cho bản đồ ngoài trời. */
  near?: string;
  nearRadius?: number;
}

export type Action =
  | { type: "wait"; seconds: number }
  /** `glitch`: câu "không thể có" chớp hiện trong tích tắc trước câu thật. */
  | { type: "subtitle"; text: string; duration?: number; voice?: boolean; glitch?: string }
  | { type: "setFlag"; flag: string }
  | { type: "sound"; sound: SoundId; at?: string }
  | { type: "photo"; variant: number }
  | { type: "lights"; state: LightState }
  | { type: "tension"; add: number }
  | { type: "entity"; do: EntityCommand; at?: string }
  /** `glitch`: dòng nhiệm vụ bị "chiếm" — chớp hiện câu khác trong nửa giây rồi mới hiện câu thật. */
  | { type: "objective"; text: string; glitch?: string }
  /** Đóng/mở một cánh cửa (vd. cửa phòng bà tự đóng sầm sau lưng). */
  | { type: "door"; door: string; open: boolean }
  /** Hiện/ẩn một vật có tên trong targets (vd. gương mặt sau cửa sổ). */
  | { type: "show"; target: string; visible: boolean }
  /** Bù nhìn ngoài đồng nổi giận: đi cả trong bóng tối trong `seconds` giây. */
  | { type: "scarecrows"; do: "rage"; seconds: number }
  /** Hiện lựa chọn [E] trong vài giây; bấm thì bật cờ. Dùng cho cám dỗ kiểu "trả lời tiếng gọi". */
  | { type: "choice"; text: string; flag: string; seconds: number }
  /** Bước chân tiến tới sau lưng rồi dừng. Quay lại trong 3 giây → cờ rule4_broken, không thì rule4_kept. */
  | { type: "footstepsBehind" }
  | { type: "tv"; state: TvState }
  /** Hình nhân trong nhà (Đêm 3): wake = mất mặt và bắt đầu đi khi không ai nhìn; sleep = đứng im. */
  | { type: "effigies"; do: "wake" | "sleep" }
  /** `next`: đêm kế tiếp (kết thúc để đi tiếp); `final`: kết thúc thật của cả câu chuyện. */
  | { type: "ending"; title: string; text: string; next?: number; final?: boolean };

export interface HorrorEvent {
  id: string;
  comment?: string;
  when: Condition;
  actions: Action[];
}

/** Những gì Director được phép tác động lên thế giới. Director không biết gì về Babylon. */
export interface DirectorContext {
  subtitle(text: string, duration: number, voice: boolean, glitch?: string): void;
  playSound(sound: SoundId, at?: string): void;
  setPhoto(variant: number): void;
  setLights(state: LightState): void;
  entity(cmd: EntityCommand, at?: string): void;
  objective(text: string, glitch?: string): void;
  door(name: string, open: boolean): void;
  show(target: string, visible: boolean): void;
  scarecrowRage(seconds: number): void;
  isNear(anchor: string, radius: number): boolean;
  choice(text: string, flag: string, seconds: number): void;
  footstepsBehind(): void;
  tv(state: TvState): void;
  effigies(cmd: "wake" | "sleep"): void;
  end(title: string, text: string, next?: number, final?: boolean): void;
  isVisible(target: string): boolean;
  isLookedAt(target: string): boolean;
}
