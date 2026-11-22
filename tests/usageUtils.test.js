import { test } from 'node:test';
import assert from 'node:assert/strict';
import usageUtils from '../src/utils/usageUtils.js';

const limits = { continuousFlowLimitMinutes: 5, wastageLimitLitres: 20 };

test('session starts above flow-stop and ends below it', () => {
  const s = usageUtils.updateSession(null, 3, 0, 0.1);
  assert.equal(s.startTime, 0);
  assert.equal(s.litres, 0);
  assert.equal(usageUtils.updateSession(s, 0.05, 1000, 0.1), null);
});

test('session accumulates litres from flow over time', () => {
  let s = usageUtils.updateSession(null, 6, 0, 0.1);
  s = usageUtils.updateSession(s, 6, 60000, 0.1);
  assert.equal(s.litres, 6);
});

test('continuous flow warning after configured minutes', () => {
  const s = usageUtils.updateSession(null, 2, 0, 0.1);
  assert.equal(usageUtils.evaluateSession(s, 4 * 60000, limits).continuousFlow, false);
  assert.equal(usageUtils.evaluateSession(s, 5 * 60000, limits).continuousFlow, true);
  assert.equal(usageUtils.evaluateSession(s, 9 * 60000, { ...limits, continuousFlowLimitMinutes: 10 }).continuousFlow, false);
});

test('wastage warning above litre limit', () => {
  let s = usageUtils.updateSession(null, 10, 0, 0.1);
  s = usageUtils.updateSession(s, 10, 2 * 60000, 0.1);
  assert.equal(usageUtils.evaluateSession(s, 2 * 60000, limits).wastage, true);
});

test('formatMinutes', () => {
  assert.equal(usageUtils.formatMinutes(5.5), '05:30');
});
