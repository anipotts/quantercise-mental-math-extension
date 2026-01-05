// utils/storage.js
// Storage abstraction for chrome.storage.local with localStorage fallback

import { STORAGE_KEYS } from './constants.js';

/**
 * Storage wrapper that works in both extension and web contexts
 */
class Storage {
  constructor() {
    this.isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} - Stored value or null
   */
  async get(key) {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] ?? null);
        });
      });
    }
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  async set(key, value) {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
      console.warn('Failed to save to localStorage:', key);
    }
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   */
  async remove(key) {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve);
      });
    }
    localStorage.removeItem(key);
  }

  // ========================================
  // Convenience methods
  // ========================================

  /**
   * Get theme preference
   * @returns {Promise<'light'|'dark'|'system'>}
   */
  async getTheme() {
    return (await this.get(STORAGE_KEYS.theme)) || 'system';
  }

  /**
   * Set theme preference
   * @param {'light'|'dark'|'system'} theme
   */
  async setTheme(theme) {
    await this.set(STORAGE_KEYS.theme, theme);
  }

  /**
   * Get sound enabled state
   * @returns {Promise<boolean>}
   */
  async getSoundEnabled() {
    const value = await this.get(STORAGE_KEYS.soundEnabled);
    return value !== false; // Default to true
  }

  /**
   * Set sound enabled state
   * @param {boolean} enabled
   */
  async setSoundEnabled(enabled) {
    await this.set(STORAGE_KEYS.soundEnabled, enabled);
  }

  /**
   * Get best score
   * @returns {Promise<number>}
   */
  async getBestScore() {
    return (await this.get(STORAGE_KEYS.bestScore)) || 0;
  }

  /**
   * Set best score (only if higher than current)
   * @param {number} score
   * @returns {Promise<boolean>} - True if new record
   */
  async setBestScore(score) {
    const current = await this.getBestScore();
    if (score > current) {
      await this.set(STORAGE_KEYS.bestScore, score);
      return true; // New record
    }
    return false;
  }

  /**
   * Get last score details
   * @returns {Promise<object|null>}
   */
  async getLastScore() {
    return await this.get(STORAGE_KEYS.lastScore);
  }

  /**
   * Set last score details
   * @param {object} scoreData
   */
  async setLastScore(scoreData) {
    await this.set(STORAGE_KEYS.lastScore, scoreData);
  }

  /**
   * Get total drills completed
   * @returns {Promise<number>}
   */
  async getTotalDrills() {
    return (await this.get(STORAGE_KEYS.totalDrills)) || 0;
  }

  /**
   * Increment total drills
   */
  async incrementTotalDrills() {
    const current = await this.getTotalDrills();
    await this.set(STORAGE_KEYS.totalDrills, current + 1);
  }

  /**
   * Get session history
   * @returns {Promise<Array>}
   */
  async getHistory() {
    return (await this.get(STORAGE_KEYS.history)) || [];
  }

  /**
   * Add session to history (keeps last 20)
   * @param {object} session
   */
  async addToHistory(session) {
    const history = await this.getHistory();
    history.unshift(session);
    // Keep last 20 sessions
    const trimmed = history.slice(0, 20);
    await this.set(STORAGE_KEYS.history, trimmed);
  }

  // ========================================
  // Streak methods
  // ========================================

  /**
   * Get current streak
   * @returns {Promise<number>}
   */
  async getCurrentStreak() {
    return (await this.get(STORAGE_KEYS.currentStreak)) || 0;
  }

  /**
   * Get longest streak
   * @returns {Promise<number>}
   */
  async getLongestStreak() {
    return (await this.get(STORAGE_KEYS.longestStreak)) || 0;
  }

  /**
   * Get last activity date (ISO string)
   * @returns {Promise<string|null>}
   */
  async getLastActivityDate() {
    return await this.get(STORAGE_KEYS.lastActivityDate);
  }

  /**
   * Update streak on drill completion
   * Logic: Same day = no change, next day = +1, 2+ days gap = reset to 1
   * @returns {Promise<{currentStreak: number, longestStreak: number, isNewRecord: boolean}>}
   */
  async updateStreak() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const lastActivityStr = await this.getLastActivityDate();
    let currentStreak = await this.getCurrentStreak();
    let longestStreak = await this.getLongestStreak();

    if (!lastActivityStr) {
      // First ever activity
      currentStreak = 1;
    } else {
      const lastDate = new Date(lastActivityStr);
      const today = new Date(todayStr);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day - no change to streak
      } else if (diffDays === 1) {
        // Consecutive day - increment streak
        currentStreak += 1;
      } else {
        // Streak broken - reset to 1
        currentStreak = 1;
      }
    }

    // Update longest streak if needed
    const isNewRecord = currentStreak > longestStreak;
    if (isNewRecord) {
      longestStreak = currentStreak;
      await this.set(STORAGE_KEYS.longestStreak, longestStreak);
    }

    // Save current streak and activity date
    await this.set(STORAGE_KEYS.currentStreak, currentStreak);
    await this.set(STORAGE_KEYS.lastActivityDate, todayStr);

    return { currentStreak, longestStreak, isNewRecord };
  }

  /**
   * Get streak info (for display)
   * Also checks if streak is still active (not expired)
   * @returns {Promise<{currentStreak: number, longestStreak: number, isActive: boolean}>}
   */
  async getStreakInfo() {
    const lastActivityStr = await this.getLastActivityDate();
    let currentStreak = await this.getCurrentStreak();
    const longestStreak = await this.getLongestStreak();

    // Check if streak is still active (activity within last 24-48 hours)
    let isActive = false;
    if (lastActivityStr) {
      const lastDate = new Date(lastActivityStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

      // Streak is active if activity was today or yesterday
      isActive = diffDays <= 1;

      // If more than 1 day gap, streak would reset on next activity
      if (diffDays > 1) {
        currentStreak = 0; // Show 0 to indicate broken streak
      }
    }

    return { currentStreak, longestStreak, isActive };
  }
}

// Export singleton instance
export const storage = new Storage();
