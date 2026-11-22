import { test } from 'node:test';
import assert from 'node:assert/strict';
import apiNormalizers from '../src/utils/apiNormalizers.js';

test('normalizes backend readings with snake_case aliases', () => {
  const [r] = apiNormalizers.normalizeReadings({
    readings: [{ tap_id: 'Kitchen', flow_rate: '2.4', total_litres: 120, recorded_at: '2026-11-22T10:00:00Z' }]
  });
  assert.equal(r.outlet, 'kitchen');
  assert.equal(r.flow, 2.4);
  assert.equal(r.cumulativeVolume, 120);
  assert.equal(r.source, 'HARDWARE_MODE');
});

test('drops readings without a valid flow value', () => {
  assert.deepEqual(apiNormalizers.normalizeReadings([{ outlet: 'kitchen' }]), []);
});

test('accepts readings keyed by outlet', () => {
  const list = apiNormalizers.normalizeReadings({ bathroom: { flow: 1.5 } });
  assert.equal(list[0].outlet, 'bathroom');
});

test('normalizes alerts and consumption', () => {
  const [a] = apiNormalizers.normalizeAlerts({ alerts: [{ id: 7, alert_type: 'water_wastage', tap: 'kitchen' }] });
  assert.equal(a.remoteId, 7);
  assert.equal(a.type, 'water_wastage');
  assert.equal(a.source, 'HARDWARE_MODE');
  const c = apiNormalizers.normalizeConsumption([{ hour: '2026-11-22T10:00:00Z', liters: 12 }]);
  assert.equal(c[0].litres, 12);
});

test('maps backend taps and alerts by tap id', () => {
  const map = apiNormalizers.buildTapMap([
    { id: 1, tap_name: 'main_inlet' }, { id: 2, tap_name: 'kitchen' }, { id: 4, tap_name: 'garden', is_active: false }
  ]);
  assert.deepEqual(map.byOutlet, { main_inlet: 1, kitchen: 2 });
  const [a] = apiNormalizers.normalizeAlerts(
    { items: [{ id: 9, tap_id: 2, alert_type: 'forgotten_tap', status: 'resolved', created_at: '2026-11-22T10:00:00Z' }], total: 1 },
    map.byId
  );
  assert.equal(a.outlet, 'kitchen');
  assert.equal(a.acknowledged, true);
});

test('backend reading keeps simulation flag and goes stale after 30 s', () => {
  const now = Date.parse('2026-11-22T10:00:10Z');
  const raw = { tap_id: 2, flow_rate: 3, flow_status: 'NORMAL_FLOW', source: 'simulation', recorded_at: '2026-11-22T10:00:00Z' };
  const r = apiNormalizers.normalizeBackendReading(raw, { outlet: 'kitchen', todayLitres: 12.5, now });
  assert.equal(r.flow, 3);
  assert.equal(r.simulated, true);
  assert.equal(r.cumulativeVolume, 12.5);
  const stale = apiNormalizers.normalizeBackendReading(raw, { outlet: 'kitchen', now: now + 60000 });
  assert.equal(stale.flow, 0);
  assert.equal(stale.flowStatus, 'NO_FLOW');
});

test('consumption points prefer the main inlet', () => {
  const buckets = [
    { tap_id: 1, hour: '2026-11-22T10:00:00+00:00', total_volume_litres: 8 },
    { tap_id: 2, hour: '2026-11-22T10:00:00+00:00', total_volume_litres: 3 }
  ];
  assert.deepEqual(apiNormalizers.consumptionPoints(buckets, 1, b => Date.parse(b.hour)).map(p => p.litres), [8]);
  assert.deepEqual(apiNormalizers.consumptionPoints(buckets.slice(1), 1, b => Date.parse(b.hour)).map(p => p.litres), [3]);
});
