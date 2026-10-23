import relics from "../data/relics.json";
import type { Note } from "../ui/Hud";

/**
 * Di vật: mỗi màn giấu một tờ giấy kể phần chuyện cũ của nhà họ Lâm (tiệm Phúc Ký, đứa thế thân, đêm Rằm
 * hai mươi năm trước). Không bắt buộc để qua màn; tìm đủ thì Đêm cuối mở Kết thật.
 * Đã tìm được thì nhớ qua mọi lần chơi (localStorage), đọc lại trong mục "Di vật" ở màn hình chính.
 */
export interface Relic extends Note {
  id: string;
  level: number;
  hint: string;
}

export const RELICS = relics as Relic[];

const KEY = "vongam.relics";

export function foundRelics(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Ghi nhận đã tìm; trả về true nếu là lần đầu. */
export function markRelic(id: string): boolean {
  const found = foundRelics();
  if (found.has(id)) return false;
  found.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn tính trong lần chơi này qua cờ Director.
  }
  return true;
}

export function allRelicsFound(found = foundRelics()): boolean {
  return RELICS.every((r) => found.has(r.id));
}

export function resetRelics(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // bỏ qua
  }
}
