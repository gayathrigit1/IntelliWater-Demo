// API Service - communication with the IntelliWater FastAPI backend
// All endpoint paths live in ENDPOINTS so they can be aligned with the backend in one place.
// Data returned from here is real backend/sensor data and is tagged source: 'HARDWARE_MODE'.

import storageService from './storageService';
import apiNormalizers from '../utils/apiNormalizers';

const DEFAULT_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 5000;
const OUTLETS = ['main_inlet', 'kitchen', 'bathroom'];

// Routes of the IntelliWater FastAPI backend (app/routers/*.py)
const ENDPOINTS = {
  health: '/api/health',
  taps: '/api/taps',
  tap: (tapId) => `/api/taps/${tapId}`,
  tapTimer: (tapId) => `/api/taps/${tapId}/timer`,
  latestReading: '/api/readings/latest',
  hourlyAnalytics: '/api/analytics/hourly',
  dailyAnalytics: '/api/analytics/daily',
  alerts: '/api/alerts',
  resolveAlert: (alertId) => `/api/alerts/${encodeURIComponent(alertId)}/resolve`
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

// Backend identifies taps by numeric id; the frontend uses outlet names (tap_name)
let tapCache = { baseUrl: null, map: null };

async function getTapMap({ force = false } = {}) {
  const baseUrl = getBaseUrl();
  if (!force && tapCache.map && tapCache.baseUrl === baseUrl) return tapCache.map;
  const map = apiNormalizers.buildTapMap(await request(ENDPOINTS.taps));
  tapCache = { baseUrl, map };
  return map;
}

async function requireTapId(outlet) {
  let map = await getTapMap();
  if (!map.byOutlet[outlet]) map = await getTapMap({ force: true });
  const tapId = map.byOutlet[outlet];
  if (!tapId) throw new ApiError(`Backend has no tap named '${outlet}'`, 404);
  return tapId;
}

function utcDay(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Latest reading per outlet, plus today's litres per tap (from daily analytics)
 * as the cumulative volume. Outlets without any reading are omitted.
 */
async function getLatestReadings(now = Date.now()) {
  const map = await getTapMap();
  const outlets = OUTLETS.filter(outlet => map.byOutlet[outlet]);
  const [daily, ...latest] = await Promise.all([
    request(ENDPOINTS.dailyAnalytics),
    ...outlets.map(outlet =>
      request(ENDPOINTS.latestReading, { params: { tap_id: map.byOutlet[outlet] } }).catch(error => {
        if (error.status === 404) return null;
        throw error;
      })
    )
  ]);
  const todayByTap = apiNormalizers.totalsByTap(daily);

  return latest
    .map((raw, index) => raw && apiNormalizers.normalizeBackendReading(raw, {
      outlet: outlets[index],
      todayLitres: todayByTap[raw.tap_id] ?? null,
      now
    }))
    .filter(Boolean);
}

/** Hourly litres for the last ~24 h (today and yesterday, UTC days) */
async function getHourlyConsumption(now = Date.now()) {
  const map = await getTapMap();
  const days = [utcDay(now - 24 * 60 * 60 * 1000), utcDay(now)];
  const responses = await Promise.all(
    days.map(day => request(ENDPOINTS.hourlyAnalytics, { params: { day } }))
  );
  const buckets = responses.flatMap(r => r?.buckets || []);
  return apiNormalizers.consumptionPoints(buckets, map.byOutlet.main_inlet, b => Date.parse(b.hour));
}

/** Daily litres for the last `days` days (one request per UTC day) */
async function getDailyConsumption(days = 7, now = Date.now()) {
  const map = await getTapMap();
  const dayList = Array.from({ length: days }, (_, i) => utcDay(now - i * 24 * 60 * 60 * 1000));
  const responses = await Promise.all(
    dayList.map(day => request(ENDPOINTS.dailyAnalytics, { params: { day } }))
  );
  const buckets = responses.flatMap((r, i) => (r?.buckets || []).map(b => ({ ...b, day: dayList[i] })));
  return apiNormalizers.consumptionPoints(buckets, map.byOutlet.main_inlet, b => Date.parse(`${b.day}T12:00:00Z`));
}

async function getAlerts(limit = 100) {
  const map = await getTapMap();
  return apiNormalizers.normalizeAlerts(await request(ENDPOINTS.alerts, { params: { limit } }), map.byId);
}

async function acknowledgeAlert(remoteId) {
  try {
    return await request(ENDPOINTS.resolveAlert(remoteId), { method: 'POST' });
  } catch (error) {
    if (error.status === 409) return null; // already resolved
    throw error;
  }
}

// Backend timer durations are whole minutes; it caps totals at MAX_TIMER_MINUTES (default 10)
const wholeMinutes = minutes => Math.max(1, Math.round(minutes));

async function startTimer(outlet, durationMinutes) {
  const tapId = await requireTapId(outlet);
  return request(ENDPOINTS.tapTimer(tapId), {
    method: 'POST',
    body: { action: 'start', duration_minutes: wholeMinutes(durationMinutes) }
  });
}

async function extendTimer(outlet, additionalMinutes) {
  const tapId = await requireTapId(outlet);
  return request(ENDPOINTS.tapTimer(tapId), {
    method: 'POST',
    body: { action: 'extend', extend_minutes: wholeMinutes(additionalMinutes) }
  });
}

async function stopTimer(outlet) {
  const tapId = await requireTapId(outlet);
  try {
    return await request(ENDPOINTS.tapTimer(tapId), { method: 'POST', body: { action: 'stop' } });
  } catch (error) {
    if (error.status === 404) return null; // no active timer on the backend
    throw error;
  }
}

/** The backend stores only the per-tap default timer; flow thresholds live in its .env */
async function pushSettings(settings) {
  const map = await getTapMap({ force: true });
  return Promise.all(
    Object.values(map.byOutlet).map(tapId =>
      request(ENDPOINTS.tap(tapId), {
        method: 'PATCH',
        body: { timer_duration_minutes: wholeMinutes(settings.defaultTimerDuration) }
      })
    )
  );
}

export default {
  ENDPOINTS,
  DEFAULT_BASE_URL,
  ApiError,
  getBaseUrl,
  request,
  checkHealth,
  getTapMap,
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
