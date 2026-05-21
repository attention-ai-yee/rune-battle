/**
 * Sound effects engine using Web Audio API
 * All sounds are procedurally generated - zero audio files needed
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Play a tone with envelope */
function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  detune: number = 0,
  delay: number = 0
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  const now = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

/** Play a noise burst (for hit/impact sounds) */
function playNoise(duration: number, volume: number = 0.1, delay: number = 0) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const now = ctx.currentTime + delay;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
}

// --- Public sound API ---

/** Card played / selected */
export function sfxCardPlay() {
  playTone(800, 0.08, 'square', 0.08);
  playTone(1200, 0.06, 'sine', 0.06, 0, 0.03);
}

/** Attack hit on enemy */
export function sfxHit() {
  playNoise(0.12, 0.15);
  playTone(200, 0.1, 'sawtooth', 0.1);
  playTone(150, 0.15, 'sine', 0.08, 0, 0.05);
}

/** Heavy attack / multi-hit */
export function sfxHeavyHit() {
  playNoise(0.2, 0.2);
  playTone(120, 0.2, 'sawtooth', 0.12);
  playTone(80, 0.3, 'sine', 0.1, 0, 0.08);
}

/** Defense / armor gained */
export function sfxDefend() {
  playTone(400, 0.12, 'sine', 0.1);
  playTone(600, 0.15, 'sine', 0.08, 0, 0.06);
  playTone(800, 0.12, 'sine', 0.06, 0, 0.12);
}

/** Spell cast */
export function sfxSpell() {
  for (let i = 0; i < 5; i++) {
    playTone(600 + i * 200, 0.1, 'sine', 0.06, 0, i * 0.04);
  }
}

/** Enemy attacks player */
export function sfxEnemyAttack() {
  playTone(180, 0.15, 'sawtooth', 0.1);
  playNoise(0.1, 0.1, 0.05);
  playTone(120, 0.2, 'square', 0.06, 0, 0.08);
}

/** Player takes damage */
export function sfxPlayerHit() {
  playTone(250, 0.1, 'sawtooth', 0.12);
  playNoise(0.08, 0.12);
  playTone(180, 0.15, 'sine', 0.08, 0, 0.06);
}

/** End turn / turn transition */
export function sfxEndTurn() {
  playTone(500, 0.08, 'sine', 0.08);
  playTone(400, 0.1, 'sine', 0.06, 0, 0.06);
}

/** Enemy turn start */
export function sfxEnemyTurn() {
  playTone(300, 0.15, 'square', 0.06);
  playTone(250, 0.15, 'square', 0.06, 0, 0.1);
}

/** Battle victory */
export function sfxVictory() {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone(freq, 0.3, 'sine', 0.1, 0, i * 0.12);
  });
}

/** Battle defeat / game over */
export function sfxDefeat() {
  const notes = [400, 350, 300, 200];
  notes.forEach((freq, i) => {
    playTone(freq, 0.4, 'sine', 0.1, 0, i * 0.2);
  });
}

/** Card draw */
export function sfxDraw() {
  playTone(900, 0.04, 'sine', 0.05);
  playTone(1100, 0.04, 'sine', 0.04, 0, 0.03);
}

/** Use potion */
export function sfxPotion() {
  for (let i = 0; i < 4; i++) {
    playTone(800 + i * 150, 0.15, 'sine', 0.06, 0, i * 0.06);
  }
}

/** Card retain toggle */
export function sfxRetain() {
  playTone(1000, 0.06, 'sine', 0.06);
  playTone(1200, 0.06, 'sine', 0.05, 0, 0.04);
}

/** Status effect applied (poison/burn/freeze) */
export function sfxStatusEffect() {
  playTone(600, 0.1, 'triangle', 0.08);
  playTone(700, 0.12, 'triangle', 0.06, 0, 0.08);
}

/** Map node select / start battle */
export function sfxMapSelect() {
  playTone(440, 0.08, 'sine', 0.08);
  playTone(660, 0.12, 'sine', 0.08, 0, 0.06);
  playTone(880, 0.1, 'sine', 0.06, 0, 0.12);
}

/** Button click (generic UI) */
export function sfxClick() {
  playTone(700, 0.04, 'sine', 0.05);
}
