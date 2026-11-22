// Usage Utilities - per-tap continuous-flow sessions and wastage detection
// Shared by demo and hardware modes

/**
 * Advance a tap usage session with a new flow reading.
 * A session starts when flow rises above the flow-stop threshold and ends when it drops back.
 * @param {object|null} session - { startTime, lastTimestamp, litres, continuousAlerted, wastageAlerted }
 * @param {number} flow - Flow in L/min
 * @param {number} timestamp - Reading time (ms)
 * @param {number} flowStop - Flow-stop threshold (L/min)
 * @returns {object|null} - Updated session, or null when the tap is off
 */
function updateSession(session, flow, timestamp, flowStop) {
  if (!Number.isFinite(flow) || flow <= flowStop) {
    return null;
  }

  if (!session) {
    return {
      startTime: timestamp,
      lastTimestamp: timestamp,
      litres: 0,
      continuousAlerted: false,
      wastageAlerted: false
    };
  }

  const elapsedMinutes = Math.max(0, timestamp - session.lastTimestamp) / 60000;
  return {
    ...session,
    lastTimestamp: timestamp,
    litres: session.litres + flow * elapsedMinutes
  };
}

function getSessionDurationMinutes(session, now) {
  if (!session) return 0;
  return Math.max(0, now - session.startTime) / 60000;
}

/**
 * Evaluate continuous-flow and wastage conditions for a session
 * @param {object|null} session
 * @param {number} now
 * @param {object} limits - { continuousFlowLimitMinutes, wastageLimitLitres }
 */
function evaluateSession(session, now, limits) {
  if (!session) {
    return { continuousFlow: false, wastage: false, durationMinutes: 0, litres: 0 };
  }
  const durationMinutes = getSessionDurationMinutes(session, now);
  return {
    continuousFlow: durationMinutes >= limits.continuousFlowLimitMinutes,
    wastage: session.litres >= limits.wastageLimitLitres,
    durationMinutes,
    litres: session.litres
  };
}

function formatMinutes(minutes) {
  const totalSeconds = Math.floor(minutes * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default {
  updateSession,
  getSessionDurationMinutes,
  evaluateSession,
  formatMinutes
};
