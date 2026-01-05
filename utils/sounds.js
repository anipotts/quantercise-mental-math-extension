// utils/sounds.js
// Web Audio API sound synthesis (ported from sounds.ts)

// Musical notes in Hz
const NOTES = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99
};

// Singleton audio context
let audioContext = null;
let soundEnabled = true;
let masterVolume = 0.5;

/**
 * Get or create AudioContext (lazy initialization)
 * @returns {AudioContext|null}
 */
function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  // Resume if suspended (required after user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Create a single tone with ADSR envelope
 * @param {AudioContext} ctx - Audio context
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {number} volume - Volume 0-1
 * @param {string} type - Oscillator type (sine, triangle, square, sawtooth)
 */
function createTone(ctx, frequency, duration, volume, type = 'sine') {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // ADSR envelope
  const attackTime = 0.01;
  const decayTime = 0.1;
  const now = ctx.currentTime;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + attackTime + decayTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Play a chord (multiple notes simultaneously)
 * @param {AudioContext} ctx - Audio context
 * @param {number[]} frequencies - Array of frequencies
 * @param {number} duration - Duration in seconds
 * @param {number} volume - Volume 0-1
 */
function playChord(ctx, frequencies, duration, volume) {
  frequencies.forEach(freq => {
    createTone(ctx, freq, duration, volume / frequencies.length, 'sine');
  });
}

// Sound effect implementations
const SOUNDS = {
  /**
   * Countdown beep (3, 2, 1)
   * Single short beep - G4
   */
  countdown: (ctx, vol) => {
    createTone(ctx, NOTES.G4, 0.1, vol * 0.4, 'sine');
  },

  /**
   * GO! sound
   * Bright ascending arpeggio C5 -> E5 -> G5
   */
  go: (ctx, vol) => {
    const delay = 50;
    [NOTES.C5, NOTES.E5, NOTES.G5].forEach((freq, i) => {
      setTimeout(() => createTone(ctx, freq, 0.15, vol * 0.5, 'sine'), i * delay);
    });
  },

  /**
   * Correct answer chime
   * Pleasant two-note chime (E5 -> G5)
   */
  correct: (ctx, vol) => {
    createTone(ctx, NOTES.E5, 0.08, vol * 0.35, 'sine');
    setTimeout(() => createTone(ctx, NOTES.G5, 0.12, vol * 0.35, 'sine'), 50);
  },

  /**
   * Incorrect answer thud
   * Soft low tone - D4 triangle
   */
  incorrect: (ctx, vol) => {
    createTone(ctx, NOTES.D4, 0.15, vol * 0.3, 'triangle');
  },

  /**
   * Skip sound
   * Quick descending A4 -> E4
   */
  skip: (ctx, vol) => {
    createTone(ctx, NOTES.A4, 0.06, vol * 0.25, 'sine');
    setTimeout(() => createTone(ctx, NOTES.E4, 0.08, vol * 0.2, 'sine'), 40);
  },

  /**
   * Drill complete sound
   * Triumphant chord progression
   */
  complete: (ctx, vol) => {
    const delay = 80;
    setTimeout(() => playChord(ctx, [NOTES.C4, NOTES.E4, NOTES.G4], 0.3, vol * 0.4), 0);
    setTimeout(() => playChord(ctx, [NOTES.E4, NOTES.G4, NOTES.C5], 0.3, vol * 0.45), delay);
    setTimeout(() => playChord(ctx, [NOTES.G4, NOTES.C5, NOTES.E5], 0.5, vol * 0.5), delay * 2);
  },

  /**
   * Low time warning
   * Double beep
   */
  lowTime: (ctx, vol) => {
    createTone(ctx, NOTES.A4, 0.08, vol * 0.35, 'sine');
    setTimeout(() => createTone(ctx, NOTES.A4, 0.08, vol * 0.35, 'sine'), 120);
  }
};

/**
 * Initialize audio context (must be called after user interaction)
 */
export function initAudio() {
  getAudioContext();
}

/**
 * Play a sound effect
 * @param {'countdown'|'go'|'correct'|'incorrect'|'skip'|'complete'|'lowTime'} type
 */
export function playSound(type) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    SOUNDS[type]?.(ctx, masterVolume);
  } catch (error) {
    console.warn('Failed to play sound:', type, error);
  }
}

/**
 * Enable/disable sounds
 * @param {boolean} enabled
 */
export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

/**
 * Get current sound enabled state
 * @returns {boolean}
 */
export function isSoundEnabled() {
  return soundEnabled;
}

/**
 * Toggle sound on/off
 * @returns {boolean} New enabled state
 */
export function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

/**
 * Set master volume
 * @param {number} volume - Volume 0-1
 */
export function setVolume(volume) {
  masterVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Get current volume
 * @returns {number}
 */
export function getVolume() {
  return masterVolume;
}
