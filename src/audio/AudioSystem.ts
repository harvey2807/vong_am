import type { Vector3 } from "../babylon";
import type { SoundId } from "../director/types";

/** Mặt đất dưới chân — quyết định tiếng bước. */
export type Surface = "tile" | "concrete" | "mud" | "dirt" | "water" | "wood" | "paper";

/**
 * Toàn bộ âm thanh của prototype được tổng hợp bằng Web Audio, không cần file asset.
 * Khi có âm thanh thật (ghi âm giọng nói, foley), thay các hàm tổng hợp bằng AudioBuffer đã tải.
 *
 * Babylon dùng hệ tọa độ tay trái, Web Audio dùng tay phải → mọi trục z đều bị đảo dấu.
 */
export class AudioSystem {
  private ctx?: AudioContext;
  private master!: GainNode;
  /** Kênh nhạc nền & không khí: tiếng ù căn nhà, drone, lớp căng thẳng, mưa, nhiễu TV. */
  private music!: GainNode;
  /** Kênh hiệu ứng: mọi âm phát một lần (gõ cửa, bước chân, thì thầm, cót két...). */
  private sfx!: GainNode;
  private musicVolume = 1;
  private sfxVolume = 1;
  private noise!: AudioBuffer;
  private droneGain!: GainNode;
  private tensionGain!: GainNode;
  private staticLoop?: { src: AudioBufferSourceNode; out: AudioNode };
  private rainFilter?: BiquadFilterNode;
  private rainGain?: GainNode;
  private volume = 0.9;
  private muted = false;

  /** Phải gọi trong một thao tác của người dùng (click) vì trình duyệt chặn âm thanh tự phát. */
  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicVolume;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxVolume;
    this.sfx.connect(this.master);
    this.noise = this.makeNoise(2, false);
    this.startAmbient();
    // Tab bị ẩn (chuyển tab, thu nhỏ): ngắt hẳn âm thanh thay vì để drone kêu sau lưng người chơi.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }

