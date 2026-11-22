// API Normalizers - convert FastAPI backend payloads into the app's common data format
// Accepts common field-name variants so the frontend tolerates small backend differences

const OUTLET_ALIASES = {
  main: 'main_inlet',
  inlet: 'main_inlet',
  main_inlet: 'main_inlet',
  kitchen: 'kitchen',
  kitchen_tap: 'kitchen',
  bathroom: 'bathroom',
  bathroom_tap: 'bathroom'
};

function firstDefined(obj, keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

/**
 * Parse ISO strings, epoch seconds or epoch milliseconds into epoch ms
 */
function toTimestamp(value) {
  if (value === undefined || value === null) return Date.now();
  if (typeof value === 'number') {
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function normalizeOutlet(value) {
  if (!value) return null;
  const key = String(value).toLowerCase().replace(/[\s-]+/g, '_');
  return OUTLET_ALIASES[key] || key;
}

/**
 * Normalize one sensor reading into:
 * { timestamp, source: 'HARDWARE_MODE', outlet, flow, cumulativeVolume, valid }
 */
function normalizeReading(raw) {
  const outlet = normalizeOutlet(firstDefined(raw, ['outlet', 'tap', 'tap_id', 'sensor', 'sensor_id', 'location']));
  const flow = Number(firstDefined(raw, ['flow', 'flow_rate', 'flow_lpm', 'flow_rate_lpm']));
  const cumulative = Number(firstDefined(raw, ['cumulativeVolume', 'cumulative_volume', 'total_litres', 'total_liters', 'volume']));

  return {
    timestamp: toTimestamp(firstDefined(raw, ['timestamp', 'time', 'recorded_at', 'created_at'])),
    source: 'HARDWARE_MODE',
    outlet,
    flow: Number.isFinite(flow) ? flow : null,
    cumulativeVolume: Number.isFinite(cumulative) ? cumulative : null,
    valid: raw.valid !== false && outlet !== null && Number.isFinite(flow)
  };
}

/**
 * Normalize a readings payload: an array, { readings: [...] }, { data: [...] }
 * or an object keyed by outlet ({ kitchen: {...}, bathroom: {...} })
 */
function normalizeReadings(payload) {
  if (!payload) return [];
  let list = payload;
  if (!Array.isArray(list)) {
    list = payload.readings || payload.data || payload.sensors || payload;
  }
  if (!Array.isArray(list) && list && typeof list === 'object') {
    list = Object.entries(list).map(([outlet, value]) => ({ outlet, ...value }));
  }
  if (!Array.isArray(list)) return [];
  return list.map(normalizeReading).filter(r => r.valid);
}

/**
 * Normalize consumption history into a list of { timestamp, litres }
 */
function normalizeConsumption(payload) {
  if (!payload) return [];
  const list = Array.isArray(payload) ? payload : payload.data || payload.consumption || payload.items || [];
  return list
    .map(item => ({
      timestamp: toTimestamp(firstDefined(item, ['timestamp', 'hour', 'date', 'period', 'time'])),
      litres: Number(firstDefined(item, ['litres', 'liters', 'volume', 'total_litres', 'total_liters', 'consumption']))
    }))
    .filter(item => Number.isFinite(item.litres));
}

// A backend reading older than this means the tap is no longer reporting flow
// (mirrors FLOW_STATE_WINDOW_SECONDS in the backend)
const STALE_READING_MS = 30000;

/** { byOutlet: { kitchen: 2 }, byId: { 2: 'kitchen' } } from GET /api/taps */
function buildTapMap(taps) {
  const map = { byOutlet: {}, byId: {} };
  (Array.isArray(taps) ? taps : []).forEach(tap => {
    if (tap.is_active === false) return;
    const outlet = normalizeOutlet(tap.tap_name);
    map.byOutlet[outlet] = tap.id;
    map.byId[tap.id] = outlet;
  });
  return map;
}

/** { tapId: litres } from GET /api/analytics/daily */
function totalsByTap(payload) {
  const totals = {};
  (payload?.buckets || []).forEach(b => {
    totals[b.tap_id] = Number(b.total_volume_litres) || 0;
  });
  return totals;
}

/**
 * Convert a backend ReadingOut into the app reading format.
 * source="simulation" readings stay flagged as simulated even in hardware mode.
 */
function normalizeBackendReading(raw, { outlet, todayLitres = null, now = Date.now() } = {}) {
  const timestamp = toTimestamp(raw.recorded_at);
  const stale = now - timestamp > STALE_READING_MS;
  const flow = Number(raw.flow_rate);
  return {
    timestamp,
    source: 'HARDWARE_MODE',
    outlet: outlet || normalizeOutlet(raw.tap_id),
    tapId: raw.tap_id,
    flow: stale ? 0 : (Number.isFinite(flow) ? flow : null),
    flowStatus: stale ? 'NO_FLOW' : raw.flow_status,
    cumulativeVolume: Number.isFinite(todayLitres) ? todayLitres : null,
    simulated: raw.source === 'simulation',
    stale,
    valid: Number.isFinite(flow)
  };
}

/**
 * Analytics buckets -> [{ timestamp, litres }]. Uses the main inlet when it has data
 * (it measures total supply); otherwise sums the monitored outlets.
 */
function consumptionPoints(buckets, inletTapId, getTimestamp) {
  const inlet = buckets.filter(b => b.tap_id === inletTapId);
  const selected = inlet.length > 0 ? inlet : buckets.filter(b => b.tap_id !== inletTapId);
  return selected
    .map(b => ({ timestamp: getTimestamp(b), litres: Number(b.total_volume_litres) }))
    .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.litres));
}

/**
 * Normalize backend alerts into the app's alert format
 */
function normalizeAlert(raw, tapOutlets = {}) {
  const remoteId = firstDefined(raw, ['id', 'alert_id']);
  return {
    id: `api_${remoteId ?? toTimestamp(raw.timestamp)}`,
    remoteId,
    type: firstDefined(raw, ['type', 'alert_type', 'category']) || 'alert',
    timestamp: toTimestamp(firstDefined(raw, ['timestamp', 'created_at', 'time'])),
    outlet: tapOutlets[raw.tap_id] || normalizeOutlet(firstDefined(raw, ['outlet', 'tap', 'tap_id'])),
    message: raw.message || raw.description || '',
    severity: raw.severity || 'warning',
    acknowledged: Boolean(raw.acknowledged) || raw.status === 'resolved',
    value: raw.value,
    unit: raw.unit,
    source: 'HARDWARE_MODE'
  };
}

function normalizeAlerts(payload, tapOutlets = {}) {
  if (!payload) return [];
  const list = Array.isArray(payload) ? payload : payload.items || payload.alerts || payload.data || [];
  return list.map(raw => normalizeAlert(raw, tapOutlets));
}

export default {
  STALE_READING_MS,
  buildTapMap,
  totalsByTap,
  normalizeBackendReading,
  consumptionPoints,
  toTimestamp,
  normalizeOutlet,
  normalizeReading,
  normalizeReadings,
  normalizeConsumption,
  normalizeAlert,
  normalizeAlerts
};
