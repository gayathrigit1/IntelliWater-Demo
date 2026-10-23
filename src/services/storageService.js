// Storage Service - Manages localStorage persistence for IntelliWater
// Handles user preferences, alert history, and demo data

const STORAGE_KEYS = {
  SETTINGS: 'intelliwater_settings',
  ALERTS: 'intelliwater_alerts',
  TIMER_STATE: 'intelliwater_timer_state',
  DEMO_HISTORY: 'intelliwater_demo_history'
};

// Default settings
const DEFAULT_SETTINGS = {
  mode: 'DEMO_MODE',
  defaultTimerDuration: 5, // minutes
  thresholds: {
    main_inlet: {
      lowFlow: 2.0,
      heavyFlow: 8.0,
      flowStop: 0.1
    },
    kitchen: {
      lowFlow: 1.0,
      heavyFlow: 5.0,
      flowStop: 0.1
    },
    bathroom: {
      lowFlow: 0.8,
      heavyFlow: 4.0,
      flowStop: 0.1
    }
  },
  discrepancyTolerance: 0.5, // L/min
  warningPersistenceDuration: 30, // seconds
  buzzerEnabled: true,
  hardwareAddress: ''
};

// Save settings to localStorage
function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to save settings:', error);
    return false;
  }
}

// Load settings from localStorage
function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error('[StorageService] Failed to load settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

// Reset settings to defaults
function resetSettings() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error('[StorageService] Failed to reset settings:', error);
    return false;
  }
}

// Save alert to history
function saveAlert(alert) {
  try {
    const alerts = loadAlerts();
    alerts.unshift(alert);
    // Keep only last 100 alerts
    const trimmedAlerts = alerts.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(trimmedAlerts));
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to save alert:', error);
    return false;
  }
}

// Load alert history
function loadAlerts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ALERTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[StorageService] Failed to load alerts:', error);
    return [];
  }
}

// Clear alert history
function clearAlerts() {
  try {
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to clear alerts:', error);
    return false;
  }
}

// Acknowledge alert
function acknowledgeAlert(alertId) {
  try {
    const alerts = loadAlerts();
    const updated = alerts.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to acknowledge alert:', error);
    return false;
  }
}

// Save timer state
function saveTimerState(timerState) {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(timerState));
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to save timer state:', error);
    return false;
  }
}

// Load timer state
function loadTimerState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[StorageService] Failed to load timer state:', error);
    return null;
  }
}

// Clear timer state
function clearTimerState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to clear timer state:', error);
    return false;
  }
}

// Save demo history entry
function saveDemoHistory(entry) {
  try {
    const history = loadDemoHistory();
    history.unshift(entry);
    // Keep only last 50 entries
    const trimmed = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.DEMO_HISTORY, JSON.stringify(trimmed));
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to save demo history:', error);
    return false;
  }
}

// Load demo history
function loadDemoHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DEMO_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[StorageService] Failed to load demo history:', error);
    return [];
  }
}

// Clear demo history
function clearDemoHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.DEMO_HISTORY);
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to clear demo history:', error);
    return false;
  }
}

// Clear all application data
function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('[StorageService] Failed to clear all data:', error);
    return false;
  }
}

export default {
  STORAGE_KEYS,
  saveSettings,
  loadSettings,
  resetSettings,
  saveAlert,
  loadAlerts,
  clearAlerts,
  acknowledgeAlert,
  saveTimerState,
  loadTimerState,
  clearTimerState,
  saveDemoHistory,
  loadDemoHistory,
  clearDemoHistory,
  clearAllData,
  DEFAULT_SETTINGS
};
