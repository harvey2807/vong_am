import { drawPhoto } from "../world/textures";
import { foundRelics, RELICS } from "../core/relics";
import { comfort, SETTING_SPECS, type Settings, type SettingsValues } from "../core/Settings";
import { ACTION_LABELS, ACTIONS, canBind, isKey, keyName, label, onBindsChange, rebind, resetBinds, type Action } from "../core/Keybinds";
import type { PlaytestAnswers } from "../core/Playtest";
import { MenuBackground, type MenuSceneEvent } from "./MenuBackground";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Khóa số (hộp bánh quy của bà…): vài vòng số xoay bằng bàn phím. */
export interface LockOptions {
  title: string;
  sub: string;
  digits: number;
  /** Thử mã: trả về câu phản hồi khi sai, `null` khi đúng. */
  onTry: (code: string) => string | null;
  /** Đóng khóa (bỏ đi hoặc đã mở được). */
  onClose: (solved: boolean) => void;
  onTurn?: () => void;
}

export interface JournalMessage {
  from: string;
  text: string;
  /** Tin của chính người chơi (bên phải). */
  self: boolean;
  /** Tin không thể có — từ người đã mất, hay từ chính số của mình. */
  eerie?: boolean;
}

/** Những gì sổ tay hiện — Game dựng lại mỗi lần vẽ để luôn đúng với tiến trình. */
export interface JournalView {
  objective: string;
  hints: string[];
  hintsLeft: number;
  items: { label: string; note: string }[];
  papers: { title: string; open: () => void }[];
  group: string;
  messages: JournalMessage[];
}

const JOURNAL_TABS = 3;

export interface NightInfo {
  id: number;
  title: string;
  subtitle: string;
  intro: string[];
}

/** Một tờ giấy trong game (data/notes.json). `[[...]]` trong trang = dòng "tự viết thêm" bằng mực khác. */
export interface Note {
  title: string;
  /** Chất liệu: school (vở ô li), diary (sổ tay), pencil (bút chì), do (giấy dó), burnt (cháy xém). */
  paper: string;
  pages: string[];
}

/** Đọc một trang bao lâu thì dòng "tự viết thêm" bắt đầu hiện (ms). */
const LATE_INK_DELAY = 2800;

export interface EndingAction {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

const LINE_DELAY = 1.6;
/** Việc cần làm sáng rõ lúc mới đổi, sau chừng này mili-giây thì mờ đi để nhường chỗ cho cảnh. */
const OBJECTIVE_FADE_AFTER = 7000;
const MODALS = ["panel-settings", "panel-credits", "panel-memories", "panel-relics"];
/** Thứ tự từ trên xuống: màn nào đang hiện và nằm trên cùng thì nhận phím mũi tên. */
const SCREENS = [...MODALS, "warning", "pause", "start", "chapter", "ending"];
const TOAST_TIME = 5500;

/**
 * Toàn bộ giao diện DOM phủ trên canvas Babylon: HUD trong game, giấy/ảnh, màn hình chính,
 * chuyển chương, tạm dừng, các bảng phụ, kết thúc. Game gọi vào đây; Hud không biết gì về Babylon.
 */
export class Hud {
  private readonly prompt = $("prompt");
  private readonly promptLabel = this.prompt.querySelector<HTMLElement>(".label")!;
  private readonly subtitleEl = $("subtitle");
  private readonly reader = $("reader");
  private readonly paper = $("paper");
  private note?: Note;
  private page = 0;
  private lateTimer = 0;
  /** Trang đã hiện dòng mực lạ (lật lại vẫn còn). */
  private readonly lateShown = new Set<number>();
  private onLateInk?: () => void;
  private readonly readerTitle = $("reader-title");
  private readonly readerBody = $("reader-body");
  private readonly readerPhoto = $<HTMLCanvasElement>("reader-photo");
  private readonly start = $("start");
  private readonly pause = $("pause");
  private readonly ending = $("ending");
  private readonly chapter = $("chapter");
  private readonly crosshair = $("crosshair");
  private readonly hideOverlay = $("hide-overlay");
  private readonly objectiveEl = $("objective");
  private readonly vignette = $("vignette");
  private readonly menuBg = new MenuBackground($<HTMLCanvasElement>("menu-bg"));
  private subtitleTimer = 0;
  private glitchTimer = 0;
  private objectiveTimer = 0;
  private lastPrompt: string | null = null;
  /** Phần tử có focus trước khi mở bảng phụ — đóng bảng thì trả focus về đó. */
  private modalReturn?: HTMLElement;
  private readonly lockEl = $("lock");
  private lock?: LockOptions & { values: number[]; sel: number; solved: boolean };
  private readonly journalEl = $("journal");
  private journal?: { view: () => JournalView; onHint: () => void; onClose: () => void; tab: number; sel: number };
  private readonly toastEl = $("toast");
  private toastTimer = 0;
  /** Đang chờ người chơi nhấn phím mới cho hành động này (bảng Cài đặt). */
  private capturing?: { action: Action; button: HTMLButtonElement };

