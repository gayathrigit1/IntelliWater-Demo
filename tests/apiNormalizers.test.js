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
