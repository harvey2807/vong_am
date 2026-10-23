/**
 * Hình học dùng chung giữa nhà, tiệm Phúc Ký và các thực thể: hai tầng (nhà dưới, gác kho đồ mã) và cầu thang nối.
 * Tách riêng để House, PhucKy, Knocker, Effigy cùng nhập mà không vòng lặp import.
 */
import { Vector3 } from "../babylon";

/** Mặt sàn gác kho đồ mã (= mặt trên tấm trần nhà dưới). */
export const FLOOR1_Y = 3.2;

/** Một đoạn cầu thang: đi từ (z0, y0) lên (z1, y1) trong dải x0..x1. Player tự nâng camera theo bậc. */
export interface Stair {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
}

/** Cầu thang gỗ trong tiệm Phúc Ký, sát tường tây, đi lên về phía bắc. */
export const SHOP_STAIR: Stair = { x0: -6.9, x1: -5.95, z0: -5.4, z1: -1.5, y0: 0, y1: FLOOR1_Y };

/** Lỗ trên trần (= sàn gác) phía trên đoạn cầu thang cao — đủ chỗ cho đầu người đi lên. */
export const STAIR_HOLE = { x0: -7.2, x1: -5.9, z0: -3.9, z1: -1.5 };

/** Chân cầu thang (tầng dưới) và đầu cầu thang (trên gác) — chỗ thực thể bắt đầu leo. */
export const STAIR_FOOT = new Vector3(-6.42, 0, -5.75);
export const STAIR_TOP = new Vector3(-6.42, FLOOR1_Y, -1.05);

/** Điểm thực thể ghé khi lục soát gác (x, z) — dọc lối đi giữa hai dãy đồ mã. */
export const ATTIC_POINTS: [number, number][] = [
  [-4.6, -0.6],
  [-2.2, -4.6],
  [-0.5, -1.5],
  [-0.5, 2.5],
  [1.6, 5.0],
  [2.0, -3.8],
  [-3.4, 4.4],
];
