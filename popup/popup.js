// popup/popup.js
// Main application logic for Quantercise Mental Math Chrome Extension

import { storage } from '../utils/storage.js';
import {
  SCREENS,
  THEMES,
  QUICK_DRILL_PRESET,
  TIMER_TICK_MS,
  LOW_TIME_THRESHOLD,
  CRITICAL_TIME_THRESHOLD,
  COUNTDOWN_SEQUENCE,
  COUNTDOWN_TICK_MS,
  COUNTDOWN_GO_MS,
  TUTORIAL_PROBLEMS,
  TUTORIAL_TYPING_MS,
  FEEDBACK_DISPLAY_MS,
  getBenchmarkLevel,
  getBenchmarkText
} from '../utils/constants.js';
import {
  generateSingleProblem,
  formatProblem,
  validateAnswer
} from '../utils/generator.js';
import {
  playSound,
  initAudio,
  setSoundEnabled,
  isSoundEnabled,
  toggleSound
} from '../utils/sounds.js';

// ============================================================================
// STATE
// ============================================================================

const state = {
  screen: SCREENS.HOME,
  theme: THEMES.SYSTEM,
  soundEnabled: true,

  // Session state
  currentProblem: null,
  results: [],
  score: 0,
  correct: 0,
  incorrect: 0,
  skipped: 0,

  // Timer state
  timeRemainingMs: QUICK_DRILL_PRESET.timeLimitSeconds * 1000,
  timerInterval: null,
  lowTimeSoundPlayed: false,

  // Countdown state
  countdownIndex: 0,
  countdownTimeout: null,

  // Tutorial state
  tutorialStep: 0,
  tutorialPhase: 'typing', // 'typing', 'feedback', 'transition'
  tutorialTimeout: null,
  tutorialTypingInterval: null,

  // Stats
  bestScore: 0,
  lastScore: null,
  currentStreak: 0,
  streakActive: false
};

// ============================================================================
// DOM REFERENCES
// ============================================================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
  app: $('#app'),

  // Screens
  screenHome: $('#screen-home'),
  screenCountdown: $('#screen-countdown'),
  screenDrill: $('#screen-drill'),
  screenResults: $('#screen-results'),
  modalExit: $('#modal-exit'),

  // Home
  btnSound: $('#btn-sound'),
  btnTheme: $('#btn-theme'),
  btnStart: $('#btn-start'),
  statBest: $('#stat-best'),
  statLast: $('#stat-last'),
  statStreakContainer: $('#stat-streak-container'),
  streakCount: $('#streak-count'),
  historyToggle: $('#history-toggle'),
  historyList: $('#history-list'),
  historyEmpty: $('#history-empty'),
  historyItems: $('#history-items'),
  tutorialProblem: $('#tutorial-problem'),
  tutorialTyped: $('#tutorial-typed'),
  tutorialInput: $('#tutorial-input'),
  tutorialDots: $$('.tutorial__dot'),
  tutorialBtnSkip: $('#tutorial-btn-skip'),
  tutorialBtnSubmit: $('#tutorial-btn-submit'),

  // Countdown
  countdownValue: $('#countdown-value'),
  countdownDots: $$('.countdown__dot'),

  // Drill
  drillTimer: $('#drill-timer'),
  timerProgress: $('#timer-progress'),
  timerText: $('#timer-text'),
  progressCorrect: $('#progress-correct'),
  progressIncorrect: $('#progress-incorrect'),
  progressSkipped: $('#progress-skipped'),
  progressCount: $('#progress-count'),
  drillScore: $('#drill-score'),
  scoreValue: $('#score-value'),
  problemText: $('#problem-text'),
  drillInput: $('#drill-input'),
  drillInputWrapper: $('#drill-input-wrapper'),
  drillFeedback: $('#drill-feedback'),
  feedbackIcon: $('#feedback-icon'),
  feedbackText: $('#feedback-text'),
  btnSkip: $('#btn-skip'),
  btnSubmit: $('#btn-submit'),
  btnExit: $('#btn-exit'),

  // Results
  resultsScoreCircle: $('#results-score-circle'),
  resultsScore: $('#results-score'),
  resultsBenchmark: $('#results-benchmark'),
  benchmarkText: $('#benchmark-text'),
  resultsCorrect: $('#results-correct'),
  resultsIncorrect: $('#results-incorrect'),
  resultsSkipped: $('#results-skipped'),
  resultsQpm: $('#results-qpm'),
  resultsRecord: $('#results-record'),
  accuracyFill: $('#accuracy-fill'),
  accuracyValue: $('#accuracy-value'),
  btnRetry: $('#btn-retry'),
  btnHome: $('#btn-home'),

  // Modal
  exitScore: $('#exit-score'),
  exitQuestions: $('#exit-questions'),
  btnContinue: $('#btn-continue'),
  btnConfirmExit: $('#btn-confirm-exit'),
  modalBackdrop: $('#modal-backdrop')
};

