import type { Action, Condition, DirectorContext, HorrorEvent } from "./types";

interface Sequence {
  actions: Action[];
  index: number;
  wait: number;
}

/**
 * Horror Director: nắm cờ tiến trình và mức căng thẳng, quyết định KHI NÀO sự kiện kinh dị xảy ra.
 * Thực thể và thế giới chỉ thực hiện những gì Director ra lệnh qua DirectorContext.
 */
export class HorrorDirector {
  tension = 0;
  private readonly flags = new Set<string>();
  private readonly fired = new Set<string>();
  private readonly readySince = new Map<string, number>();
  private running: Sequence[] = [];
  private time = 0;
  /** Gọi mỗi khi bật cờ mới hoặc kích hoạt sự kiện — dùng cho nhật ký chơi thử. */
  onLog?: (kind: "flag" | "event", name: string) => void;

  constructor(
    private readonly events: HorrorEvent[],
    private readonly ctx: DirectorContext,
  ) {}

  has(flag: string): boolean {
    return this.flags.has(flag);
  }

  set(flag: string): void {
    if (!this.flags.has(flag)) {
      this.flags.add(flag);
      this.onLog?.("flag", flag);
      if (import.meta.env.DEV) console.debug(`[director] flag: ${flag}`);
    }
  }

  update(dt: number): void {
    this.time += dt;

    for (const ev of this.events) {
      if (this.fired.has(ev.id)) continue;
      if (!this.flagsMatch(ev.when)) {
        this.readySince.delete(ev.id);
        continue;
      }
      if (!this.readySince.has(ev.id)) this.readySince.set(ev.id, this.time);
      if (this.time - this.readySince.get(ev.id)! < (ev.when.delay ?? 0)) continue;
      if (ev.when.hidden && this.ctx.isVisible(ev.when.hidden)) continue;
      if (ev.when.look && !this.ctx.isLookedAt(ev.when.look)) continue;
      if (ev.when.visible && !this.ctx.isVisible(ev.when.visible)) continue;
      if (ev.when.near && !this.ctx.isNear(ev.when.near, ev.when.nearRadius ?? 3)) continue;
      if (ev.when.floor !== undefined && this.ctx.playerFloor() !== ev.when.floor) continue;

      this.fired.add(ev.id);
      this.onLog?.("event", ev.id);
      if (import.meta.env.DEV) console.debug(`[director] event: ${ev.id}`);
      this.running.push({ actions: ev.actions, index: 0, wait: 0 });
    }

    for (const seq of this.running) this.step(seq, dt);
    this.running = this.running.filter((s) => s.index < s.actions.length || s.wait > 0);
  }

  private flagsMatch(c: Condition): boolean {
    return (c.all ?? []).every((f) => this.flags.has(f)) && !(c.none ?? []).some((f) => this.flags.has(f));
  }

  private step(seq: Sequence, dt: number): void {
    if (seq.wait > 0) {
      seq.wait -= dt;
      if (seq.wait > 0) return;
    }
    while (seq.index < seq.actions.length) {
      const action = seq.actions[seq.index++];
      if (action.type === "wait") {
        seq.wait = action.seconds;
        return;
      }
      this.run(action);
    }
  }

  private run(a: Exclude<Action, { type: "wait" }>): void {
    switch (a.type) {
      case "subtitle":
        this.ctx.subtitle(a.text, a.duration ?? 4, a.voice ?? false, a.glitch);
        break;
      case "setFlag":
        this.set(a.flag);
        break;
      case "sound":
        this.ctx.playSound(a.sound, a.at);
        break;
      case "photo":
        this.ctx.setPhoto(a.variant);
        break;
      case "lights":
        this.ctx.setLights(a.state);
        break;
      case "entity":
        this.ctx.entity(a.do, a.at);
        break;
      case "objective":
        this.ctx.objective(a.text, a.glitch, a.hints);
        break;
      case "message":
        this.ctx.message(a.from, a.text, a.eerie);
        break;
      case "hush":
        this.ctx.hush(a.seconds);
        break;
      case "beat":
        this.ctx.beat(a.name);
        break;
      case "door":
        this.ctx.door(a.door, a.open);
        break;
      case "show":
        this.ctx.show(a.target, a.visible);
        break;
      case "scarecrows":
        this.ctx.scarecrowRage(a.seconds);
        break;
      case "choice":
        this.ctx.choice(a.text, a.flag, a.seconds);
        break;
      case "footstepsBehind":
        this.ctx.footstepsBehind();
        break;
      case "tv":
        this.ctx.tv(a.state);
        break;
      case "effigies":
        this.ctx.effigies(a.do);
        break;
      case "tension":
        this.tension = Math.min(1, Math.max(0, this.tension + a.add));
        break;
      case "ending":
        this.ctx.end(a.title, a.text, a.next, a.final);
        break;
    }
  }
}
