import { drawPhoto } from "../world/textures";
import { SETTING_SPECS, type Settings, type SettingsValues } from "../core/Settings";
import type { PlaytestAnswers } from "../core/Playtest";
import { MenuBackground, type MenuSceneEvent } from "./MenuBackground";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

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
const MODALS = ["panel-settings", "panel-credits", "panel-memories"];
/** Thứ tự từ trên xuống: màn nào đang hiện và nằm trên cùng thì nhận phím mũi tên. */
const SCREENS = [...MODALS, "pause", "start", "chapter", "ending"];

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
    window.addEventListener("keydown", (e) => this.onKey(e));
    this.setupFullscreen();
  }

  get readerOpen(): boolean {
    return !this.reader.classList.contains("hidden");
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
    if (this.readerOpen && this.note && this.note.pages.length > 1) {
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.turnPage(-1);
      else if (e.code === "KeyD" || e.code === "ArrowRight") this.turnPage(1);
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
    item("Cài đặt", "Độ sáng, âm lượng, chuột, phụ đề, đồ họa", () => this.openModal("panel-settings"));
    item("Ghi công", "", () => this.openModal("panel-credits"));
    list.querySelector<HTMLElement>(".menu-item")?.focus({ preventScroll: true });
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
    night.intro.forEach((text, i) => {
      const p = document.createElement("p");
      p.textContent = text;
      p.style.animationDelay = `${1.4 + i * LINE_DELAY}s`;
      lines.appendChild(p);
    });
    const go = $<HTMLButtonElement>("chapter-go");
    go.disabled = false;
    go.textContent = "Bước vào nhà";
    go.style.animationDelay = `${1.6 + night.intro.length * LINE_DELAY}s`;
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
  }

  setSubtitleScale(scale: number): void {
    document.documentElement.style.setProperty("--sub-scale", String(scale));
  }

  // ---------------------------------------------------------------- HUD trong game

  setObjective(text: string, glitch?: string): void {
    if (glitch && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
  setPrompt(text: string | null, choice = false, keyLabel = "E"): void {
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
    if (glitch && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show(glitch);
      this.glitchTimer = window.setTimeout(() => show(text), 260);
    } else {
      show(text);
    }
    window.clearTimeout(this.subtitleTimer);
    this.subtitleTimer = window.setTimeout(() => this.subtitleEl.classList.remove("show"), duration * 1000);
  }

  /** HUD chớp tắt một nhịp — chỉ dùng khi đèn chập chờn hay có tiếng gõ. */
  uiFlicker(): void {
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
    // Tách "[[...]]" thành span mực lạ; phần còn lại là chữ thường (không dùng innerHTML).
    const parts = note.pages[i].split(/(\[\[.*?\]\])/s);
    const late: HTMLElement[] = [];
    for (const part of parts) {
      if (part.startsWith("[[") && part.endsWith("]]")) {
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

  /** Khung nhìn qua khe cửa tủ khi trốn. */
  setHiding(on: boolean): void {
    this.hideOverlay.classList.toggle("hidden", !on);
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
      p.style.animationDelay = `${1.2 + i * 1.1}s`;
      body.appendChild(p);
    });
    const box = $("ending-actions");
    box.replaceChildren();
    box.style.animationDelay = `${1.6 + lines.length * 1.1}s`;
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