// ============================================================================
// SCREEN MANAGEMENT
// ============================================================================

function showScreen(screenName) {
  state.screen = screenName;

  // Hide all screens
  [elements.screenHome, elements.screenCountdown, elements.screenDrill, elements.screenResults].forEach(screen => {
    screen.classList.add('hidden');
  });

  // Hide modal
  elements.modalExit.classList.add('hidden');

  // Show target screen
  switch (screenName) {
    case SCREENS.HOME:
      elements.screenHome.classList.remove('hidden');
      startTutorialAnimation();
      break;
    case SCREENS.COUNTDOWN:
      elements.screenCountdown.classList.remove('hidden');
      stopTutorialAnimation();
      startCountdown();
      break;
    case SCREENS.DRILL:
      elements.screenDrill.classList.remove('hidden');
      elements.drillInput.focus();
      break;
    case SCREENS.RESULTS:
      elements.screenResults.classList.remove('hidden');
      break;
  }
}

function showExitModal() {
  elements.exitScore.textContent = state.score >= 0 ? `+${state.score}` : state.score;
  elements.exitQuestions.textContent = state.results.length;
  elements.modalExit.classList.remove('hidden');
}

function hideModal() {
  elements.modalExit.classList.add('hidden');
  if (state.screen === SCREENS.DRILL) {
    elements.drillInput.focus();
  }
}

// ============================================================================
// THEME MANAGEMENT
// ============================================================================