  constructor() {
    this.menuBg.run();
    // JS đã chạy tới đây = game sẵn sàng → gỡ màn hình đang tải (mờ dần rồi biến mất).
    const loading = $("loading");
    loading.classList.add("done");
    window.setTimeout(() => loading.remove(), 900);
    for (const id of MODALS) {
      const panel = $(id);
      panel.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => this.closeModal()));
      // Bấm ra vùng tối ngoài bảng cũng đóng.
      panel.addEventListener("click", (e) => {
        if (e.target === panel) this.closeModal();
      });
    }
    $("pause-settings").addEventListener("click", () => this.openModal("panel-settings"));
    // Bắt phím trước mọi thứ khác khi đang gán phím mới (kể cả Esc — Esc chỉ để hủy).
    window.addEventListener("keydown", (e) => this.onCaptureKey(e), { capture: true });
    window.addEventListener("keydown", (e) => this.onKey(e));
    // Cuộn chuột trên khóa số = xoay vòng đang chọn (cuộn vẫn tới được khi chuột bị khóa).
    window.addEventListener("wheel", (e) => {
      if (this.lock && !this.lock.solved) this.turnDial(e.deltaY > 0 ? -1 : 1);
    });
    $("journal-tabs").querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!this.journal) return;
        this.journal.tab = Number(b.dataset.tab);
        this.journal.sel = 0;
        this.renderJournal();
      }),
    );
    this.setupFullscreen();
    this.refreshKeys();
    onBindsChange(() => this.refreshKeys());
  }

  get readerOpen(): boolean {
    return !this.reader.classList.contains("hidden");
  }

  get lockOpen(): boolean {
    return !!this.lock;
  }

  get journalOpen(): boolean {
    return !!this.journal;
  }

  /** Có lớp giao diện nào đang chiếm điều khiển (giấy, khóa số, sổ tay) không. */
  get busy(): boolean {
    return this.readerOpen || this.lockOpen || this.journalOpen;
  }

  /** Cập nhật mọi chữ phím trên màn hình theo phím đang gán. */
  private refreshKeys(): void {
    document.querySelectorAll<HTMLElement>("kbd[data-key]").forEach((k) => (k.textContent = label(k.dataset.key as Action)));
    this.lastPrompt = null;
  }

  /** Có bảng phụ nào đang mở không. */
  get modalOpen(): boolean {
    return MODALS.some((id) => !$(id).classList.contains("hidden"));
  }

  // ---------------------------------------------------------------- điều hướng bàn phím

  private topScreen(): HTMLElement | null {
    for (const id of SCREENS) {
      const el = $(id);
      if (!el.classList.contains("hidden")) return el;
    }
    return null;
  }

  private onKey(e: KeyboardEvent): void {
    // Khóa số / sổ tay giữ trọn bàn phím: đánh dấu đã xử lý để Game không làm thêm (Esc vẫn thoát chuột như thường).
    if (this.lock) {
      this.onLockKey(e);
      if (e.code !== "Escape" && e.code !== "KeyM") e.preventDefault();
      return;
    }
    if (this.journal) {
      this.onJournalKey(e);
      if (e.code !== "Escape" && e.code !== "KeyM") e.preventDefault();
      return;
    }
    if (this.readerOpen && this.note && this.note.pages.length > 1) {
      if (isKey("left", e.code)) this.turnPage(-1);
      else if (isKey("right", e.code)) this.turnPage(1);
    }
    const screen = this.topScreen();
    if (!screen) return;
    if (e.code === "Escape" && this.modalOpen) {
      e.preventDefault();
      this.closeModal();
      return;
    }
    if (e.code !== "ArrowDown" && e.code !== "ArrowUp") return;
    // Lên/xuống chuyển giữa các mục; thanh trượt vẫn chỉnh bằng trái/phải như mặc định của trình duyệt.
    const items = [...screen.querySelectorAll<HTMLElement>("button:not([disabled]), input, summary")].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.code === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[i < 0 ? 0 : next].focus();
  }

  private openModal(id: string): void {
    this.modalReturn = document.activeElement as HTMLElement;
    const m = $(id);
    m.classList.remove("hidden");
    m.querySelector<HTMLElement>("button, input")?.focus();
  }

  private closeModal(): void {
    if (!this.modalOpen) return;
    for (const id of MODALS) $(id).classList.add("hidden");
    this.modalReturn?.focus({ preventScroll: true });
  }

  private setupFullscreen(): void {
    const btn = $<HTMLButtonElement>("fullscreen-btn");
    if (!document.fullscreenEnabled) {
      btn.classList.add("hidden");
      return;
    }
    const label = () => (btn.textContent = document.fullscreenElement ? "Thoát toàn màn hình" : "Toàn màn hình");
    btn.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        // Trình duyệt từ chối (vd. trang nhúng không cho phép) — báo nhẹ, không làm gì thêm.
        btn.textContent = "Trình duyệt không cho toàn màn hình";
      }
    });
    document.addEventListener("fullscreenchange", label);
    label();
  }

  // ---------------------------------------------------------------- màn hình chính

  /**
   * Màn hình chính: Tiếp tục / Trò chơi mới, Cài đặt, Ghi công. Phá đảo rồi mới mở "Hồi tưởng".
   * Không có "Tải game" (chỉ có một tiến trình) và không có "Thoát" (trình duyệt không cho trang tự đóng tab).
   */
  showMenu(opts: { saved: NightInfo; completed: boolean; nights: NightInfo[]; onPlay: (n: number) => void; onNewGame: () => void }): void {
    const list = $("menu-list");
    list.replaceChildren();
    const item = (label: string, sub: string, onClick: () => void, primary = false) => {
      const b = document.createElement("button");
      b.className = `menu-item${primary ? " primary" : ""}`;
      b.innerHTML = `<span class="mi-label"></span><span class="mi-sub"></span>`;
      b.querySelector(".mi-label")!.textContent = label;
      b.querySelector(".mi-sub")!.textContent = sub;
      b.addEventListener("click", onClick);
      list.appendChild(b);
      return b;
    };
    if (opts.saved.id > 0) {
      item("Tiếp tục", `${opts.saved.title} · ${opts.saved.subtitle}`, () => opts.onPlay(opts.saved.id), true);
      const reset = item("Trò chơi mới", "Bắt đầu lại từ đầu ngõ", () => {
        // Bấm hai lần mới xóa — tránh lỡ tay mất tiến trình.
        if (!reset.classList.contains("confirm")) {
          reset.classList.add("confirm");
          reset.querySelector(".mi-sub")!.textContent = "Tiến trình hiện tại sẽ mất — bấm lần nữa để xác nhận";
          return;
        }
        opts.onNewGame();
      });
    } else {
      item("Trò chơi mới", "Mở đầu · Ngõ 4", () => opts.onPlay(0), true);
    }
    if (opts.completed) {
      item("Hồi tưởng", "Chơi lại một đêm đã qua", () => this.openModal("panel-memories"));
      const mem = $("memory-list");
      mem.replaceChildren();
      for (const n of opts.nights) {
        const b = document.createElement("button");
        b.className = "menu-item";
        b.innerHTML = `<span class="mi-label"></span><span class="mi-sub"></span>`;
        b.querySelector(".mi-label")!.textContent = n.title;
        b.querySelector(".mi-sub")!.textContent = n.subtitle;
        b.addEventListener("click", () => opts.onPlay(n.id));
        mem.appendChild(b);
      }
    }
    const found = foundRelics();
    if (found.size) {
      item("Di vật", `${found.size}/${RELICS.length} mảnh giấy cũ của nhà họ Lâm`, () => this.openModal("panel-relics"));
      this.fillRelics(found);
    }
    item("Cài đặt", "Độ sáng, âm lượng, chuột, phụ đề, đồ họa", () => this.openModal("panel-settings"));
    item("Ghi công", "", () => this.openModal("panel-credits"));
    list.querySelector<HTMLElement>(".menu-item")?.focus({ preventScroll: true });
  }

  /** Danh sách di vật: đã tìm thì đọc lại được, chưa tìm thì chỉ có lời gợi ý chỗ giấu. */
  private fillRelics(found: Set<string>): void {
    const list = $("relic-list");
    list.replaceChildren();
    for (const r of RELICS) {
      const d = document.createElement("details");
      d.className = "relic";
      const sum = document.createElement("summary");
      if (found.has(r.id)) {
        sum.textContent = r.title;
        const body = document.createElement("div");
        body.className = "relic-text";
        body.textContent = r.pages.join("\n\n").replace(/\[\[|\]\]/g, "");
        d.append(sum, body);
      } else {
        sum.textContent = "? ? ?";
        const body = document.createElement("div");
        body.className = "relic-text relic-hint";
        body.textContent = r.hint;
        d.append(sum, body);
      }
      list.appendChild(d);
    }
  }

  /** Màn chuyển chương: số đêm, tên đêm, từng dòng kể hiện dần, rồi mới cho bước vào. */
  showChapter(night: NightInfo, onGo: () => void): void {
    this.closeModal();
    this.start.classList.add("hidden");
    this.menuBg.stop();
    $("chapter-no").textContent = night.title;
    $("chapter-title").textContent = night.subtitle;
    const lines = $("chapter-lines");
    lines.replaceChildren();
    const lineDelay = LINE_DELAY * comfort.textTime;
    night.intro.forEach((text, i) => {
      const p = document.createElement("p");
      p.textContent = text;
      p.style.animationDelay = `${1.4 + i * lineDelay}s`;
      lines.appendChild(p);
    });
    const go = $<HTMLButtonElement>("chapter-go");
    go.disabled = false;
    go.textContent = "Bước vào nhà";
    go.style.animationDelay = `${1.6 + night.intro.length * lineDelay}s`;
    go.onclick = () => {
      this.chapter.classList.add("hidden");
      onGo();
    };
    this.chapter.classList.remove("hidden", "play");
    void this.chapter.offsetWidth;
    this.chapter.classList.add("play");
    go.focus({ preventScroll: true });
  }

  /** Chuyện xảy ra sau cánh cửa ở màn hình chính (để phát âm thanh đúng nhịp hình). */
  onMenuEvent(cb: (e: MenuSceneEvent) => void): void {
    this.menuBg.onEvent = cb;
  }

  /** Dòng nhắc "bấm để nghe" — ẩn khi âm thanh đã bật. */
  setSoundHint(show: boolean): void {
    $("sound-hint").classList.toggle("hidden", !show);
  }

  onPauseMenu(cb: () => void): void {
    $("pause-menu").addEventListener("click", cb);
  }

  onResume(cb: () => void): void {
    $("resume-btn").addEventListener("click", cb);
  }

  hideStart(): void {
    this.start.classList.add("hidden");
    this.menuBg.stop();
  }

  showPause(show: boolean): void {
    this.pause.classList.toggle("hidden", !show);
    if (show) $("resume-btn").focus({ preventScroll: true });
    else this.closeModal();
  }

  /** Bảng cài đặt dùng chung cho màn hình chính và màn tạm dừng. */
  mountSettings(settings: Settings): void {
    const box = $("settings-list");
    for (const key of Object.keys(SETTING_SPECS) as (keyof SettingsValues)[]) {
      const spec = SETTING_SPECS[key];
      const row = document.createElement("div");
      row.className = "setting";
      const name = document.createElement("span");
      name.textContent = spec.label;
      row.appendChild(name);
      if (spec.kind === "range") {
        const input = document.createElement("input");
        input.type = "range";
        input.min = String(spec.min);
        input.max = String(spec.max);
        input.step = String(spec.step);
        input.setAttribute("aria-label", spec.label);
        const value = document.createElement("output");
        input.addEventListener("input", () => settings.set(key, Number(input.value)));
        settings.onChange((v) => {
          input.value = String(v[key]);
          value.textContent = spec.format(v[key]);
        });
        row.append(input, value);
      } else {
        const seg = document.createElement("div");
        seg.className = "seg";
        seg.setAttribute("role", "radiogroup");
        seg.setAttribute("aria-label", spec.label);
        const buttons = spec.options.map((label, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = label;
          b.setAttribute("role", "radio");
          b.addEventListener("click", () => settings.set(key, i));
          seg.appendChild(b);
          return b;
        });
        settings.onChange((v) =>
          buttons.forEach((b, i) => {
            b.classList.toggle("on", v[key] === i);
            b.setAttribute("aria-checked", String(v[key] === i));
          }),
        );
        row.appendChild(seg);
      }
      box.appendChild(row);
    }
    this.mountKeybinds();
  }

  /** Bảng gán phím: mỗi hành động một nút hiện phím đang dùng; bấm nút rồi nhấn phím mới. */
  private mountKeybinds(): void {
    const box = $("keybind-list");
    box.replaceChildren();
    for (const action of ACTIONS) {
      const row = document.createElement("div");
      row.className = "setting keybind";
      const name = document.createElement("span");
      name.textContent = ACTION_LABELS[action];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bind";
      b.textContent = label(action);
      b.setAttribute("aria-label", `${ACTION_LABELS[action]}: ${label(action)}. Bấm để đổi phím.`);
      b.addEventListener("click", () => {
        this.cancelCapture();
        this.capturing = { action, button: b };
        b.classList.add("listening");
        b.textContent = "Nhấn phím…";
      });
      row.append(name, b);
      box.appendChild(row);
    }
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "btn btn-ghost bind-reset";
    reset.textContent = "Phím mặc định";
    reset.addEventListener("click", () => {
      resetBinds();
      this.mountKeybinds();
    });
    box.appendChild(reset);
  }

  private cancelCapture(): void {
    if (!this.capturing) return;
    this.capturing.button.classList.remove("listening");
    this.capturing.button.textContent = label(this.capturing.action);
    this.capturing = undefined;
  }

  private onCaptureKey(e: KeyboardEvent): void {
    if (!this.capturing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code === "Escape") return this.cancelCapture();
    if (!canBind(e.code)) {
      this.capturing.button.textContent = `${keyName(e.code)} không dùng được`;
      return;
    }
    rebind(this.capturing.action, e.code);
    this.capturing = undefined;
    this.mountKeybinds();
  }

  setSubtitleScale(scale: number): void {
    document.documentElement.style.setProperty("--sub-scale", String(scale));
  }

  // ---------------------------------------------------------------- HUD trong game

  /** Việc cần làm hiện tại (sổ tay đọc lại). */
  get objective(): string {
    return this.objectiveEl.classList.contains("hidden") ? "" : this.objectiveEl.querySelector(".obj-text")!.textContent ?? "";
  }

  setObjective(text: string, glitch?: string): void {
    if (glitch && !comfort.calm) {
      // Nửa giây "bị chiếm": hiện câu lạ, chớp, rồi về câu thật.
      this.setObjective(glitch);
      this.uiFlicker();
      window.setTimeout(() => this.setObjective(text), 550);
      return;
    }
    const t = this.objectiveEl.querySelector(".obj-text")!;
    if (t.textContent === text && !this.objectiveEl.classList.contains("hidden")) return;
    t.textContent = text;
    this.objectiveEl.classList.toggle("hidden", !text);
    this.objectiveEl.classList.remove("stale", "fresh");
    void this.objectiveEl.offsetWidth;
    this.objectiveEl.classList.add("fresh");
    window.clearTimeout(this.objectiveTimer);
    this.objectiveTimer = window.setTimeout(() => this.objectiveEl.classList.add("stale"), OBJECTIVE_FADE_AFTER);
  }

  /**
   * Gợi ý tương tác dạng [phím] Hành động. `choice`: một câu đáp lời (vd. trả lời tiếng gọi từ giếng).
   * `keyLabel`: phím hiển thị (mặc định E; nín thở là Space).
   */
  setPrompt(text: string | null, choice = false, keyLabel = label("interact")): void {
    const key = text === null ? null : `${choice ? "c:" : ""}${keyLabel}:${text}`;
    this.crosshair.classList.toggle("on", text !== null && !choice);
    if (key === this.lastPrompt) return;
    this.lastPrompt = key;
    this.prompt.classList.toggle("hidden", text === null);
    this.prompt.classList.toggle("choice", choice);
    if (text) {
      this.promptLabel.textContent = text;
      this.prompt.querySelector(".key")!.textContent = keyLabel;
      // Chạy lại hiệu ứng hiện dần mỗi khi đổi vật.
      this.prompt.style.animation = "none";
      void this.prompt.offsetWidth;
      this.prompt.style.animation = "";
    }
  }

  /**
   * Phụ đề. `glitch`: trong tích tắc hiện một câu "không thể có" rồi mới hiện câu thật —
   * như thể chính dòng chữ bị thứ trong nhà chạm vào. Tắt khi người dùng chọn giảm chuyển động.
   */
  subtitle(text: string, duration: number, voice = false, glitch?: string): void {
    window.clearTimeout(this.glitchTimer);
    const show = (t: string) => {
      this.subtitleEl.textContent = t;
      this.subtitleEl.classList.toggle("voice", voice);
      this.subtitleEl.classList.add("show");
    };
    if (glitch && !comfort.calm) {
      show(glitch);
      this.glitchTimer = window.setTimeout(() => show(text), 260);
    } else {
      show(text);
    }
    window.clearTimeout(this.subtitleTimer);
    this.subtitleTimer = window.setTimeout(() => this.subtitleEl.classList.remove("show"), duration * comfort.textTime * 1000);
  }

  /** HUD chớp tắt một nhịp — chỉ dùng khi đèn chập chờn hay có tiếng gõ. */
  uiFlicker(): void {
    if (comfort.calm) return;
    for (const el of [this.objectiveEl, this.prompt, this.crosshair]) {
      el.classList.remove("ui-flicker");
      void el.offsetWidth;
      el.classList.add("ui-flicker");
    }
  }

  /** Viền tối-đỏ quanh màn hình theo mức nguy hiểm (0..1). */
  setThreat(v: number): void {
    this.vignette.style.setProperty("--threat", v.toFixed(2));
  }

  /** Mở một tờ giấy. `onLateInk`: gọi khi một dòng mực lạ bắt đầu tự viết (để phát âm thanh). */
  openNote(note: Note, onLateInk?: () => void): void {
    this.note = note;
    this.onLateInk = onLateInk;
    this.lateShown.clear();
    this.paper.classList.remove("is-photo");
    this.paper.dataset.paper = note.paper;
    this.readerTitle.textContent = note.title;
    this.readerPhoto.parentElement!.classList.add("hidden");
    $("reader-pager").classList.toggle("hidden", note.pages.length < 2);
    this.reader.classList.remove("hidden");
    this.showPage(0);
  }

  private turnPage(dir: number): void {
    const n = this.note!.pages.length;
    const next = Math.max(0, Math.min(n - 1, this.page + dir));
    if (next === this.page) return;
    this.showPage(next);
    // Lật trang: tờ giấy khẽ xô đi rồi về chỗ.
    this.paper.animate(
      [{ transform: `rotate(-0.6deg) translateX(${dir * -14}px)`, opacity: 0.6 }, { transform: "rotate(-0.6deg)", opacity: 1 }],
      { duration: 260, easing: "ease-out" },
    );
  }

  private showPage(i: number): void {
    const note = this.note!;
    this.page = i;
    window.clearTimeout(this.lateTimer);
    this.readerBody.replaceChildren();
    // Tách "[[...]]" thành span mực lạ, "~~...~~" thành chữ bị gạch; phần còn lại là chữ thường (không dùng innerHTML).
    const parts = note.pages[i].split(/(\[\[.*?\]\]|~~.*?~~)/s);
    const late: HTMLElement[] = [];
    for (const part of parts) {
      if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
        const s = document.createElement("s");
        s.textContent = part.slice(2, -2);
        this.readerBody.appendChild(s);
      } else if (part.startsWith("[[") && part.endsWith("]]")) {
        const span = document.createElement("span");
        span.className = "late";
        span.textContent = part.slice(2, -2);
        if (this.lateShown.has(i)) span.classList.add("written");
        late.push(span);
        this.readerBody.appendChild(span);
      } else {
        this.readerBody.appendChild(document.createTextNode(part));
      }
    }
    $("reader-title").classList.toggle("hidden", i > 0);
    $("reader-page").textContent = note.pages.length > 1 ? `${i + 1} / ${note.pages.length}` : "";
    this.paper.querySelector(".paper-content")!.scrollTop = 0;
    if (late.length && !this.lateShown.has(i)) {
      this.lateTimer = window.setTimeout(() => {
        if (!this.readerOpen || this.page !== i) return;
        this.lateShown.add(i);
        for (const s of late) s.classList.add("written");
        this.onLateInk?.();
      }, LATE_INK_DELAY);
    }
  }

  openPhoto(variant: number, caption: string): void {
    this.note = undefined;
    window.clearTimeout(this.lateTimer);
    this.paper.classList.add("is-photo");
    this.paper.dataset.paper = "";
    $("reader-title").classList.remove("hidden");
    $("reader-page").textContent = "";
    $("reader-pager").classList.add("hidden");
    this.readerTitle.textContent = "Ảnh thờ";
    drawPhoto(this.readerPhoto.getContext("2d")!, this.readerPhoto.width, this.readerPhoto.height, variant);
    this.readerPhoto.parentElement!.classList.remove("hidden");
    this.readerBody.textContent = caption;
    this.reader.classList.remove("hidden");
  }

  closeReader(): void {
    window.clearTimeout(this.lateTimer);
    this.reader.classList.add("hidden");
  }

  /** Đóng mọi lớp đang chiếm điều khiển (tạm dừng, bị bắt, hết đêm). */
  closeOverlays(): void {
    this.closeReader();
    this.closeLock(false);
    this.closeJournal();
  }

  // ---------------------------------------------------------------- khóa số

  openLock(opts: LockOptions): void {
    this.lock = { ...opts, values: Array(opts.digits).fill(0), sel: 0, solved: false };
    $("lock-title").textContent = opts.title;
    $("lock-sub").textContent = opts.sub;
    $("lock-msg").textContent = "";
    this.lockEl.querySelector(".lock")!.classList.remove("open", "shake");
    this.lockEl.classList.remove("hidden");
    this.renderLock();
  }

  private renderLock(): void {
    const l = this.lock!;
    const box = $("lock-dials");
    box.replaceChildren();
    l.values.forEach((v, i) => {
      const d = document.createElement("div");
      d.className = `dial${i === l.sel ? " sel" : ""}`;
      d.setAttribute("aria-label", `Vòng ${i + 1}: ${v}`);
      for (const k of [-1, 0, 1]) {
        const n = document.createElement("span");
        n.className = k === 0 ? "cur" : "side";
        n.textContent = String((v + k + 10) % 10);
        d.appendChild(n);
      }
      d.addEventListener("click", () => {
        l.sel = i;
        this.renderLock();
      });
      box.appendChild(d);
    });
  }

  private turnDial(dir: number): void {
    const l = this.lock!;
    l.values[l.sel] = (l.values[l.sel] + dir + 10) % 10;
    l.onTurn?.();
    this.renderLock();
  }

  private onLockKey(e: KeyboardEvent): void {
    const l = this.lock!;
    if (l.solved || (e.repeat && (isKey("interact", e.code) || e.code === "KeyQ"))) return;
    if (isKey("left", e.code)) l.sel = (l.sel - 1 + l.values.length) % l.values.length;
    else if (isKey("right", e.code)) l.sel = (l.sel + 1) % l.values.length;
    else if (isKey("forward", e.code)) return this.turnDial(1);
    else if (isKey("back", e.code)) return this.turnDial(-1);
    else if (/^(Digit|Numpad)\d$/.test(e.code)) {
      // Gõ số trực tiếp: đặt vòng đang chọn rồi sang vòng kế (hết thì quay về vòng đầu — gõ lại cả mã là được).
      l.values[l.sel] = Number(e.code.slice(-1));
      l.sel = (l.sel + 1) % l.values.length;
      l.onTurn?.();
    } else if (isKey("interact", e.code) || e.code === "Enter") {
      const feedback = l.onTry(l.values.join(""));
      const panel = this.lockEl.querySelector(".lock")!;
      if (feedback === null) {
        l.solved = true;
        panel.classList.add("open");
        $("lock-msg").textContent = "Cạch.";
        window.setTimeout(() => this.closeLock(true), 900);
      } else {
        $("lock-msg").textContent = feedback;
        panel.classList.remove("shake");
        void (panel as HTMLElement).offsetWidth;
        if (!comfort.calm) panel.classList.add("shake");
      }
      return;
    } else if (e.code === "KeyQ" || e.code === "Backspace") {
      return this.closeLock(false);
    } else return;
    this.renderLock();
  }

  private closeLock(solved: boolean): void {
    const l = this.lock;
    if (!l) return;
    this.lock = undefined;
    this.lockEl.classList.add("hidden");
    l.onClose(solved);
  }

  // ---------------------------------------------------------------- sổ tay

  openJournal(view: () => JournalView, onHint: () => void, onClose: () => void, tab = 0): void {
    this.journal = { view, onHint, onClose, tab, sel: 0 };
    this.journalEl.classList.remove("hidden");
    this.renderJournal();
  }

  closeJournal(): void {
    const j = this.journal;
    if (!j) return;
    this.journal = undefined;
    this.journalEl.classList.add("hidden");
    j.onClose();
  }

  private onJournalKey(e: KeyboardEvent): void {
    const j = this.journal!;
    if (e.repeat) return;
    const v = j.view();
    if (isKey("left", e.code)) {
      j.tab = (j.tab + JOURNAL_TABS - 1) % JOURNAL_TABS;
      j.sel = 0;
    } else if (isKey("right", e.code)) {
      j.tab = (j.tab + 1) % JOURNAL_TABS;
      j.sel = 0;
    } else if (isKey("forward", e.code)) j.sel = Math.max(0, j.sel - 1);
    else if (isKey("back", e.code)) j.sel = Math.min(Math.max(0, v.papers.length - 1), j.sel + 1);
    else if (e.code === "KeyH") {
      if (v.hintsLeft > 0) j.onHint();
      j.tab = 0;
    } else if (isKey("interact", e.code)) {
      if (j.tab === 1 && v.papers[j.sel]) {
        const open = v.papers[j.sel].open;
        this.closeJournal();
        open();
      }
      return;
    } else if (isKey("journal", e.code) || e.code === "KeyQ") {
      e.preventDefault();
      return this.closeJournal();
    } else return;
    this.renderJournal();
  }

  private renderJournal(): void {
    const j = this.journal!;
    const v = j.view();
    $("journal-tabs").querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => {
      const on = Number(b.dataset.tab) === j.tab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", String(on));
    });
    const body = $("journal-body");
    body.replaceChildren();
    body.dataset.tab = String(j.tab);
    const el = (tag: string, cls: string, text = "") => {
      const n = document.createElement(tag);
      n.className = cls;
      n.textContent = text;
      return n;
    };

    if (j.tab === 0) {
      body.append(el("p", "j-label", "Việc cần làm"), el("p", "j-objective", v.objective || "Không có gì gấp. Cứ nhìn quanh."));
      const hints = el("div", "j-hints");
      v.hints.forEach((h, i) => hints.appendChild(el("p", "j-hint", `${i + 1}. ${h}`)));
      if (v.hintsLeft > 0) hints.appendChild(el("p", "j-hint-more", `H — xem gợi ý${v.hints.length ? " tiếp" : ""} (còn ${v.hintsLeft})`));
      else if (!v.hints.length) hints.appendChild(el("p", "j-hint-more", "Không có gợi ý cho việc này."));
      body.append(el("p", "j-label", "Gợi ý"), hints, el("p", "j-label", "Mang theo"));
      if (!v.items.length) body.appendChild(el("p", "j-empty", "Không có gì trong túi, ngoài cái điện thoại."));
      for (const it of v.items) {
        const row = el("div", "j-item");
        row.append(el("b", "", it.label), el("span", "", it.note));
        body.appendChild(row);
      }
    } else if (j.tab === 1) {
      if (!v.papers.length) body.appendChild(el("p", "j-empty", "Chưa đọc tờ giấy nào trong đêm nay."));
      v.papers.forEach((p, i) => {
        const row = el("button", `j-paper${i === j.sel ? " sel" : ""}`, p.title);
        row.addEventListener("click", () => {
          this.closeJournal();
          p.open();
        });
        body.appendChild(row);
      });
    } else {
      const phone = el("div", "phone");
      phone.appendChild(el("p", "phone-head", v.group));
      const thread = el("div", "phone-thread");
      let last = "";
      for (const m of v.messages) {
        const b = el("div", `bubble${m.self ? " self" : ""}${m.eerie ? " eerie" : ""}`);
        if (!m.self && m.from !== last) b.appendChild(el("b", "bubble-from", m.from));
        b.appendChild(el("span", "", m.text));
        thread.appendChild(b);
        last = m.self ? "" : m.from;
      }
      phone.appendChild(thread);
      body.appendChild(phone);
      thread.scrollTop = thread.scrollHeight;
    }
  }

  // ---------------------------------------------------------------- thông báo

  /** Thông báo tin nhắn góc màn hình (Zalo). `system`: thông báo của trò chơi (tắt tiếng…) — không giả làm tin nhắn. */
  toast(from: string, text: string, eerie = false, system = false): void {
    this.toastEl.querySelector(".toast-app")!.textContent = system ? "VONG ÂM" : "Zalo · bây giờ";
    this.toastEl.querySelector(".toast-from")!.textContent = from;
    this.toastEl.querySelector(".toast-text")!.textContent = text;
    this.toastEl.classList.toggle("eerie", eerie);
    this.toastEl.classList.toggle("system", system);
    this.toastEl.classList.remove("hidden", "out");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add("out"), TOAST_TIME * comfort.textTime);
  }

  /** Cảnh báo nội dung — chỉ hiện một lần trước lần chơi đầu tiên. */
  showWarning(onOk: () => void): void {
    const w = $("warning");
    w.classList.remove("hidden");
    $("warning-settings").onclick = () => this.openModal("panel-settings");
    $("warning-ok").onclick = () => {
      w.classList.add("hidden");
      onOk();
    };
    $("warning-ok").focus({ preventScroll: true });
  }

  /** `kind`: khung nhìn khi trốn — khe tủ, khe nắp hòm, dưới khăn bàn thờ, đang được bế (xem style.css). */
  setHiding(on: boolean, kind = "wardrobe"): void {
    this.hideOverlay.classList.toggle("hidden", !on);
    this.hideOverlay.dataset.kind = kind;
    this.crosshair.classList.toggle("hidden", on);
  }

  // ---------------------------------------------------------------- kết thúc

  /** Biểu mẫu chơi thử ở màn hình kết thúc: tóm tắt, 3 câu hỏi, nút tải nhật ký. */
  setupPlaytest(summary: string, onDownload: (a: PlaytestAnswers) => void): void {
    $("pt-summary").textContent = summary;
    const fearBox = $("pt-fear");
    fearBox.replaceChildren();
    let fear: number | null = null;
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = String(i);
      b.addEventListener("click", () => {
        fear = i;
        for (const c of fearBox.children) c.classList.toggle("on", c === b);
      });
      fearBox.appendChild(b);
    }
    $("pt-download").onclick = () =>
      onDownload({
        fear,
        scariest: $<HTMLTextAreaElement>("pt-scariest").value.trim(),
        boring: $<HTMLTextAreaElement>("pt-boring").value.trim(),
      });
  }

  /** Màn kết thúc: tiêu đề hiện ra, lời kết từng dòng, rồi mới tới các nút. */
  showEnding(kicker: string, title: string, text: string, actions: EndingAction[]): void {
    this.setPrompt(null);
    this.setObjective("");
    this.setThreat(0);
    this.crosshair.classList.add("hidden");
    this.subtitleEl.classList.remove("show");
    $("ending-kicker").textContent = kicker;
    $("ending-title").textContent = title;
    const body = $("ending-text");
    body.replaceChildren();
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const p = document.createElement("p");
      p.textContent = line || " ";
      p.style.animationDelay = `${1.2 + i * 1.1 * comfort.textTime}s`;
      body.appendChild(p);
    });
    const box = $("ending-actions");
    box.replaceChildren();
    box.style.animationDelay = `${1.6 + lines.length * 1.1 * comfort.textTime}s`;
    for (const a of actions) {
      const b = document.createElement("button");
      b.className = a.primary ? "btn btn-primary" : "btn btn-ghost";
      b.textContent = a.label;
      b.addEventListener("click", a.onClick);
      box.appendChild(b);
    }
    this.ending.classList.remove("hidden", "play");
    void this.ending.offsetWidth;
    this.ending.classList.add("play");
    box.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }
}
