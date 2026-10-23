/**
 * Phím điều khiển đổi được (Cài đặt → Phím). Mỗi hành động gắn với một `KeyboardEvent.code`, nên vị trí phím
 * được giữ nguyên trên mọi bố cục bàn phím. Phím mũi tên luôn là phím phụ cho di chuyển và không đổi được.
 */
export type Action = "forward" | "back" | "left" | "right" | "sprint" | "interact" | "flashlight" | "breath" | "journal";

export const ACTION_LABELS: Record<Action, string> = {
  forward: "Đi tới",
  back: "Lùi",
  left: "Sang trái",
  right: "Sang phải",
  sprint: "Chạy",
  interact: "Tương tác",
  flashlight: "Đèn pin",
  breath: "Nín thở (trong tủ)",
  journal: "Sổ tay & tin nhắn",
};

const DEFAULTS: Record<Action, string> = {
  forward: "KeyW",
  back: "KeyS",
  left: "KeyA",
  right: "KeyD",
  sprint: "ShiftLeft",
  interact: "KeyE",
  flashlight: "KeyF",
  breath: "Space",
  journal: "KeyJ",
};

/** Phím phụ cố định. */
const ALT: Partial<Record<Action, string[]>> = {
  forward: ["ArrowUp"],
  back: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  sprint: ["ShiftRight"],
  journal: ["Tab"],
};

/** Không cho gán: Esc thoát chuột, phím mũi tên đã là phím phụ. */
const RESERVED = new Set(["Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "F11", "F12"]);

const KEY = "vongam.keys";
const binds: Record<Action, string> = { ...DEFAULTS };
const listeners: (() => void)[] = [];

try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Record<Action, string>>;
  for (const a of Object.keys(DEFAULTS) as Action[]) {
    if (typeof saved[a] === "string" && !RESERVED.has(saved[a]!)) binds[a] = saved[a]!;
  }
} catch {
  // Không đọc được bộ nhớ trình duyệt: dùng phím mặc định.
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(binds));
  } catch {
    // Không lưu được: phím mới vẫn dùng được trong lần chơi này.
  }
  for (const cb of listeners) cb();
}

export const ACTIONS = Object.keys(DEFAULTS) as Action[];

export function codeFor(action: Action): string {
  return binds[action];
}

/** Phím `code` có kích hoạt hành động này không (kể cả phím phụ). */
export function isKey(action: Action, code: string): boolean {
  return binds[action] === code || (ALT[action]?.includes(code) ?? false);
}

export function canBind(code: string): boolean {
  return !RESERVED.has(code);
}

/** Gán phím; phím đó đang thuộc hành động khác thì hai hành động đổi phím cho nhau. */
export function rebind(action: Action, code: string): void {
  if (!canBind(code)) return;
  const other = ACTIONS.find((a) => a !== action && binds[a] === code);
  if (other) binds[other] = binds[action];
  binds[action] = code;
  save();
}

export function resetBinds(): void {
  Object.assign(binds, DEFAULTS);
  save();
}

export function onBindsChange(cb: () => void): void {
  listeners.push(cb);
}

/** Tên phím để hiện trên màn hình: "KeyE" → "E", "ShiftLeft" → "Shift", "Space" → "Space". */
export function keyName(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  const named: Record<string, string> = {
    ShiftLeft: "Shift", ShiftRight: "Shift phải", ControlLeft: "Ctrl", ControlRight: "Ctrl phải", AltLeft: "Alt", AltRight: "Alt phải",
    Space: "Space", Enter: "Enter", Backspace: "⌫", CapsLock: "Caps", Backquote: "`", Minus: "-", Equal: "=",
    BracketLeft: "[", BracketRight: "]", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", Backslash: "\\",
  };
  return named[code] ?? code;
}

export function label(action: Action): string {
  return keyName(binds[action]);
}

/** Thay "{journal}", "{flashlight}"… trong chữ kịch bản bằng phím người chơi đang dùng. */
export function withKeys(text: string): string {
  return text.replace(/\{(\w+)\}/g, (m, a: string) => (a in binds ? label(a as Action) : m));
}
