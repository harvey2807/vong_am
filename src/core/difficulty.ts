/**
 * Độ khó: một bộ hệ số nhân dùng chung cho thực thể và người chơi. Settings đặt mức; các hệ thống
 * đọc hệ số lúc dùng (không chép ra biến riêng) nên đổi giữa chừng có tác dụng ngay.
 */
export interface DifficultyMods {
  /** Tốc độ Người Gõ Cửa khi đuổi / đi tuần. */
  knockerSpeed: number;
  /** Tầm nhìn của nó. */
  sight: number;
  /** Tầm nghe của nó. */
  hearing: number;
  /** Tốc độ hình nhân. */
  effigySpeed: number;
  /** Thời gian chạy trước khi hết hơi. */
  stamina: number;
  /** Nín thở được tối đa bao nhiêu giây trong tủ. */
  breathHold: number;
}

const LEVELS: DifficultyMods[] = [
  { knockerSpeed: 0.88, sight: 0.85, hearing: 0.8, effigySpeed: 0.8, stamina: 1.5, breathHold: 11 },
  { knockerSpeed: 1, sight: 1, hearing: 1, effigySpeed: 1, stamina: 1, breathHold: 8 },
  { knockerSpeed: 1.08, sight: 1.2, hearing: 1.3, effigySpeed: 1.2, stamina: 0.7, breathHold: 6.5 },
];

let current = LEVELS[1];

export function setDifficulty(level: number): void {
  current = LEVELS[level] ?? LEVELS[1];
}

export function diff(): DifficultyMods {
  return current;
}