async function initTheme() {
  const savedTheme = await storage.getTheme();
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  state.theme = theme;

  const app = elements.app;
  app.classList.remove('app--light', 'app--dark');

  // Update theme icons
  const sunIcon = elements.btnTheme.querySelector('.icon--sun');
  const moonIcon = elements.btnTheme.querySelector('.icon--moon');

  if (theme === THEMES.DARK) {
    app.classList.add('app--dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  } else if (theme === THEMES.LIGHT) {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    // System theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      app.classList.add('app--dark');
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  }
}

function cycleTheme() {
  const themes = [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM];
  const currentIndex = themes.indexOf(state.theme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];
  applyTheme(nextTheme);
  storage.setTheme(nextTheme);
}

// ============================================================================
// SOUND MANAGEMENT
// ============================================================================

async function initSound() {
  const enabled = await storage.getSoundEnabled();
  state.soundEnabled = enabled;
  setSoundEnabled(enabled);
  updateSoundIcon();
}

function updateSoundIcon() {
  const iconOn = elements.btnSound.querySelector('.icon--sound-on');
  const iconOff = elements.btnSound.querySelector('.icon--sound-off');

  if (state.soundEnabled) {
    iconOn.classList.remove('hidden');
    iconOff.classList.add('hidden');
  } else {
    iconOn.classList.add('hidden');
    iconOff.classList.remove('hidden');
  }
}

function handleSoundToggle() {
  initAudio(); // Ensure audio context is initialized
  state.soundEnabled = toggleSound();
  storage.setSoundEnabled(state.soundEnabled);
  updateSoundIcon();
}

// ============================================================================
// TUTORIAL ANIMATION
// ============================================================================

function startTutorialAnimation() {
  stopTutorialAnimation();
  state.tutorialStep = 0;
  runTutorialCycle();
}

function stopTutorialAnimation() {
  if (state.tutorialTimeout) {
    clearTimeout(state.tutorialTimeout);
    state.tutorialTimeout = null;
  }
  if (state.tutorialTypingInterval) {
    clearInterval(state.tutorialTypingInterval);
    state.tutorialTypingInterval = null;
  }
}

function runTutorialCycle() {
  const cycleType = state.tutorialStep % 3; // 0=correct, 1=wrong, 2=skip
  const problemIndex = state.tutorialStep % TUTORIAL_PROBLEMS.length;
  const problem = TUTORIAL_PROBLEMS[problemIndex];

  // Reset UI
  elements.tutorialProblem.innerHTML = problem.display;
  elements.tutorialTyped.textContent = '';
  elements.tutorialInput.classList.remove(
    'tutorial__input--correct',
    'tutorial__input--incorrect',
    'tutorial__input--skipped'
  );
  elements.tutorialBtnSkip.classList.remove('tutorial__btn--active');
  elements.tutorialBtnSubmit.classList.remove('tutorial__btn--active');

  // Update dots
  elements.tutorialDots.forEach((dot, i) => {
    dot.classList.remove('tutorial__dot--active', 'tutorial__dot--correct',
                          'tutorial__dot--incorrect', 'tutorial__dot--skipped');
    if (i === cycleType) {
      dot.classList.add('tutorial__dot--active');
    }
  });

  // Determine what to type
  let answerToType = '';
  if (cycleType === 0) {
    answerToType = problem.correctAnswer;
  } else if (cycleType === 1) {
    answerToType = problem.wrongAnswer;
  }
  // cycleType === 2 is skip, no typing

  if (cycleType === 2) {
    // Skip animation
    state.tutorialTimeout = setTimeout(() => {
      elements.tutorialBtnSkip.classList.add('tutorial__btn--active');

      state.tutorialTimeout = setTimeout(() => {
        elements.tutorialInput.classList.add('tutorial__input--skipped');
        elements.tutorialDots[cycleType].classList.remove('tutorial__dot--active');
        elements.tutorialDots[cycleType].classList.add('tutorial__dot--skipped');

        // Advance to next
        state.tutorialTimeout = setTimeout(() => {
          elements.tutorialBtnSkip.classList.remove('tutorial__btn--active');
          state.tutorialStep++;
          runTutorialCycle();
        }, 1000);
      }, 400);
    }, 800);
  } else {
    // Typing animation
    let charIndex = 0;
    state.tutorialTypingInterval = setInterval(() => {
      if (charIndex < answerToType.length) {
        elements.tutorialTyped.textContent = answerToType.slice(0, charIndex + 1);
        charIndex++;
      } else {
        clearInterval(state.tutorialTypingInterval);
        state.tutorialTypingInterval = null;

        // Show submit button active with glow
        elements.tutorialBtnSubmit.classList.add('tutorial__btn--active');

        // Show feedback after short delay
        state.tutorialTimeout = setTimeout(() => {
          const isCorrect = cycleType === 0;

          if (isCorrect) {
            elements.tutorialInput.classList.add('tutorial__input--correct');
            elements.tutorialDots[cycleType].classList.add('tutorial__dot--correct');
          } else {
            elements.tutorialInput.classList.add('tutorial__input--incorrect');
            elements.tutorialDots[cycleType].classList.add('tutorial__dot--incorrect');
          }
          elements.tutorialDots[cycleType].classList.remove('tutorial__dot--active');

          // Advance to next
          state.tutorialTimeout = setTimeout(() => {
            elements.tutorialBtnSubmit.classList.remove('tutorial__btn--active');
            state.tutorialStep++;
            runTutorialCycle();
          }, 1200);
        }, 300);
      }
    }, TUTORIAL_TYPING_MS);
  }
}

// ============================================================================
// COUNTDOWN
// ============================================================================

function startCountdown() {
  state.countdownIndex = 0;
  updateCountdownDisplay(COUNTDOWN_SEQUENCE[0]);
  playSound('countdown');

  advanceCountdown();
}

function advanceCountdown() {
  state.countdownTimeout = setTimeout(() => {
    state.countdownIndex++;

    if (state.countdownIndex >= COUNTDOWN_SEQUENCE.length) {
      startDrill();
      return;
    }

    const value = COUNTDOWN_SEQUENCE[state.countdownIndex];
    updateCountdownDisplay(value);

    if (value === 'GO') {
      playSound('go');
      // Shorter timeout for GO
      state.countdownTimeout = setTimeout(() => {
        startDrill();
      }, COUNTDOWN_GO_MS);
    } else {
      playSound('countdown');
      advanceCountdown();
    }
  }, COUNTDOWN_TICK_MS);
}

function updateCountdownDisplay(value) {
  const el = elements.countdownValue;

  if (value === 'GO') {
    el.textContent = 'GO!';
    el.classList.add('countdown__number--go');
  } else {
    el.textContent = value;
    el.classList.remove('countdown__number--go');
  }

  // Force animation restart
  el.style.animation = 'none';
  el.offsetHeight; // Trigger reflow
  el.style.animation = '';

  // Update dots
  elements.countdownDots.forEach((dot, i) => {
    dot.classList.remove('countdown__dot--active', 'countdown__dot--complete');
    if (i < state.countdownIndex) {
      dot.classList.add('countdown__dot--complete');
    } else if (i === state.countdownIndex) {
      dot.classList.add('countdown__dot--active');
    }
  });
}

function skipCountdown() {
  if (state.countdownTimeout) {
    clearTimeout(state.countdownTimeout);
    state.countdownTimeout = null;
  }
  startDrill();
}

// ============================================================================
// DRILL SESSION
// ============================================================================

function startDrill() {
  // Reset session state
  state.results = [];
  state.score = 0;
  state.correct = 0;
  state.incorrect = 0;
  state.skipped = 0;
  state.timeRemainingMs = QUICK_DRILL_PRESET.timeLimitSeconds * 1000;
  state.lowTimeSoundPlayed = false;

  // Reset UI
  updateDrillUI();
  elements.drillTimer.classList.remove('drill-timer--low', 'drill-timer--critical');

  // Generate first problem
  nextProblem();

  // Start timer
  startTimer();

  // Show drill screen
  showScreen(SCREENS.DRILL);
}

function nextProblem() {
  const problem = generateSingleProblem();
  state.currentProblem = problem;

  // Update display
  elements.problemText.textContent = formatProblem(problem);
  elements.drillInput.value = '';
  elements.drillInput.classList.remove('drill-input--correct', 'drill-input--incorrect');
  elements.drillFeedback.classList.add('hidden');
  elements.drillInput.disabled = false;
  elements.drillInput.focus();
}

function submitAnswer() {
  if (!state.currentProblem || elements.drillInput.disabled) return;

  const userInput = elements.drillInput.value.trim();
  const isCorrect = validateAnswer(userInput, state.currentProblem.correctAnswer);

  // Record result
  state.results.push({
    problemId: state.currentProblem.id,
    userAnswer: userInput || null,
    isCorrect: isCorrect,
    correctAnswer: state.currentProblem.correctAnswer
  });

  // Update stats and show feedback
  if (isCorrect === true) {
    state.correct++;
    state.score += QUICK_DRILL_PRESET.scoring.correctPoints;
    playSound('correct');
    showFeedback(true, state.currentProblem.correctAnswer);
  } else if (isCorrect === false) {
    state.incorrect++;
    state.score += QUICK_DRILL_PRESET.scoring.incorrectPoints;
    playSound('incorrect');
    showFeedback(false, state.currentProblem.correctAnswer);
  } else {
    // Skipped (empty input via submit button)
    state.skipped++;
    state.score += QUICK_DRILL_PRESET.scoring.skippedPoints;
    playSound('skip');
    // Skip feedback for empty, just advance
    updateDrillUI();
    nextProblem();
    return;
  }

  updateDrillUI();

  // Disable input during feedback
  elements.drillInput.disabled = true;

  // Advance to next problem after feedback
  setTimeout(() => {
    nextProblem();
  }, FEEDBACK_DISPLAY_MS);
}

function skipProblem() {
  if (!state.currentProblem || elements.drillInput.disabled) return;

  state.results.push({
    problemId: state.currentProblem.id,
    userAnswer: null,
    isCorrect: null,
    correctAnswer: state.currentProblem.correctAnswer
  });

  state.skipped++;
  state.score += QUICK_DRILL_PRESET.scoring.skippedPoints;
  playSound('skip');

  updateDrillUI();
  nextProblem();
}

function showFeedback(isCorrect, correctAnswer) {
  const feedback = elements.drillFeedback;
  feedback.classList.remove('hidden', 'drill-feedback--correct', 'drill-feedback--incorrect');

  if (isCorrect) {
    feedback.classList.add('drill-feedback--correct');
    elements.feedbackIcon.textContent = '\u2713'; // Checkmark
    elements.feedbackText.textContent = correctAnswer;
    elements.drillInput.classList.add('drill-input--correct');
  } else {
    feedback.classList.add('drill-feedback--incorrect');
    elements.feedbackIcon.textContent = '\u2717'; // X mark
    elements.feedbackText.textContent = `= ${correctAnswer}`;
    elements.drillInput.classList.add('drill-input--incorrect');
  }
}

function updateDrillUI() {
  // Update score display
  const scoreEl = elements.drillScore;
  elements.scoreValue.textContent = state.score >= 0 ? `+${state.score}` : state.score;
  scoreEl.classList.remove('drill-score--positive', 'drill-score--negative');
  if (state.score > 0) scoreEl.classList.add('drill-score--positive');
  if (state.score < 0) scoreEl.classList.add('drill-score--negative');

  // Update progress count
  elements.progressCount.textContent = state.results.length;

  // Update progress bar
  const total = Math.max(state.results.length, 1);
  const correctPct = (state.correct / total) * 100;
  const incorrectPct = (state.incorrect / total) * 100;
  const skippedPct = (state.skipped / total) * 100;

  elements.progressCorrect.style.width = `${correctPct}%`;
  elements.progressIncorrect.style.width = `${incorrectPct}%`;
  elements.progressSkipped.style.width = `${skippedPct}%`;
}

// ============================================================================
// TIMER
// ============================================================================

function startTimer() {
  const totalTimeMs = QUICK_DRILL_PRESET.timeLimitSeconds * 1000;
  const circumference = 2 * Math.PI * 16; // r=16 from SVG

  // Initial display
  updateTimerDisplay(totalTimeMs, circumference);

  state.timerInterval = setInterval(() => {
    state.timeRemainingMs -= TIMER_TICK_MS;

    if (state.timeRemainingMs <= 0) {
      state.timeRemainingMs = 0;
      endDrill();
      return;
    }

    updateTimerDisplay(state.timeRemainingMs, circumference);
  }, TIMER_TICK_MS);
}

function updateTimerDisplay(timeMs, circumference) {
  const totalTimeMs = QUICK_DRILL_PRESET.timeLimitSeconds * 1000;

  // Update timer text
  const seconds = Math.ceil(timeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  elements.timerText.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

  // Update progress ring
  const progress = timeMs / totalTimeMs;
  const offset = circumference * (1 - progress);
  elements.timerProgress.style.strokeDashoffset = offset;

  // Update timer color based on threshold
  elements.drillTimer.classList.remove('drill-timer--low', 'drill-timer--critical');
  if (progress <= CRITICAL_TIME_THRESHOLD) {
    elements.drillTimer.classList.add('drill-timer--critical');
  } else if (progress <= LOW_TIME_THRESHOLD) {
    elements.drillTimer.classList.add('drill-timer--low');
    // Play warning sound once when crossing threshold
    if (!state.lowTimeSoundPlayed) {
      state.lowTimeSoundPlayed = true;
      playSound('lowTime');
    }
  }
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// ============================================================================
// END DRILL & RESULTS
// ============================================================================

function endDrill() {
  stopTimer();
  playSound('complete');

  // Calculate stats
  const totalTimeSeconds = QUICK_DRILL_PRESET.timeLimitSeconds;
  const timeUsedSeconds = totalTimeSeconds - (state.timeRemainingMs / 1000);
  const qpm = timeUsedSeconds > 0 ? (state.correct / (timeUsedSeconds / 60)).toFixed(1) : '0.0';
  const totalAnswered = state.correct + state.incorrect;
  const accuracy = totalAnswered > 0 ? Math.round((state.correct / totalAnswered) * 100) : 0;

  // Determine benchmark level
  const benchmarkLevel = getBenchmarkLevel(state.score);
  const benchmarkText = getBenchmarkText(benchmarkLevel);

  // Update results UI
  elements.resultsScore.textContent = state.score;
  elements.resultsCorrect.textContent = state.correct;
  elements.resultsIncorrect.textContent = state.incorrect;
  elements.resultsSkipped.textContent = state.skipped;
  elements.resultsQpm.textContent = qpm;
  elements.benchmarkText.textContent = benchmarkText;
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.accuracyFill.style.width = `${accuracy}%`;

  // Score circle styling
  const circle = elements.resultsScoreCircle;
  circle.classList.remove(
    'results__score-circle--excellent',
    'results__score-circle--good',
    'results__score-circle--passing',
    'results__score-circle--below_passing'
  );
  circle.classList.add(`results__score-circle--${benchmarkLevel}`);

  // Benchmark badge styling
  const benchmark = elements.resultsBenchmark;
  benchmark.classList.remove(
    'results__benchmark--excellent',
    'results__benchmark--good',
    'results__benchmark--passing',
    'results__benchmark--below_passing'
  );
  benchmark.classList.add(`results__benchmark--${benchmarkLevel}`);

  // Check for new record
  storage.setBestScore(state.score).then(isNewRecord => {
    if (isNewRecord) {
      elements.resultsRecord.classList.remove('hidden');
    } else {
      elements.resultsRecord.classList.add('hidden');
    }
  });

  // Save session data
  const sessionData = {
    date: new Date().toISOString(),
    score: state.score,
    correct: state.correct,
    incorrect: state.incorrect,
    skipped: state.skipped,
    qpm: parseFloat(qpm),
    accuracy: accuracy,
    benchmarkLevel: benchmarkLevel
  };

  storage.setLastScore(sessionData);
  storage.addToHistory(sessionData);
  storage.updateStreak();

  showScreen(SCREENS.RESULTS);
}

function confirmExit() {
  stopTimer();
  hideModal();
  loadStats();
  showScreen(SCREENS.HOME);
}

// ============================================================================
// KEYBOARD HANDLING
// ============================================================================

function handleKeydown(e) {
  switch (state.screen) {
    case SCREENS.COUNTDOWN:
      if (e.code === 'Space') {
        e.preventDefault();
        skipCountdown();
      }
      break;

    case SCREENS.DRILL:
      if (elements.modalExit.classList.contains('hidden')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitAnswer();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          skipProblem();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          showExitModal();
        }
      } else {
        // Modal is open
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          hideModal();
        }
      }
      break;
  }
}

// ============================================================================
// STATS LOADING
// ============================================================================

async function loadStats() {
  state.bestScore = await storage.getBestScore();
  state.lastScore = await storage.getLastScore();

  // Load streak info
  const streakInfo = await storage.getStreakInfo();
  state.currentStreak = streakInfo.currentStreak;
  state.streakActive = streakInfo.isActive;

  // Update UI
  elements.statBest.textContent = state.bestScore > 0 ? state.bestScore : '--';
  elements.statLast.textContent = state.lastScore ? state.lastScore.score : '--';
  elements.streakCount.textContent = state.currentStreak;

  // Update streak visual state
  elements.statStreakContainer.classList.remove('streak-active', 'streak-inactive');
  if (state.currentStreak > 0) {
    elements.statStreakContainer.classList.add(state.streakActive ? 'streak-active' : 'streak-inactive');
  }
}

// ============================================================================
// HISTORY
// ============================================================================

function toggleHistory() {
  const isExpanded = elements.historyToggle.classList.toggle('expanded');
  elements.historyList.classList.toggle('hidden', !isExpanded);

  if (isExpanded) {
    loadHistory();
  }
}

async function loadHistory() {
  const history = await storage.getHistory();

  if (history.length === 0) {
    elements.historyEmpty.classList.remove('hidden');
    elements.historyItems.innerHTML = '';
    return;
  }

  elements.historyEmpty.classList.add('hidden');
  elements.historyItems.innerHTML = history.map(session => {
    const date = new Date(session.date);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    return `
      <div class="history-item">
        <span class="history-item__date">${dateStr} ${timeStr}</span>
        <div class="history-item__stats">
          <span class="history-item__stat">
            <span class="history-item__stat-value">${session.score}</span>
            <span class="history-item__stat-label">pts</span>
          </span>
          <span class="history-item__stat">
            <span class="history-item__stat-value">${session.accuracy}%</span>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  // Initialize storage-based settings
  await initTheme();
  await initSound();
  await loadStats();

  // Event listeners - Home
  elements.btnSound.addEventListener('click', handleSoundToggle);
  elements.btnTheme.addEventListener('click', cycleTheme);
  elements.btnStart.addEventListener('click', () => {
    initAudio();
    showScreen(SCREENS.COUNTDOWN);
  });
  elements.historyToggle.addEventListener('click', toggleHistory);

  // Event listeners - Drill
  elements.btnSubmit.addEventListener('click', submitAnswer);
  elements.btnSkip.addEventListener('click', skipProblem);
  elements.btnExit.addEventListener('click', showExitModal);

  // Event listeners - Results
  elements.btnRetry.addEventListener('click', () => {
    initAudio();
    showScreen(SCREENS.COUNTDOWN);
  });
  elements.btnHome.addEventListener('click', () => {
    loadStats();
    showScreen(SCREENS.HOME);
  });

  // Event listeners - Modal
  elements.btnContinue.addEventListener('click', hideModal);
  elements.btnConfirmExit.addEventListener('click', confirmExit);
  elements.modalBackdrop.addEventListener('click', hideModal);

  // Global keyboard handler
  document.addEventListener('keydown', handleKeydown);

  // System theme change listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === THEMES.SYSTEM) {
      applyTheme(THEMES.SYSTEM);
    }
  });

  // Start on home screen
  showScreen(SCREENS.HOME);
}

// Start the app
init();
