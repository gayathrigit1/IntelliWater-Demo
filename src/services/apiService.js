// API Service - communication with the IntelliWater FastAPI backend
// All endpoint paths live in ENDPOINTS so they can be aligned with the backend in one place.
// Data returned from here is real backend/sensor data and is tagged source: 'HARDWARE_MODE'.

import storageService from './storageService';
import apiNormalizers from '../utils/apiNormalizers';

const DEFAULT_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 5000;

const ENDPOINTS = {
  health: '/api/health',
  latestReadings: '/api/readings/latest',
  hourlyConsumption: '/api/consumption/hourly',
  dailyConsumption: '/api/consumption/daily',
  alerts: '/api/alerts',
  acknowledgeAlert: (id) => `/api/alerts/${encodeURIComponent(id)}/acknowledge`,
  timerStart: '/api/timer/start',
  timerExtend: '/api/timer/extend',
  timerStop: '/api/timer/stop',
  settings: '/api/settings'
};

class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getBaseUrl() {
  const configured = storageService.loadSettings().apiBaseUrl;
  return (configured || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function request(path, { method = 'GET', body, params, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const url = new URL(`${getBaseUrl()}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ApiError(`Backend responded with ${response.status}`, response.status);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError(`Backend request timed out after ${timeout} ms`);
    }
    throw new ApiError(`Cannot reach backend at ${getBaseUrl()}`);
  } finally {
    clearTimeout(timer);
  }
}

async function checkHealth() {
  try {
    const data = await request(ENDPOINTS.health, { timeout: 3000 });
    return { healthy: true, baseUrl: getBaseUrl(), data };
  } catch (error) {
    return { healthy: false, baseUrl: getBaseUrl(), error: error.message };
  }
}

async function getLatestReadings() {
  return apiNormalizers.normalizeReadings(await request(ENDPOINTS.latestReadings));
}

async function getHourlyConsumption(hours = 24) {
  return apiNormalizers.normalizeConsumption(
    await request(ENDPOINTS.hourlyConsumption, { params: { hours } })
  );
}

async function getDailyConsumption(days = 7) {
  return apiNormalizers.normalizeConsumption(
    await request(ENDPOINTS.dailyConsumption, { params: { days } })
  );
}

async function getAlerts(limit = 100) {
  return apiNormalizers.normalizeAlerts(await request(ENDPOINTS.alerts, { params: { limit } }));
}

function acknowledgeAlert(remoteId) {
  return request(ENDPOINTS.acknowledgeAlert(remoteId), { method: 'POST' });
}

function startTimer(outlet, durationMinutes) {
  return request(ENDPOINTS.timerStart, { method: 'POST', body: { outlet, duration_minutes: durationMinutes } });
}

function extendTimer(outlet, additionalMinutes) {
  return request(ENDPOINTS.timerExtend, { method: 'POST', body: { outlet, additional_minutes: additionalMinutes } });
}

function stopTimer(outlet) {
  return request(ENDPOINTS.timerStop, { method: 'POST', body: { outlet } });
}

function pushSettings(settings) {
  return request(ENDPOINTS.settings, {
    method: 'POST',
    body: {
      thresholds: settings.thresholds,
      default_timer_minutes: settings.defaultTimerDuration,
      continuous_flow_limit_minutes: settings.continuousFlowLimitMinutes,
      wastage_limit_litres: settings.wastageLimitLitres,
      buzzer_enabled: settings.buzzerEnabled
    }
  });
}

export default {
  ENDPOINTS,
  DEFAULT_BASE_URL,
  ApiError,
  getBaseUrl,
  request,
  checkHealth,
  getLatestReadings,
  getHourlyConsumption,
  getDailyConsumption,
  getAlerts,
  acknowledgeAlert,
  startTimer,
  extendTimer,
  stopTimer,
  pushSettings
};
