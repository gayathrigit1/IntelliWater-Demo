// Consumption Utilities - hourly/daily water consumption bucketing
// Buckets are plain objects keyed by local hour: { 'YYYY-MM-DDTHH': litres }

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function pad(n) {
  return String(n).padStart(2, '0');
}

function dayKey(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hourKey(timestamp) {
  const d = new Date(timestamp);
  return `${dayKey(timestamp)}T${pad(d.getHours())}`;
}

function startOfHour(timestamp) {
  const d = new Date(timestamp);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function startOfDay(timestamp) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Add litres to the bucket for the given timestamp (returns a new object)
 */
function addToBuckets(buckets, timestamp, litres) {
  if (!Number.isFinite(litres) || litres <= 0) return buckets;
  const key = hourKey(timestamp);
  return { ...buckets, [key]: (buckets[key] || 0) + litres };
}

/**
 * Drop buckets older than `days` days
 */
function pruneBuckets(buckets, now, days = 31) {
  const cutoff = dayKey(startOfDay(now) - days * DAY_MS);
  return Object.fromEntries(
    Object.entries(buckets).filter(([key]) => key.slice(0, 10) >= cutoff)
  );
}

/**
 * Hourly series for the last `hours` hours, oldest first
 * @returns {Array<{key: string, label: string, timestamp: number, value: number}>}
 */
function getHourlySeries(buckets, now, hours = 24) {
  const current = startOfHour(now);
  const series = [];
  for (let i = hours - 1; i >= 0; i--) {
    const ts = current - i * HOUR_MS;
    const key = hourKey(ts);
    series.push({
      key,
      label: `${pad(new Date(ts).getHours())}:00`,
      timestamp: ts,
      value: buckets[key] || 0
    });
  }
  return series;
}

/**
 * Daily series for the last `days` days, oldest first
 */
function getDailySeries(buckets, now, days = 7) {
  const totals = {};
  Object.entries(buckets).forEach(([key, litres]) => {
    const day = key.slice(0, 10);
    totals[day] = (totals[day] || 0) + litres;
  });

  const today = startOfDay(now);
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    // Use noon to avoid DST edge cases when stepping back by days
    const ts = today - i * DAY_MS + 12 * HOUR_MS;
    const key = dayKey(ts);
    const d = new Date(ts);
    series.push({
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      timestamp: startOfDay(ts),
      value: totals[key] || 0
    });
  }
  return series;
}

/**
 * Total litres recorded for the calendar day containing `now`
 */
function getTodayTotal(buckets, now) {
  const today = dayKey(now);
  return Object.entries(buckets)
    .filter(([key]) => key.startsWith(today))
    .reduce((sum, [, litres]) => sum + litres, 0);
}

/**
 * Build buckets from a list of { timestamp, litres } points (e.g. backend data)
 */
function bucketsFromPoints(points) {
  return points.reduce(
    (buckets, point) => addToBuckets(buckets, point.timestamp, point.litres),
    {}
  );
}

export default {
  hourKey,
  dayKey,
  addToBuckets,
  pruneBuckets,
  getHourlySeries,
  getDailySeries,
  getTodayTotal,
  bucketsFromPoints
};
