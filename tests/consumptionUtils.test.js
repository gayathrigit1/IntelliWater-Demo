import { test } from 'node:test';
import assert from 'node:assert/strict';
import consumptionUtils from '../src/utils/consumptionUtils.js';

const now = new Date(2026, 10, 22, 15, 30).getTime();
const hour = 60 * 60 * 1000;

test('addToBuckets ignores non-positive values', () => {
  const b = consumptionUtils.addToBuckets({}, now, 2);
  assert.equal(consumptionUtils.addToBuckets(b, now, -1), b);
  assert.equal(consumptionUtils.addToBuckets(b, now, 3)[consumptionUtils.hourKey(now)], 5);
});

test('hourly series covers last 24 hours and sums buckets', () => {
  let b = consumptionUtils.addToBuckets({}, now, 4);
  b = consumptionUtils.addToBuckets(b, now - 2 * hour, 6);
  const series = consumptionUtils.getHourlySeries(b, now, 24);
  assert.equal(series.length, 24);
  assert.equal(series.at(-1).value, 4);
  assert.equal(series.at(-3).value, 6);
});

test('daily series and today total', () => {
  let b = consumptionUtils.addToBuckets({}, now, 4);
  b = consumptionUtils.addToBuckets(b, now - hour, 6);
  b = consumptionUtils.addToBuckets(b, now - 24 * hour, 10);
  const series = consumptionUtils.getDailySeries(b, now, 7);
  assert.equal(series.length, 7);
  assert.equal(series.at(-1).value, 10);
  assert.equal(series.at(-2).value, 10);
  assert.equal(consumptionUtils.getTodayTotal(b, now), 10);
});

test('pruneBuckets drops old data', () => {
  const b = consumptionUtils.addToBuckets({}, now - 40 * 24 * hour, 5);
  assert.deepEqual(consumptionUtils.pruneBuckets(b, now, 31), {});
});
