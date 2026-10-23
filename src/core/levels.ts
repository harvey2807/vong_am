import type { HorrorEvent } from "../director/types";
import night0 from "../data/night0.json";
import night1 from "../data/night1.json";
import night2 from "../data/night2.json";
import night25 from "../data/night2_5.json";
import { SCARECROW_SPOTS } from "../world/Fields";
import night3 from "../data/night3.json";
import night4 from "../data/night4.json";

export interface Level {
  id: number;
  title: string;
  subtitle: string;
  events: HorrorEvent[];
  /** Vị trí và hướng nhìn (độ) lúc bắt đầu. */
  start: { x: number; z: number; yaw: number };
  /** Cờ bật sẵn — những gì đã xảy ra ở các đêm trước. */
  flags: string[];
  photo: number;
  rain: boolean;
  /** Đoạn kể nối chương, hiện trên màn chuyển chương trước khi vào đêm. */
  intro: string[];
  /** Hình nhân đứng thêm trong nhà (ngoài hai hình nhân chầu bàn thờ): x, z, hướng nhìn độ. */
  effigies?: [number, number, number][];
  /** Hình nhân chỉ đi khi đèn tắt. */
  effigiesDarkOnly?: boolean;
  /** Bù nhìn ngoài đồng (x, z, hướng nhìn độ) — chỉ màn Chạng vạng. */
  scarecrows?: [number, number, number][];
}

export const LEVELS: Record<number, Level> = {
  0: {
    id: 0,
    title: "Mở đầu",
    subtitle: "Ngõ 4",
    intro: [
      "Tôi nhận tin bà mất khi đang ở Sài Gòn. Bảy ngày sau mới về được tới làng.",
      "Xe thả tôi ở đầu ngõ lúc gần nửa đêm. Trời mưa không ngớt.",
      "Nhà bà ở cuối Ngõ 4. Gian trước từng là tiệm trát giấy Phúc Ký của ông — hai mươi năm nay không mở cửa.",
      "Chú Tư nhắn: \"Chìa khóa để dưới chậu bông trước cửa. Đi thẳng vô nhà, đừng la cà.\"",
    ],
    events: night0 as unknown as HorrorEvent[],
    start: { x: 0, z: -38.6, yaw: 0 },
    flags: [],
    photo: 4,
    rain: true,
  },
  1: {
    id: 1,
    title: "Đêm thứ nhất",
    intro: [
      "Đêm nay là đầu thất của bà. Người xưa nói đêm đầu thất, người chết về nhà.",
      "Người ta vớt bà lên từ cái giếng sau vườn — trong khi cửa nhà vẫn cài then bên trong.",
      "Chú Tư nhắn thêm đúng một câu: \"Đêm nay đừng mở cửa cho ai.\"",
    ],
    subtitle: "Tiếng gõ cửa",
    events: night1 as unknown as HorrorEvent[],
    start: { x: 0, z: -4.8, yaw: 0 },
    flags: [],
    photo: 4,
    rain: false,
  },
  2: {
    id: 2,
    title: "Đêm thứ hai",
    intro: [
      "Sáng ra, ảnh thờ vẫn có năm người. Không ai trong xóm chịu nhìn lâu vào nó.",
      "Chú Tư bảo phải đi mời thầy, tối mới về. Chiều thì trời đổ mưa.",
      "Tôi ngủ thiếp đi trong phòng bà. Lúc tỉnh dậy, ngoài sân có tiếng nước giếng óc ách.",
    ],
    subtitle: "Cái giếng",
    events: night2 as unknown as HorrorEvent[],
    start: { x: 3.0, z: 4.1, yaw: 38 },
    flags: ["read_rules", "has_key", "seen_photo_4", "seen_photo_5", "photo_changed", "voice_heard", "read_diary", "bedroom_open", "lit_incense"],
    photo: 5,
    rain: true,
  },
  // Màn xen giữa Đêm 2 và Đêm 3 (id 2.5 để thứ tự tiến trình so sánh số vẫn đúng).
  2.5: {
    id: 2.5,
    title: "Chạng vạng",
    subtitle: "Gốc đa đầu làng",
    intro: [
      "Cái chén men lam nằm yên trên bàn thờ. Tiếng gõ cửa đã ngừng.",
      "Nhưng chú Tư đi mời thầy từ hôm qua vẫn chưa về.",
      "Chạng vạng, người trong xóm nói thấy chú đi ra phía gốc đa đầu làng — vừa đi vừa đếm.",
    ],
    events: night25 as unknown as HorrorEvent[],
    start: { x: 0, z: 70.4, yaw: 0 },
    flags: ["read_rules", "has_key", "read_diary", "bedroom_open", "lit_incense", "read_uncle_note", "all_shards", "bowl_placed"],
    photo: 5,
    rain: false,
    scarecrows: SCARECROW_SPOTS,
  },
  3: {
    id: 3,
    title: "Đêm thứ ba",
    intro: [
      "Sáng ra tôi tỉnh dậy trên giường bà, ống quần còn dính bùn ruộng.",
      "Gần trưa, thầy Sáu ghé qua, đứng ngoài cổng rất lâu mà không bước vào.",
      "Ông thầy chỉ nói một câu: \"Đồ mã nhà này do bà tự làm. Bà làm khéo quá.\"",
      "Tối đó, mấy hình nhân giấy của đám tang bà không còn đứng ở chỗ cũ.",
    ],
    subtitle: "Hình nhân",
    events: night3 as unknown as HorrorEvent[],
    start: { x: 0, z: -4.8, yaw: 0 },
    flags: ["read_rules", "has_key", "read_diary", "bedroom_open", "lit_incense", "read_uncle_note", "all_shards", "bowl_placed"],
    photo: 7,
    rain: false,
    effigies: [
      [0.3, -1.6, 180],
      [4.4, -4.1, -90],
      [2.2, 5.3, 135],
    ],
  },
  4: {
    id: 4,
    title: "Đêm cuối",
    intro: [
      "Hình nhân cháy hết lúc gần sáng. Trong ảnh, chỗ người thứ năm chỉ còn một vết xém.",
      "Rồi trời hửng. Ngoài cổng có ai đó đứng đợi, mặc cái áo sơ mi trắng cũ của tôi.",
      "Người đó quay lại nhìn tôi. Gương mặt đó là của tôi.",
    ],
    subtitle: "Người thứ năm",
    events: night4 as unknown as HorrorEvent[],
    start: { x: -2.4, z: 2.6, yaw: -90 },
    flags: ["read_rules", "has_key", "read_diary", "bedroom_open", "lit_incense", "read_uncle_note", "all_shards", "bowl_placed", "read_master_note", "burned"],
    photo: 5,
    rain: true,
    effigies: [],
    effigiesDarkOnly: true,
  },
};

