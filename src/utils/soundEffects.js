// Lightweight, zero-dependency Web Audio API synthesizer for Point of Order sound effects.

let audioCtx = null;

/* ---------- The mute ------------------------------------------------
   The chamber has a lot to say now, and not every room wants to hear
   it. One switch, remembered between visits, and every cue below goes
   through it: a muted chamber never even opens an audio context.     */
const SOUND_KEY = 'poo:sound';
let soundEnabled = null;
const soundListeners = new Set();

export function isSoundEnabled() {
  if (soundEnabled === null) {
    try {
      soundEnabled = window.localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      soundEnabled = true;
    }
  }
  return soundEnabled;
}

export function setSoundEnabled(on) {
  soundEnabled = !!on;
  try {
    window.localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
  } catch {}
  soundListeners.forEach((fn) => {
    try { fn(soundEnabled); } catch {}
  });
}

// Lets a component follow the switch without owning it.
export function subscribeSound(fn) {
  soundListeners.add(fn);
  return () => soundListeners.delete(fn);
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!isSoundEnabled()) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// 1. Subtle, clean tactile click
export function playClick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
}

// 2. Rising two-tone chime when submitting a speech and passing the floor
export function playTurnSubmit() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.12);

    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.09); // G5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09 + 0.17);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.09);
    osc2.stop(ctx.currentTime + 0.26);
  } catch {}
}

// 3. Urgent low-time warning tick (plays when clock <= 30s)
export function playLowTimeTick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

// 4. Clock expired alarm
export function playClockFlagged() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    [0, 0.15, 0.3].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.1);
    });
  } catch {}
}

// 5. Wooden gavel strike on verdict / debate end
export function playGavel() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Low thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);

    // High snap
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(1200, ctx.currentTime);
    snap.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);
    snapGain.gain.setValueAtTime(0.2, ctx.currentTime);
    snapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(ctx.currentTime);
    snap.stop(ctx.currentTime + 0.06);
  } catch {}
}

/* ---------- The floor changes hands ----------------------------------
   Not a chime -- a bench being taken. A short wooden knock with a breath
   of air behind it, pitched to the side that now holds the floor: lower
   for the proposition, higher for the opposition, so you can hear whose
   turn it is without looking up.                                      */
export function playFloorChange(side = 'for') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const root = side === 'against' ? 320 : 240;

    const knock = ctx.createOscillator();
    const knockGain = ctx.createGain();
    knock.type = 'triangle';
    knock.frequency.setValueAtTime(root, t);
    knock.frequency.exponentialRampToValueAtTime(root * 0.4, t + 0.13);
    knockGain.gain.setValueAtTime(0.16, t);
    knockGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    knock.connect(knockGain);
    knockGain.connect(ctx.destination);
    knock.start(t);
    knock.stop(t + 0.13);

    // The room drawing breath: filtered noise, very short.
    const frames = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(900, t);
    band.Q.setValueAtTime(0.8, t);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, t + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t + 0.02);
    noise.stop(t + 0.18);
  } catch {}
}

/* ---------- Entering the chamber -------------------------------------
   The beats before the doors open. The last one is higher and a little
   louder, so the countdown resolves instead of merely stopping.       */
export function playCountdownBlip(isFinal = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 587.33, t); // A5 : D5
    gain.gain.setValueAtTime(isFinal ? 0.13 : 0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isFinal ? 0.3 : 0.1));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + (isFinal ? 0.3 : 0.1));
  } catch {}
}

/* ---------- The decision ---------------------------------------------
   Three notes on the heels of the gavel -- a chord, not a fanfare. Open
   and unresolved when the house has deadlocked.                       */
export function playVerdictChord(isDraw = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime + 0.16; // let the gavel land first
    const notes = isDraw ? [392.0, 587.33] : [392.0, 493.88, 587.33]; // G4 B4 D5

    notes.forEach((freq, i) => {
      const at = t + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.09, at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 1.1);
    });
  } catch {}
}
