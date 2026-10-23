import type { Note } from "../ui/Hud";

/**
 * Trang sổ bà xé làm bốn mảnh, giấu mỗi đêm một mảnh (SCRIPT_V2 §4). Đọc từng phần thì hiểu sai, đủ bốn mảnh mới ra
 * sự thật. Như di vật: tìm rồi thì nhớ qua mọi lần chơi (localStorage); ghép dần trong sổ tay.
 */
export const FRAGMENTS = [
  "Đứa được bế ra không phải",
  "đứa còn thở.",
  "Đứa còn thở thì bà bỏ lại dưới gầm bàn thờ.",
  "Nhưng hồn của Út theo đứa bà bế ra. Hai đứa đều là Út. Bà thương hết.",
];

/** Chỗ giấu từng mảnh — hiện trong sổ tay cho mảnh chưa tìm thấy. */
const WHERE = ["(trong sổ tay của bà)", "(…dưới nước)", "(…trong một đường may)", "(…dưới gầm bàn thờ)"];

const KEY = "vongam.fragments";

export function foundFragments(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as number[]);
  } catch {
    return new Set();
  }
}

/** Ghi nhận đã tìm mảnh `i` (0..3); trả về true nếu là lần đầu. */
export function markFragment(i: number): boolean {
  const found = foundFragments();
  if (found.has(i)) return false;
  found.add(i);
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn tính trong lần chơi này qua cờ Director.
  }
  return true;
}

/** Trang sổ ghép từ những mảnh đã có; chỗ thiếu để trống. */
export function fragmentNote(found = foundFragments()): Note {
  const parts = FRAGMENTS.map((text, i) => (found.has(i) ? text : `……… ${WHERE[i]}`));
  // Mảnh 1 và 2 là hai nửa của cùng một câu.
  const first = found.has(0) && found.has(1) ? `${parts[0]} ${parts[1]}` : `${parts[0]}…\n…${parts[1]}`;
  return {
    title: "Trang sổ bị xé",
    paper: "burnt",
    pages: [`(Những mảnh giấy cháy mép, ghép lại theo vết xé. Nét chữ của bà. ${found.size}/4 mảnh.)\n\n${first}\n\n${parts[2]}\n\n${parts[3]}`],
  };
}
