// Monitoring Service - single source of live readings for every page
// DEMO_MODE: simulated readings from demoSensorService (clearly tagged, never presented as real)
// HARDWARE_MODE: real readings from the FastAPI backend via apiService (no simulated fallback)
// Also tracks per-tap continuous-flow sessions, raises wastage warnings and records consumption.

import demoSensorService from './demoSensorService';
import apiService from './apiService';
import storageService from './storageService';
import flowUtils from '../utils/flowUtils';
import usageUtils from '../utils/usageUtils';
import consumptionUtils from '../utils/consumptionUtils';

const TAP_OUTLETS = ['kitchen', 'bathroom'];
const DEMO_POLL_MS = 1000;
const HARDWARE_POLL_MS = 2000;

const OUTLET_LABELS = {
  main_inlet: 'Main Inlet',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom'
};

let snapshot = {
  source: storageService.loadSettings().mode,
  connectionStatus: 'CONNECTING',
  readings: {},
  classifications: {},
  tapUsage: {},
  activeWarnings: [],
  lastUpdated: null,
  error: null,
  alertsVersion: 0,
  backendSimulated: false
};

let listeners = new Set();
let pollTimer = null;
let polling = false;
let sessions = {};
let lastCumulative = {};
let lastSource = null;

function emit(patch) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(listener => listener());
}

function raiseAlert(alert) {
  storageService.saveAlert({
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    acknowledged: false,
    ...alert
  });
  return true;
}

function recordConsumption(source, readingsByOutlet) {
  const inlet = readingsByOutlet.main_inlet;
  if (!inlet || inlet.cumulativeVolume === null || inlet.cumulativeVolume === undefined) return;

  const previous = lastCumulative[source];
  lastCumulative[source] = inlet.cumulativeVolume;
  if (previous === undefined) return;

  const delta = inlet.cumulativeVolume - previous;
  // Ignore counter resets (device reboot / demo reset)
  if (delta <= 0) return;

  const buckets = consumptionUtils.addToBuckets(
    storageService.loadConsumption(source),
    inlet.timestamp,
    delta
  );
  storageService.saveConsumption(source, consumptionUtils.pruneBuckets(buckets, Date.now()));
}

function updateTapUsage(source, readingsByOutlet, settings, now) {
  const limits = {
    continuousFlowLimitMinutes: settings.continuousFlowLimitMinutes,
    wastageLimitLitres: settings.wastageLimitLitres
  };
  const tapUsage = {};
  const activeWarnings = [];
  let alertsRaised = false;

  TAP_OUTLETS.forEach(outlet => {
    const reading = readingsByOutlet[outlet];
    if (!reading) {
      sessions[outlet] = null;
      tapUsage[outlet] = null;
      return;
    }

    const flowStop = settings.thresholds[outlet]?.flowStop ?? 0.1;
    let session = usageUtils.updateSession(sessions[outlet], reading.flow, reading.timestamp, flowStop);
    const evaluation = usageUtils.evaluateSession(session, now, limits);
    const label = OUTLET_LABELS[outlet];

    if (session && evaluation.continuousFlow) {
      activeWarnings.push({
        type: 'continuous_flow',
        outlet,
        severity: 'warning',
        message: `${label} tap has been running continuously for ${usageUtils.formatMinutes(evaluation.durationMinutes)} (limit ${limits.continuousFlowLimitMinutes} min)`
      });
      if (!session.continuousAlerted) {
        session = { ...session, continuousAlerted: true };
        alertsRaised = raiseAlert({
          type: 'continuous_flow',
          outlet,
          severity: 'warning',
          source,
          value: Number(evaluation.durationMinutes.toFixed(1)),
          threshold: limits.continuousFlowLimitMinutes,
          unit: 'min',
          message: `Continuous flow: ${label} tap running for over ${limits.continuousFlowLimitMinutes} minutes`
        });
      }
    }

    if (session && evaluation.wastage) {
      activeWarnings.push({
        type: 'water_wastage',
        outlet,
        severity: 'critical',
        message: `Possible water wastage at ${label}: ${evaluation.litres.toFixed(1)} L used in one continuous run (limit ${limits.wastageLimitLitres} L)`
      });
      if (!session.wastageAlerted) {
        session = { ...session, wastageAlerted: true };
        alertsRaised = raiseAlert({
          type: 'water_wastage',
          outlet,
          severity: 'critical',
          source,
          value: Number(evaluation.litres.toFixed(1)),
          threshold: limits.wastageLimitLitres,
          unit: 'L',
          message: `Water wastage: ${label} used over ${limits.wastageLimitLitres} L in one continuous run`
        });
      }
    }

    sessions[outlet] = session;
    tapUsage[outlet] = {
      running: Boolean(session),
      startTime: session ? session.startTime : null,
      durationMinutes: evaluation.durationMinutes,
      litres: evaluation.litres
    };
  });

  return { tapUsage, activeWarnings, alertsRaised };
}

