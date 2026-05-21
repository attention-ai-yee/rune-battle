/**
 * Sound effects engine using Web Audio API
 * All sounds are procedurally generated - zero audio files needed
 */

let audioCtx: AudioContext | null = null;
let bgmNodes: { oscillators: OscillatorNode[]; gains: GainNode[]; masterGain: GainNode } | null = null;
let bgmPlaying = false;

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

// --- Background Music ---

/** Start looping background music (dark ambient drone + arpeggio) */
export function bgmStart() {
  if (bgmPlaying) return;
  const ctx = getCtx();
  bgmPlaying = true;

  // Master gain for BGM (very quiet, ambient)
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.06;
  masterGain.connect(ctx.destination);

  // Low drone: D2 (~73Hz) + A2 (~110Hz)
  const drone1 = ctx.createOscillator();
  drone1.type = 'sine';
  drone1.frequency.value = 73.42; // D2
  const drone1Gain = ctx.createGain();
  drone1Gain.gain.value = 0.5;
  drone1.connect(drone1Gain);
  drone1Gain.connect(masterGain);

  const drone2 = ctx.createOscillator();
  drone2.type = 'sine';
  drone2.frequency.value = 110; // A2
  const drone2Gain = ctx.createGain();
  drone2Gain.gain.value = 0.3;
  drone2.connect(drone2Gain);
  drone2Gain.connect(masterGain);

  // Sub bass: D1 (~36.7Hz)
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 36.71; // D1
  const subGain = ctx.createGain();
  subGain.gain.value = 0.4;
  sub.connect(subGain);
  subGain.connect(masterGain);

  // Pad: filtered triangle wave chord (D minor: D-F-A)
  const pad = ctx.createOscillator();
  pad.type = 'triangle';
  pad.frequency.value = 146.83; // D3
  const padGain = ctx.createGain();
  padGain.gain.value = 0.2;
  pad.connect(padGain);

  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 400;
  padFilter.Q.value = 1;
  padGain.connect(padFilter);
  padFilter.connect(masterGain);

  // LFO to modulate drone volume (slow breathing effect)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08; // Very slow
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain);
  lfoGain.connect(drone1Gain.gain);
  lfoGain.connect(drone2Gain.gain);

  // Start all oscillators
  drone1.start();
  drone2.start();
  sub.start();
  pad.start();
  lfo.start();

  bgmNodes = {
    oscillators: [drone1, drone2, sub, pad, lfo],
    gains: [drone1Gain, drone2Gain, subGain, padGain, lfoGain],
    masterGain,
  };

  // Arpeggio loop: D minor arpeggio cycling
  const arpNotes = [146.83, 174.61, 220, 293.66, 220, 174.61]; // D3 F3 A3 D4 A3 F3
  let arpIndex = 0;

  function playArpNote() {
    if (!bgmPlaying) return;
    const freq = arpNotes[arpIndex % arpNotes.length];
    arpIndex++;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.3, now + 0.3);
    env.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 2;

    osc.connect(env);
    env.connect(filter);
    filter.connect(masterGain);

    osc.start(now);
    osc.stop(now + 2.5);

    // Schedule next note (1.8s interval for slow ambient feel)
    setTimeout(playArpNote, 1800);
  }

  // Start arpeggio after a short delay
  setTimeout(playArpNote, 2000);
}

/** Stop background music */
export function bgmStop() {
  if (!bgmPlaying || !bgmNodes) return;
  bgmPlaying = false;

  const ctx = getCtx();
  const now = ctx.currentTime;

  // Fade out master gain over 1 second
  bgmNodes.masterGain.gain.setValueAtTime(bgmNodes.masterGain.gain.value, now);
  bgmNodes.masterGain.gain.linearRampToValueAtTime(0, now + 1);

  // Stop oscillators after fade
  setTimeout(() => {
    bgmNodes?.oscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    bgmNodes = null;
  }, 1200);
}

/** Check if BGM is playing */
export function isBgmPlaying(): boolean {
  return bgmPlaying;
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
