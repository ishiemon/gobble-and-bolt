// Pure WebAudio synthesizer for Gobble and Bolt!: zero external audio files or network calls.
// Every method safely no-ops if WebAudio is unavailable or muted.

/** Create a self-contained WebAudio sound effect and jingle player. */
export function createAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext || null;
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;

  function ensureContext() {
    if (muted || !AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
        noiseBuffer = createNoiseBuffer(ctx);
      } catch {
        ctx = null;
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function createNoiseBuffer(context) {
    const length = context.sampleRate * 0.6;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function tone({ type = 'triangle', freqStart, freqEnd, duration, gain = 0.25, delay = 0 }) {
    const c = ensureContext();
    if (!c || !master) return;
    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== undefined && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + Math.min(0.02, duration * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noiseBurst({ duration, filterFreq = 1200, filterType = 'bandpass', gain = 0.2, delay = 0 }) {
    const c = ensureContext();
    if (!c || !master || !noiseBuffer) return;
    const now = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    const env = c.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  /** Unlock audio context on first user gesture. */
  function unlock() {
    ensureContext();
  }

  function setMuted(flag) {
    muted = Boolean(flag);
    if (master && ctx) {
      master.gain.setValueAtTime(muted ? 0 : 0.35, ctx.currentTime);
    }
  }

  function isMuted() {
    return muted;
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  /** Turkey gobble using rapid pitch-wobbled bursts. */
  function playGobble() {
    const c = ensureContext();
    if (!c || !master) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const filter = c.createBiquadFilter();
    const env = c.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.linearRampToValueAtTime(430, now + 0.08);
    osc.frequency.linearRampToValueAtTime(280, now + 0.32);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(24, now);
    lfoGain.gain.setValueAtTime(85, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(920, now);
    filter.Q.setValueAtTime(3.2, now);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.28, now + 0.03);
    env.gain.setValueAtTime(0.24, now + 0.2);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(filter);
    filter.connect(env);
    env.connect(master);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.38);
    lfo.stop(now + 0.38);
  }

  function playJump() {
    tone({ type: 'triangle', freqStart: 240, freqEnd: 560, duration: 0.14, gain: 0.25 });
    noiseBurst({ duration: 0.08, filterFreq: 1800, filterType: 'highpass', gain: 0.08 });
  }

  function playFlutter() {
    noiseBurst({ duration: 0.06, filterFreq: 1100, filterType: 'bandpass', gain: 0.09 });
  }

  function playCorn() {
    tone({ type: 'sine', freqStart: 587, freqEnd: 659, duration: 0.09, gain: 0.22 });
    tone({ type: 'triangle', freqStart: 880, freqEnd: 1175, duration: 0.13, gain: 0.18, delay: 0.05 });
  }

  function playNearMiss() {
    noiseBurst({ duration: 0.11, filterFreq: 2400, filterType: 'bandpass', gain: 0.12 });
    tone({ type: 'sine', freqStart: 988, freqEnd: 1318, duration: 0.14, gain: 0.18, delay: 0.03 });
  }

  function playHide() {
    noiseBurst({ duration: 0.16, filterFreq: 750, filterType: 'bandpass', gain: 0.14 });
  }

  function playSpotted() {
    tone({ type: 'sawtooth', freqStart: 520, freqEnd: 620, duration: 0.1, gain: 0.22 });
    tone({ type: 'sawtooth', freqStart: 780, freqEnd: 880, duration: 0.18, gain: 0.25, delay: 0.08 });
  }

  function playHit() {
    tone({ type: 'sawtooth', freqStart: 190, freqEnd: 72, duration: 0.24, gain: 0.32 });
    noiseBurst({ duration: 0.18, filterFreq: 600, filterType: 'lowpass', gain: 0.24 });
  }

  function playOvenWarn() {
    tone({ type: 'square', freqStart: 660, freqEnd: 660, duration: 0.06, gain: 0.12 });
    tone({ type: 'square', freqStart: 660, freqEnd: 660, duration: 0.06, gain: 0.12, delay: 0.11 });
  }

  function playOvenBlast() {
    noiseBurst({ duration: 0.42, filterFreq: 480, filterType: 'lowpass', gain: 0.28 });
    tone({ type: 'sawtooth', freqStart: 130, freqEnd: 75, duration: 0.32, gain: 0.18 });
  }

  function playStageClear() {
    const notes = [392, 494, 587, 784];
    notes.forEach((n, idx) => {
      tone({ type: 'triangle', freqStart: n, freqEnd: n, duration: 0.14, gain: 0.2, delay: idx * 0.08 });
    });
  }

  function playCaught() {
    const notes = [392, 349, 311, 220];
    notes.forEach((n, idx) => {
      tone({ type: 'sawtooth', freqStart: n, freqEnd: n * 0.94, duration: 0.2, gain: 0.22, delay: idx * 0.13 });
    });
  }

  function playEscape() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      tone({ type: 'triangle', freqStart: n, freqEnd: n, duration: 0.18, gain: 0.24, delay: idx * 0.09 });
    });
    setTimeout(() => {
      if (!muted) playGobble();
    }, 340);
  }

  function playHeart() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      tone({ type: 'sine', freqStart: n, freqEnd: n * 1.03, duration: 0.11, gain: 0.19, delay: idx * 0.05 });
    });
  }

  function playRecharge() {
    tone({ type: 'triangle', freqStart: 220, freqEnd: 660, duration: 0.28, gain: 0.24 });
    tone({ type: 'sine', freqStart: 523, freqEnd: 784, duration: 0.22, gain: 0.18, delay: 0.12 });
    noiseBurst({ duration: 0.18, filterFreq: 1600, filterType: 'bandpass', gain: 0.1 });
  }

  function playShotgunAim() {
    noiseBurst({ duration: 0.05, filterFreq: 2200, filterType: 'bandpass', gain: 0.12 });
    tone({ type: 'triangle', freqStart: 420, freqEnd: 520, duration: 0.06, gain: 0.12, delay: 0.06 });
    noiseBurst({ duration: 0.05, filterFreq: 2600, filterType: 'bandpass', gain: 0.14, delay: 0.09 });
  }

  function playShotgunFire() {
    tone({ type: 'sawtooth', freqStart: 165, freqEnd: 46, duration: 0.24, gain: 0.34 });
    noiseBurst({ duration: 0.28, filterFreq: 950, filterType: 'bandpass', gain: 0.32 });
    noiseBurst({ duration: 0.16, filterFreq: 2200, filterType: 'highpass', gain: 0.16, delay: 0.02 });
  }

  return {
    unlock,
    setMuted,
    isMuted,
    toggleMute,
    playGobble,
    playJump,
    playFlutter,
    playCorn,
    playNearMiss,
    playHide,
    playSpotted,
    playHit,
    playOvenWarn,
    playOvenBlast,
    playStageClear,
    playCaught,
    playEscape,
    playHeart,
    playRecharge,
    playShotgunAim,
    playShotgunFire,
  };
}
