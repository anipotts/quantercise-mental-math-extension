// utils/generator.js
// Problem generation logic (ported from generator.ts)

import { OPERATION_SYMBOLS, QUICK_DRILL_PRESET } from './constants.js';

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick random element from array
 * @param {Array} array
 * @returns {*}
 */
function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate unique problem ID
 * @returns {string}
 */
function generateId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate an addition problem
 * @param {object} ranges - Number ranges configuration
 * @returns {object} Problem object
 */
function generateAddition(ranges) {
  const { min, max } = ranges.integers;
  const a = randomInt(min, max);
  const b = randomInt(min, max);
  return {
    id: generateId(),
    operation: '+',
    operand1: a,
    operand2: b,
    correctAnswer: a + b
  };
}

/**
 * Generate a subtraction problem (ensures non-negative result)
 * @param {object} ranges - Number ranges configuration
 * @returns {object} Problem object
 */
function generateSubtraction(ranges) {
  const { min, max } = ranges.integers;
  let a = randomInt(min, max);
  let b = randomInt(min, max);
  // Swap if a < b to ensure non-negative result
  if (a < b) [a, b] = [b, a];
  return {
    id: generateId(),
    operation: '-',
    operand1: a,
    operand2: b,
    correctAnswer: a - b
  };
}

/**
 * Generate a multiplication problem
 * First operand: 2-12 (times tables)
 * Second operand: from ranges (2-99)
 * @param {object} ranges - Number ranges configuration
 * @returns {object} Problem object
 */
function generateMultiplication(ranges) {
  const { min, max } = ranges.integers;
  // First operand: 2-12 (times tables range)
  const a = randomInt(2, 12);
  // Second operand: from preset ranges
  const b = randomInt(min, max);
  return {
    id: generateId(),
    operation: '*',
    operand1: a,
    operand2: b,
    correctAnswer: a * b
  };
}

/**
 * Generate a division problem (ensures integer result)
 * Key insight: Generate backwards - pick divisor and quotient, calculate dividend
 * This guarantees the result is always an integer
 * @param {object} ranges - Number ranges configuration
 * @returns {object} Problem object
 */
function generateDivision(ranges) {
  const { maxDividend, maxDivisor } = ranges.division;
  // Pick divisor (2-12)
  const divisor = randomInt(2, maxDivisor);
  // Calculate max quotient that keeps dividend <= maxDividend
  const maxQuotient = Math.floor(maxDividend / divisor);
  // Pick quotient (at least 1)
  const quotient = randomInt(1, Math.max(1, maxQuotient));
  // Calculate dividend (this ensures integer division)
  const dividend = divisor * quotient;

  return {
    id: generateId(),
    operation: '/',
    operand1: dividend,
    operand2: divisor,
    correctAnswer: quotient
  };
}

/**
 * Generate a single problem based on operation
 * @param {string} operation - One of '+', '-', '*', '/'
 * @param {object} ranges - Number ranges configuration
 * @returns {object} Problem object
 */
function generateProblem(operation, ranges) {
  switch (operation) {
    case '+': return generateAddition(ranges);
    case '-': return generateSubtraction(ranges);
    case '*': return generateMultiplication(ranges);
    case '/': return generateDivision(ranges);
    default: return generateAddition(ranges);
  }
}

/**
 * Generate a single problem for the Quick Drill preset
 * Randomly selects an operation and generates a problem
 * @returns {object} Problem object with id, operation, operands, and correctAnswer
 */
export function generateSingleProblem() {
  const preset = QUICK_DRILL_PRESET;
  const operation = pick(preset.operations);
  return generateProblem(operation, preset.numberRanges);
}

/**
 * Format a problem for display
 * @param {object} problem - Problem object
 * @returns {string} Formatted problem string (e.g., "17 × 8 =")
 */
export function formatProblem(problem) {
  const symbol = OPERATION_SYMBOLS[problem.operation];
  return `${problem.operand1} ${symbol} ${problem.operand2} =`;
}

/**
 * Validate user answer against correct answer
 * @param {string} userInput - User's input string
 * @param {number} correctAnswer - Correct answer
 * @returns {boolean|null} true if correct, false if wrong, null if empty/skipped
 */
export function validateAnswer(userInput, correctAnswer) {
  const trimmed = userInput.trim();

  // Empty input = skipped
  if (!trimmed) return null;

  const parsed = parseFloat(trimmed);

  // Invalid number = wrong
  if (isNaN(parsed)) return false;

  // Allow small tolerance for floating point comparison
  return Math.abs(parsed - correctAnswer) < 0.0001;
}
