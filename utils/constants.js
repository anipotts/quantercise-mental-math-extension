// utils/constants.js
// All constants for the Quantercise Mental Math extension

// Screen states
export const SCREENS = {
  HOME: 'HOME',
  COUNTDOWN: 'COUNTDOWN',
  DRILL: 'DRILL',
  RESULTS: 'RESULTS',
  EXIT_MODAL: 'EXIT_MODAL'
};

// Theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Operation symbols (using proper Unicode characters)
export const OPERATION_SYMBOLS = {
  '+': '+',
  '-': '\u2212',  // Minus sign (U+2212)
  '*': '\u00D7',  // Multiplication sign (U+00D7)
  '/': '\u00F7'   // Division sign (U+00F7)
};

// Quick Drill Preset (ported from presets.ts)
export const QUICK_DRILL_PRESET = {
  id: 'quick',
  name: 'Quick Drill',
  description: 'Just two minutes of pure arithmetic. Only (+, -, \u00D7, \u00F7) and double digit numbers. No penalties.',

  // Time and questions
  timeLimitSeconds: 120,
  questionCount: Infinity,

  // Operations
  operations: ['+', '-', '*', '/'],

  // Number ranges
  numberRanges: {
    integers: { min: 2, max: 99 },
    division: { maxDividend: 144, maxDivisor: 12 }
  },

  // Scoring (no penalty mode)
  scoring: {
    correctPoints: 1,
    incorrectPoints: 0,
    skippedPoints: 0
  },

  // Benchmark thresholds
  benchmarks: {
    passing: 40,
    good: 55,
    excellent: 70
  }
};

// Timer constants (from constants.ts)
export const TIMER_TICK_MS = 100;
export const LOW_TIME_THRESHOLD = 0.25;      // 25% remaining
export const CRITICAL_TIME_THRESHOLD = 0.10; // 10% remaining

// Countdown constants
export const COUNTDOWN_TICK_MS = 700;
export const COUNTDOWN_GO_MS = 500;
export const COUNTDOWN_SEQUENCE = [3, 2, 1, 'GO'];

// Feedback display duration
export const FEEDBACK_DISPLAY_MS = 600;

// Tutorial animation constants
export const TUTORIAL_TYPING_MS = 120;
export const TUTORIAL_PROBLEMS = [
  {
    display: '17 \u00D7 8 =',
    correctAnswer: '136',
    wrongAnswer: '138'
  },
  {
    display: '96 \u00F7 4 =',
    correctAnswer: '24',
    wrongAnswer: '22'
  },
  {
    display: '45 + 78 =',
    correctAnswer: '123',
    wrongAnswer: '121'
  }
];

// Storage keys
export const STORAGE_KEYS = {
  theme: 'quantercise_theme',
  soundEnabled: 'quantercise_sound_enabled',
  bestScore: 'quantercise_best_score',
  lastScore: 'quantercise_last_score',
  totalDrills: 'quantercise_total_drills',
  history: 'quantercise_history',
  currentStreak: 'quantercise_current_streak',
  longestStreak: 'quantercise_longest_streak',
  lastActivityDate: 'quantercise_last_activity_date'
};

// Benchmark level names
export const BENCHMARK_LEVELS = {
  BELOW_PASSING: 'below_passing',
  PASSING: 'passing',
  GOOD: 'good',
  EXCELLENT: 'excellent'
};

// Get benchmark level from score
export function getBenchmarkLevel(score) {
  const { benchmarks } = QUICK_DRILL_PRESET;
  if (score >= benchmarks.excellent) return BENCHMARK_LEVELS.EXCELLENT;
  if (score >= benchmarks.good) return BENCHMARK_LEVELS.GOOD;
  if (score >= benchmarks.passing) return BENCHMARK_LEVELS.PASSING;
  return BENCHMARK_LEVELS.BELOW_PASSING;
}

// Get benchmark display text
export function getBenchmarkText(level) {
  switch (level) {
    case BENCHMARK_LEVELS.EXCELLENT: return 'Excellent!';
    case BENCHMARK_LEVELS.GOOD: return 'Good';
    case BENCHMARK_LEVELS.PASSING: return 'Passing';
    default: return 'Keep Practicing';
  }
}