  updateListener(pos: Vector3, forward: Vector3): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setValueAtTime(pos.x, t);
      l.positionY.setValueAtTime(pos.y, t);
      l.positionZ.setValueAtTime(-pos.z, t);
      l.forwardX.setValueAtTime(forward.x, t);
      l.forwardY.setValueAtTime(forward.y, t);
      l.forwardZ.setValueAtTime(-forward.z, t);
      l.upX.setValueAtTime(0, t);
      l.upY.setValueAtTime(1, t);
      l.upZ.setValueAtTime(0, t);
    } else {
      l.setPosition(pos.x, pos.y, -pos.z);
      l.setOrientation(forward.x, forward.y, -forward.z, 0, 1, 0);
    }
  }

  /** Phát âm thanh; có `pos` thì là âm thanh 3D định hướng. */
  play(id: SoundId, pos?: Vector3): void {
    if (!this.ctx) return;
    const out = pos ? this.panner(pos) : this.sfx;
    const t = this.ctx.currentTime + 0.01;
    switch (id) {
      case "knock": return this.knock(out, t);
      case "whisper": return this.whisper(out, t, 2.6);
      case "sting": return this.sting(out, t);
      case "creak": return this.creak(out, t);
      case "rattle": return this.rattle(out, t);
      case "click": return this.click(out, t);
      case "step": return this.step(out, t);
      case "heavyStep": return this.heavyStep(out, t);
      case "breath": return this.breath(out, t);
      case "shriek": return this.shriek(out, t);
      case "dig": return this.dig(out, t);
      case "splash": return this.splash(out, t);
      case "static": return this.burst(out, t, 0.6);
      case "rustle": return this.rustle(out, t);
      case "whoosh": return this.whoosh(out, t);
      case "thunder": return this.thunder(out, t);
      case "gecko": return this.gecko(out, t);
      case "dog": return this.dogHowl(out, t);
      case "motorbike": return this.motorbike(t, pos);
      case "buzz": return this.buzz(out, t);
      case "unlock": return this.unlock(out, t);
      case "tick": return this.clickAt(out, t, 3200, 0.22);
    }
  }

  /** Tiếng bước chân của người chơi theo mặt đất. */
  footstep(surface: Surface, pos?: Vector3): void {
    if (!this.ctx) return;
    const out = pos ? this.panner(pos) : this.sfx;
    const t = this.ctx.currentTime + 0.01;
    switch (surface) {
      case "tile":
        // Gạch bông: gót chạm gạch nghe gọn, có chút "tách" cao.
        this.step(out, t, 520, 0.45);
        this.clickAt(out, t + 0.005, 2600 + Math.random() * 600, 0.05);
        return;
      case "concrete":
        // Xi măng ướt: bước + tiếng nước bắn nhỏ.
        this.step(out, t, 420, 0.45);
        this.burstAt(out, t + 0.02, 0.12, 2800, 0.25);
        return;
      case "mud":
        // Bùn: trầm, nhão, rút chân ra kêu "chẹp".
        this.step(out, t, 220, 0.6);
        this.burstAt(out, t + 0.11, 0.09, 700, 0.35);
        return;
      case "dirt":
        this.step(out, t, 340, 0.45);
        this.burstAt(out, t + 0.01, 0.08, 1600, 0.18);
        return;
      case "water":
        this.splash(out, t);
        return;
      case "wood":
        // Ván gỗ gác: tiếng rỗng, trầm; thỉnh thoảng một tấm ván kêu cót két dưới chân.
        this.step(out, t, 360, 0.55);
        this.clickAt(out, t + 0.01, 700 + Math.random() * 200, 0.12);
        if (Math.random() < 0.18) this.boardCreak(out, t + 0.05);
        return;
      case "paper":
        // Không có tiếng gót chạm đất — chỉ giấy cọ vào giấy.
        this.burstAt(out, t, 0.12, 4200, 0.1);
        this.burstAt(out, t + 0.06, 0.09, 5400, 0.07);
        return;
    }
  }

  /** Một tấm ván cũ võng xuống: tiếng kẽo kẹt ngắn, cao độ ngẫu nhiên. */
  private boardCreak(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    const f = 190 + Math.random() * 120;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (1.2 + Math.random() * 0.4), t + 0.25);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 5;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.04, 0.18, 0.3);
    o.connect(bp).connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Tắt/bật tiếng nhanh (phím M) — không đổi mức âm lượng đã chỉnh. */
  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.03);
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.ctx) this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
    if (this.ctx) this.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Tiếng dế đồng quê: nhiễu cao lọc hẹp, ngắt nhịp bởi một LFO — chạy trên kênh nhạc nền. */
  startCrickets(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 4600;
    bp.Q.value = 14;
    const chirp = ctx.createGain();
    chirp.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 18;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(chirp.gain);
    // Nhịp kêu – ngừng chậm hơn chồng lên để nghe như cả cánh đồng.
    const slow = ctx.createOscillator();
    slow.frequency.value = 0.6;
    const slowDepth = ctx.createGain();
    slowDepth.gain.value = 0.35;
    slow.connect(slowDepth).connect(chirp.gain);
    const out = ctx.createGain();
    out.gain.value = 0.5;
    src.connect(bp).connect(chirp).connect(out).connect(this.music);
    src.start();
    lfo.start();
    slow.start();
  }

  /** Tắt dần tiếng mưa (vào đêm không mưa sau khi nghe mưa ở màn hình chính). */
  stopRain(): void {
    if (this.ctx && this.rainGain) this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
  }

  /** Nhiễu TV lặp liên tục tại `pos`; null để tắt. */
  setStatic(pos: Vector3 | null): void {
    if (!this.ctx) return;
    if (this.staticLoop) {
      this.staticLoop.src.stop();
      this.staticLoop.out.disconnect();
      this.staticLoop = undefined;
    }
    if (!pos) return;
    const src = this.noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3000;
    bp.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    const out = this.panner(pos, this.music);
    src.connect(bp).connect(g).connect(out);
    src.start();
    this.staticLoop = { src, out };
  }

  /** Mưa: bật một lần; `outdoor` quyết định nghe trong trẻo (ngoài vườn) hay đục (trong nhà). */
  setRain(outdoor: boolean): void {
    if (!this.ctx) return;
    if (!this.rainGain) {
      const src = this.noiseSource();
      this.rainFilter = this.ctx.createBiquadFilter();
      this.rainFilter.type = "lowpass";
      this.rainGain = this.ctx.createGain();
      src.connect(this.rainFilter).connect(this.rainGain).connect(this.music);
      src.start();
    }
    const now = this.ctx.currentTime;
    this.rainFilter!.frequency.setTargetAtTime(outdoor ? 6000 : 700, now, 0.4);
    this.rainGain.gain.setTargetAtTime(outdoor ? 0.16 : 0.1, now, 0.4);
  }

  setTension(t: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(0.05 + 0.05 * t, now, 1.5);
    this.tensionGain.gain.setTargetAtTime(0.045 * t, now, 2);
  }

  // ---------------------------------------------------------------- nền

  private startAmbient(): void {
    const ctx = this.ctx!;
    // Tiếng ù nền của căn nhà: nhiễu nâu lọc thấp.
    const brown = ctx.createBufferSource();
    brown.buffer = this.makeNoise(4, true);
    brown.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.22;
    brown.connect(lp).connect(roomGain).connect(this.music);
    brown.start();

    // Drone lệch tần số nhẹ tạo cảm giác "rung" bất an.
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.05;
    this.droneGain.connect(this.music);
    for (const f of [46, 46.7]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(this.droneGain);
      o.start();
    }

    // Lớp căng thẳng, tăng theo tension của Director.
    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0;
    this.tensionGain.connect(this.music);
    for (const [f, type] of [[92.5, "triangle"], [138.6, "sine"], [139.4, "sine"]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(this.tensionGain);
      o.start();
    }
  }

  // ---------------------------------------------------------------- hiệu ứng

  private knock(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 520;
    lp.Q.value = 2;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.004, 1.6, 0.16);
    src.connect(lp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.25);

    const body = ctx.createOscillator();
    body.frequency.setValueAtTime(95, t);
    body.frequency.exponentialRampToValueAtTime(55, t + 0.2);
    const bg = ctx.createGain();
    this.envelope(bg.gain, t, 0.003, 1.2, 0.22);
    body.connect(bg).connect(out);
    body.start(t);
    body.stop(t + 0.3);
  }

  /** "Giọng thì thầm": nhiễu qua hai bộ lọc formant, biên độ ngắt theo nhịp âm tiết. */
  private whisper(out: AudioNode, t: number, duration: number): void {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    let s = t;
    while (s < t + duration) {
      const len = 0.12 + Math.random() * 0.18;
      env.gain.linearRampToValueAtTime(0.6 + Math.random() * 0.5, s + len * 0.3);
      env.gain.linearRampToValueAtTime(0.04, s + len);
      s += len + Math.random() * 0.06;
    }
    env.gain.linearRampToValueAtTime(0, s + 0.1);
    const master = ctx.createGain();
    master.gain.value = 2.2;
    env.connect(master).connect(out);

    for (const [freq, q, gain] of [[1900, 0.9, 1], [650, 3, 0.6]]) {
      const src = this.noiseSource();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(bp).connect(g).connect(env);
      src.start(t, Math.random());
      src.stop(s + 0.2);
    }
  }

  private sting(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + 0.12);
    lp.frequency.exponentialRampToValueAtTime(400, t + 2.5);
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.04, 0.32, 3.5);
    lp.connect(g).connect(out);
    for (const f of [98, 103.8, 146.8, 207.6, 293.7]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(lp);
      o.start(t);
      o.stop(t + 4);
    }
  }

  private creak(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(140, t);
    o.frequency.linearRampToValueAtTime(230, t + 0.5);
    o.frequency.linearRampToValueAtTime(170, t + 0.9);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 28;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 25;
    lfo.connect(lfoGain).connect(o.frequency);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 4;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.1, 0.35, 0.9);
    o.connect(bp).connect(g).connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.1);
    lfo.stop(t + 1.1);
  }

  private rattle(out: AudioNode, t: number): void {
    for (let i = 0; i < 4; i++) this.clickAt(out, t + i * 0.07 + Math.random() * 0.02, 1400, 0.35);
  }

  private click(out: AudioNode, t: number): void {
    this.clickAt(out, t, 2200, 0.15);
  }

  private clickAt(out: AudioNode, t: number, freq: number, level: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 6;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.002, level * 3, 0.04);
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.08);
  }

  private step(out: AudioNode, t: number, cutoff = 280, level = 0.5): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff + Math.random() * 120;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.01, level + Math.random() * 0.2, 0.1);
    src.connect(lp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.15);
  }

  /** Bước chân thực thể: nặng, trầm, như dồn cả sức nặng lên sàn gỗ. */
  private heavyStep(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 170 + Math.random() * 60;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.012, 2.4, 0.22);
    src.connect(lp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 0.3);

    const thud = ctx.createOscillator();
    thud.frequency.setValueAtTime(70, t);
    thud.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const tg = ctx.createGain();
    this.envelope(tg.gain, t, 0.006, 1.4, 0.2);
    thud.connect(tg).connect(out);
    thud.start(t);
    thud.stop(t + 0.3);
  }

  /** Tiếng thở chậm, khò khè, ngay sát cửa tủ: hai lần hít — thở. */
  private breath(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 520;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    let s = t;
    for (let i = 0; i < 2; i++) {
      g.gain.linearRampToValueAtTime(0.9, s + 0.9);
      g.gain.linearRampToValueAtTime(0.05, s + 1.3);
      g.gain.linearRampToValueAtTime(1.3, s + 1.7);
      g.gain.linearRampToValueAtTime(0, s + 2.6);
      s += 2.9;
    }
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(s);
  }

  /** Jumpscare: chùm sawtooth trượt cao độ + nhiễu gắt. Cố ý to hơn mọi âm khác. */
  private shriek(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.01, 0.55, 1.4);
    g.connect(out);
    for (const f of [420, 447, 610, 880]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f * 0.6, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 1.4);
      o.connect(g);
      o.start(t);
      o.stop(t + 1.5);
    }
    const src = this.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const ng = ctx.createGain();
    this.envelope(ng.gain, t, 0.005, 1.2, 0.9);
    src.connect(hp).connect(ng).connect(out);
    src.start(t, Math.random());
    src.stop(t + 1.2);
  }

  /** Giấy sột soạt: nhiễu cao, rời rạc — hình nhân đang dịch chuyển. */
  private rustle(out: AudioNode, t: number): void {
    for (let i = 0; i < 3; i++) this.clickAt(out, t + i * 0.05 + Math.random() * 0.03, 3500 + Math.random() * 2000, 0.25);
  }

  /** Lửa bùng: nhiễu trầm phồng lên rồi tắt dần. */
  private whoosh(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + 0.4);
    lp.frequency.exponentialRampToValueAtTime(300, t + 3);
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.3, 1.6, 3);
    src.connect(lp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 3.5);
  }

  private dig(out: AudioNode, t: number): void {
    for (let i = 0; i < 3; i++) this.burst(out, t + i * 0.35, 0.25);
  }

  /** Vật rơi xuống nước sâu: tiếng "tõm" trầm + bọt. */
  private splash(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.15);
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.005, 0.8, 0.25);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
    this.burst(out, t + 0.02, 0.5);
  }

  /** Sấm xa: tiếng nổ trầm rồi rền kéo dài, lọc thấp như vọng qua mưa. */
  private thunder(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1.1, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.6);
    g.gain.linearRampToValueAtTime(0.7, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    src.connect(lp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + 5.2);
  }

  /** Một xung nhiễu lọc dải giữa — đất, nhiễu sóng, nước bắn. */
  private burst(out: AudioNode, t: number, length: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900 + Math.random() * 600;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.01, 0.9, length);
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + length + 0.05);
  }

  /**
   * Thạch sùng chặc lưỡi: một chuỗi "tắc tắc tắc" khô, cao, thưa dần.
   * Người Việt tin thạch sùng kêu đúng lúc ai đó vừa nói là điềm — chuyện vừa nói là thật.
   */
  private gecko(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const n = 4 + Math.floor(Math.random() * 4);
    let s = t;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      o.type = "square";
      const f = 2300 + Math.random() * 300 - i * 40;
      o.frequency.setValueAtTime(f, s);
      o.frequency.exponentialRampToValueAtTime(f * 0.7, s + 0.03);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2600;
      bp.Q.value = 3;
      const g = ctx.createGain();
      this.envelope(g.gain, s, 0.002, 0.22, 0.035);
      o.connect(bp).connect(g).connect(out);
      o.start(s);
      o.stop(s + 0.06);
      // Hai tiếng đầu sát nhau, sau đó thưa dần.
      s += 0.11 + i * 0.018 + Math.random() * 0.02;
    }
  }

  /** Chó tru xa: tiếng hú trượt cao độ, rung nhẹ, lọc thấp như vọng qua mấy dãy nhà. */
  private dogHowl(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const len = 2.2 + Math.random() * 1.2;
    const base = 420 + Math.random() * 80;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(base * 0.8, t);
    o.frequency.linearRampToValueAtTime(base * 1.35, t + 0.5);
    o.frequency.linearRampToValueAtTime(base * 1.2, t + len * 0.7);
    o.frequency.exponentialRampToValueAtTime(base * 0.7, t + len);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vibDepth = ctx.createGain();
    vibDepth.gain.value = 9;
    vib.connect(vibDepth).connect(o.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.4);
    g.gain.linearRampToValueAtTime(0.12, t + len * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(g).connect(out);
    o.start(t);
    vib.start(t);
    o.stop(t + len + 0.05);
    vib.stop(t + len + 0.05);
  }

  /**
   * Xe máy chạy ngang ngoài đường: máy hai thì rè rè, to dần rồi nhỏ dần, cao độ tụt khi đi qua (Doppler).
   * Nguồn âm tự chạy ngang trục x, qua điểm `pos`. Đi trên kênh nhạc nền — là tiếng sống, không phải hiệu ứng.
   */
  private motorbike(t: number, pos?: Vector3): void {
    const ctx = this.ctx!;
    const len = 5.5;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const p = ctx.createPanner();
    p.panningModel = "HRTF";
    p.distanceModel = "inverse";
    p.refDistance = 3;
    p.rolloffFactor = 1;
    p.positionX.setValueAtTime((pos?.x ?? 0) - dir * 35, t);
    p.positionX.linearRampToValueAtTime((pos?.x ?? 0) + dir * 35, t + len);
    p.positionY.value = 0.8;
    p.positionZ.value = -(pos?.z ?? 0);
    p.connect(this.music);

    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(96, t);
    o.frequency.setValueAtTime(96, t + len * 0.45);
    o.frequency.linearRampToValueAtTime(78, t + len * 0.6);
    // Nhịp nổ của máy: biên độ bị một sóng vuông ~32 Hz ngắt quãng.
    const am = ctx.createOscillator();
    am.type = "square";
    am.frequency.value = 32;
    const amDepth = ctx.createGain();
    amDepth.gain.value = 0.4;
    const engine = ctx.createGain();
    engine.gain.value = 0.6;
    am.connect(amDepth).connect(engine.gain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + len * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(engine).connect(lp).connect(g).connect(p);
    o.start(t);
    am.start(t);
    o.stop(t + len);
    am.stop(t + len);
  }

  /** Điện thoại rung trong túi: hai nhịp ù ù trầm. */
  private buzz(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    for (const s of [t, t + 0.42]) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 148;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, s);
      g.gain.linearRampToValueAtTime(0.18, s + 0.02);
      g.gain.setValueAtTime(0.18, s + 0.24);
      g.gain.linearRampToValueAtTime(0.0001, s + 0.28);
      o.connect(lp).connect(g).connect(out);
      o.start(s);
      o.stop(s + 0.3);
    }
  }

  /** Khóa bật: một tiếng "cạch" kim loại dày, rồi nắp hộp thiếc kêu "bộp". */
  private unlock(out: AudioNode, t: number): void {
    const ctx = this.ctx!;
    this.clickAt(out, t, 1800, 0.6);
    this.clickAt(out, t + 0.03, 900, 0.5);
    this.burstAt(out, t + 0.35, 0.18, 1200, 0.5);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(680, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.6);
    const g = ctx.createGain();
    this.envelope(g.gain, t + 0.35, 0.004, 0.12, 0.4);
    o.connect(g).connect(out);
    o.start(t + 0.35);
    o.stop(t + 0.8);
  }

  /** Xung nhiễu lọc dải ở tần số chọn sẵn. */
  private burstAt(out: AudioNode, t: number, length: number, freq: number, level: number): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq * (0.85 + Math.random() * 0.3);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    this.envelope(g.gain, t, 0.006, level, length);
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + length + 0.05);
  }

  // ---------------------------------------------------------------- tiện ích

  private panner(pos: Vector3, bus?: AudioNode): PannerNode {
    const ctx = this.ctx!;
    const p = ctx.createPanner();
    p.panningModel = "HRTF";
    p.distanceModel = "inverse";
    p.refDistance = 1;
    p.rolloffFactor = 1.1;
    p.positionX.value = pos.x;
    p.positionY.value = pos.y;
    p.positionZ.value = -pos.z;
    p.connect(bus ?? this.sfx);
    return p;
  }

  private noiseSource(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  private envelope(param: AudioParam, t: number, attack: number, peak: number, decay: number): void {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private makeNoise(seconds: number, brown: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buf;
  }
}
