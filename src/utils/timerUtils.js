// Timer Utilities - Timer logic and calculations
// Handles timer state, extensions, and expiry detection

/**
 * Create a new timer state
 * @param {string} outlet - Outlet name ('kitchen' or 'bathroom')
 * @param {number} durationMinutes - Duration in minutes
 * @returns {object} - Timer state object
 */
function createTimer(outlet, durationMinutes) {
  const now = Date.now();
  const deadline = now + (durationMinutes * 60 * 1000);
  
  return {
    id: generateTimerId(),
    outlet,
    startTime: now,
    durationMinutes,
    deadline,
    originalDeadline: deadline,
    paused: false,
    pausedAt: null,
    completed: false,
    expired: false,
    cancelledByFlowStop: false
  };
}

/**
 * Generate unique timer ID
 * @returns {string}
 */
function generateTimerId() {
  return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extend an existing timer
 * @param {object} timer - Current timer state
 * @param {number} additionalMinutes - Additional minutes to add
 * @returns {object} - Updated timer state
 */
function extendTimer(timer, additionalMinutes) {
  const additionalMs = additionalMinutes * 60 * 1000;
  const newDeadline = timer.deadline + additionalMs;
  
  return {
    ...timer,
    deadline: newDeadline,
    durationMinutes: timer.durationMinutes + additionalMinutes
  };
}

/**
 * Update timer to a new total duration from original start
 * @param {object} timer - Current timer state
 * @param {number} newTotalMinutes - New total duration in minutes
 * @returns {object} - Updated timer state
 */
function updateTimerDuration(timer, newTotalMinutes) {
  const newDeadline = timer.startTime + (newTotalMinutes * 60 * 1000);
  
  return {
    ...timer,
    deadline: newDeadline,
    durationMinutes: newTotalMinutes
  };
}

/**
 * Pause a timer
 * @param {object} timer - Current timer state
 * @returns {object} - Updated timer state
 */
function pauseTimer(timer) {
  if (timer.paused || timer.completed || timer.expired) {
    return timer;
  }
  
  return {
    ...timer,
    paused: true,
    pausedAt: Date.now()
  };
}

/**
 * Resume a paused timer
 * @param {object} timer - Current timer state
 * @returns {object} - Updated timer state
 */
function resumeTimer(timer) {
  if (!timer.paused || timer.completed || timer.expired) {
    return timer;
  }
  
  const pauseDuration = Date.now() - timer.pausedAt;
  const newDeadline = timer.deadline + pauseDuration;
  
  return {
    ...timer,
    paused: false,
    pausedAt: null,
    deadline: newDeadline
  };
}

/**
 * Stop/cancel a timer
 * @param {object} timer - Current timer state
 * @param {string} reason - Reason for stopping ('user', 'flow_stop', 'manual')
 * @returns {object} - Updated timer state
 */
function stopTimer(timer, reason = 'manual') {
  if (reason === 'flow_stop') {
    return {
      ...timer,
      completed: true,
      cancelledByFlowStop: true
    };
  }
  
  return {
    ...timer,
    completed: true
  };
}

/**
 * Mark timer as expired
 * @param {object} timer - Current timer state
 * @returns {object} - Updated timer state
 */
function markTimerExpired(timer) {
  return {
    ...timer,
    expired: true,
    completed: true
  };
}

/**
 * Calculate remaining time for a timer
 * @param {object} timer - Timer state
 * @returns {object} - Remaining time in various units
 */
function getRemainingTime(timer) {
  const now = Date.now();
  let remainingMs = timer.deadline - now;
  
  if (timer.paused) {
    remainingMs = timer.deadline - timer.pausedAt;
  }
  
  if (remainingMs < 0) {
    remainingMs = 0;
  }
  
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsPart = remainingSeconds % 60;
  
  return {
    totalMs: remainingMs,
    totalSeconds: remainingSeconds,
    totalMinutes: remainingMinutes,
    minutes: remainingMinutes,
    seconds: remainingSecondsPart,
    formatted: `${remainingMinutes.toString().padStart(2, '0')}:${remainingSecondsPart.toString().padStart(2, '0')}`
  };
}

/**
 * Calculate elapsed time for a timer
 * @param {object} timer - Timer state
 * @returns {object} - Elapsed time in various units
 */
function getElapsedTime(timer) {
  const now = Date.now();
  let elapsedMs = now - timer.startTime;
  
  if (timer.paused) {
    elapsedMs = timer.pausedAt - timer.startTime;
  }
  
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedSecondsPart = elapsedSeconds % 60;
  
  return {
    totalMs: elapsedMs,
    totalSeconds: elapsedSeconds,
    totalMinutes: elapsedMinutes,
    minutes: elapsedMinutes,
    seconds: elapsedSecondsPart,
    formatted: `${elapsedMinutes.toString().padStart(2, '0')}:${elapsedSecondsPart.toString().padStart(2, '0')}`
  };
}

/**
 * Check if timer has expired
 * @param {object} timer - Timer state
 * @returns {boolean}
 */
function isTimerExpired(timer) {
  if (timer.paused || timer.completed) {
    return false;
  }
  
  return Date.now() >= timer.deadline;
}

/**
 * Get timer progress percentage
 * @param {object} timer - Timer state
 * @returns {number} - Progress from 0 to 100
 */
function getTimerProgress(timer) {
  const totalDuration = timer.durationMinutes * 60 * 1000;
  const elapsed = getElapsedTime(timer).totalMs;
  const progress = (elapsed / totalDuration) * 100;
  
  return Math.min(100, Math.max(0, progress));
}

/**
 * Validate timer duration
 * @param {number} minutes - Duration in minutes
 * @returns {object} - Validation result
 */
function validateDuration(minutes) {
  if (isNaN(minutes) || minutes <= 0) {
    return {
      valid: false,
      error: 'Duration must be a positive number'
    };
  }
  
  if (minutes > 1440) {
    return {
      valid: false,
      error: 'Duration cannot exceed 24 hours'
    };
  }
  
  return {
    valid: true
  };
}

/**
 * Format duration for display
 * @param {number} minutes - Duration in minutes
 * @returns {string}
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${mins} min`;
}

export default {
  createTimer,
  generateTimerId,
  extendTimer,
  updateTimerDuration,
  pauseTimer,
  resumeTimer,
  stopTimer,
  markTimerExpired,
  getRemainingTime,
  getElapsedTime,
  isTimerExpired,
  getTimerProgress,
  validateDuration,
  formatDuration
};