const PROGRESS_KEY = "vongam.progress";
const COMPLETED_KEY = "vongam.completed";
/** Đánh dấu "trang này mở ra để vào thẳng màn chuyển chương", thay vì màn hình chính. */
const CHAPTER_KEY = "vongam.chapter";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ mất tính năng nhớ tiến trình.
  }
}

/** Đêm người chơi đang dở (đêm cao nhất đã tới). */
export function savedNight(): number {
  const n = Number(read(PROGRESS_KEY) ?? 0);
  return LEVELS[n] ? n : 0;
}

export function saveNight(n: number): void {
  write(PROGRESS_KEY, String(n));
}

export function hasCompleted(): boolean {
  return read(COMPLETED_KEY) === "1";
}

export function markCompleted(): void {
  write(COMPLETED_KEY, "1");
}

export function resetProgress(): void {
  write(PROGRESS_KEY, null);
}

/** Đêm đang dựng: `?dem=N` trên URL (để thử nhanh), không thì đêm đang dở. */
export function currentLevel(): Level {
  const param = new URLSearchParams(window.location.search).get("dem");
  const n = param ? Number(param) : savedNight();
  return LEVELS[n] ?? LEVELS[1];
}

/** Chuyển sang đêm `n` và vào thẳng màn chuyển chương (trang phải tải lại vì mỗi đêm dựng cảnh riêng). */
export function goToChapter(n: number): void {
  try {
    sessionStorage.setItem(CHAPTER_KEY, String(n));
  } catch {
    // Không có sessionStorage: sẽ hiện màn hình chính, người chơi bấm "Tiếp tục".
  }
  window.location.href = `?dem=${n}`;
}

export function goToMenu(): void {
  window.location.href = window.location.pathname;
}

/** Trang này có được mở để vào thẳng màn chuyển chương không (đọc xong thì xóa). */
export function takeChapterFlag(n: number): boolean {
  try {
    const v = sessionStorage.getItem(CHAPTER_KEY);
    sessionStorage.removeItem(CHAPTER_KEY);
    return v === String(n);
  } catch {
    return false;
  }
}