async function fetchReadings(source) {
  if (source === 'HARDWARE_MODE') {
    return apiService.getLatestReadings();
  }
  return demoSensorService.getAllReadings();
}

async function tick() {
  if (polling) return;
  polling = true;

  const settings = storageService.loadSettings();
  const source = settings.mode;

  if (source !== lastSource) {
    // Never carry usage sessions or warnings across data sources
    sessions = {};
    lastSource = source;
    emit({
      source,
      readings: {},
      classifications: {},
      tapUsage: {},
      activeWarnings: [],
      error: null,
      connectionStatus: source === 'HARDWARE_MODE' ? 'CONNECTING' : 'SIMULATED'
    });
  }

  try {
    const list = await fetchReadings(source);
    const readings = {};
    const classifications = {};
    list.forEach(reading => {
      readings[reading.outlet] = reading;
      const thresholds = settings.thresholds[reading.outlet] || settings.thresholds.kitchen;
      // Hardware mode: the backend classifies flow with its own thresholds
      classifications[reading.outlet] = reading.flowStatus || flowUtils.classifyFlow(reading.flow, thresholds);
    });

    const now = Date.now();
    recordConsumption(source, readings);
    const { tapUsage, activeWarnings, alertsRaised } = updateTapUsage(source, readings, settings, now);

    emit({
      source,
      connectionStatus: source === 'HARDWARE_MODE' ? 'CONNECTED' : 'SIMULATED',
      backendSimulated: list.some(reading => reading.simulated),
      readings,
      classifications,
      tapUsage,
      activeWarnings,
      lastUpdated: now,
      error: null,
      alertsVersion: snapshot.alertsVersion + (alertsRaised ? 1 : 0)
    });
  } catch (error) {
    // Hardware mode failure: show no readings rather than substituting simulated values
    sessions = {};
    emit({
      source,
      connectionStatus: 'DISCONNECTED',
      readings: {},
      classifications: {},
      tapUsage: {},
      activeWarnings: [],
      error: error.message
    });
  } finally {
    polling = false;
    schedule(source);
  }
}

function schedule(source) {
  if (listeners.size === 0) return;
  clearTimeout(pollTimer);
  pollTimer = setTimeout(tick, source === 'HARDWARE_MODE' ? HARDWARE_POLL_MS : DEMO_POLL_MS);
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  };
}

function getSnapshot() {
  return snapshot;
}

// Force an immediate refresh (e.g. after switching mode in Settings)
function refresh() {
  clearTimeout(pollTimer);
  tick();
}

/**
 * Hourly (last 24 h) and daily (last 7 days) consumption for the active source.
 * Hardware mode prefers backend history; falls back to consumption recorded locally from real readings.
 */
async function getConsumptionHistory(now = Date.now()) {
  const source = storageService.loadSettings().mode;

  if (source === 'HARDWARE_MODE') {
    try {
      const [hourlyPoints, dailyPoints] = await Promise.all([
        apiService.getHourlyConsumption(now),
        apiService.getDailyConsumption(7, now)
      ]);
      return {
        source,
        origin: 'backend',
        hourly: consumptionUtils.getHourlySeries(consumptionUtils.bucketsFromPoints(hourlyPoints), now, 24),
        daily: consumptionUtils.getDailySeries(consumptionUtils.bucketsFromPoints(dailyPoints), now, 7),
        today: consumptionUtils.getTodayTotal(consumptionUtils.bucketsFromPoints(dailyPoints), now)
      };
    } catch (error) {
      const buckets = storageService.loadConsumption(source);
      return {
        source,
        origin: 'local',
        error: error.message,
        hourly: consumptionUtils.getHourlySeries(buckets, now, 24),
        daily: consumptionUtils.getDailySeries(buckets, now, 7),
        today: consumptionUtils.getTodayTotal(buckets, now)
      };
    }
  }

  const buckets = storageService.loadConsumption(source);
  return {
    source,
    origin: 'local',
    hourly: consumptionUtils.getHourlySeries(buckets, now, 24),
    daily: consumptionUtils.getDailySeries(buckets, now, 7),
    today: consumptionUtils.getTodayTotal(buckets, now)
  };
}

export default {
  TAP_OUTLETS,
  OUTLET_LABELS,
  subscribe,
  getSnapshot,
  refresh,
  getConsumptionHistory
};
