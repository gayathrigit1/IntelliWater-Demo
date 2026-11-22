import React from 'react';
import flowUtils from '../utils/flowUtils';
import usageUtils from '../utils/usageUtils';
import './TapStatusPanel.css';

const TAPS = [
  { id: 'kitchen', label: 'Kitchen Tap', icon: '🍳' },
  { id: 'bathroom', label: 'Bathroom Tap', icon: '🚿' }
];

// Individual tap monitoring status: running state, flow, run time, litres and timer
const TapStatusPanel = ({ readings, classifications, tapUsage, warnings, timer, source, now }) => {
  const getTimerText = (tapId) => {
    if (!timer || timer.outlet !== tapId) return 'No timer';
    if (timer.expired) return 'Expired';
    if (timer.cancelledByFlowStop) return 'Cancelled (flow stopped)';
    if (timer.completed) return 'Completed';
    if (timer.paused) return 'Paused';
    const remainingMs = Math.max(0, timer.deadline - (now || timer.startTime));
    return `${usageUtils.formatMinutes(remainingMs / 60000)} left`;
  };

  return (
    <div className="tap-status-panel">
      <table className="tap-status-table">
        <thead>
          <tr>
            <th>Tap</th>
            <th>Status</th>
            <th>Flow</th>
            <th>Condition</th>
            <th>Running for</th>
            <th>This run</th>
            <th>Timer</th>
          </tr>
        </thead>
        <tbody>
          {TAPS.map(tap => {
            const reading = readings[tap.id];
            const usage = tapUsage[tap.id];
            const classification = classifications[tap.id];
            const tapWarnings = (warnings || []).filter(w => w.outlet === tap.id);
            const color = flowUtils.getClassificationColor(classification);

            let status = 'No data';
            let statusClass = 'nodata';
            if (reading) {
              status = usage?.running ? 'Running' : 'Off';
              statusClass = usage?.running ? 'running' : 'off';
              if (tapWarnings.some(w => w.severity === 'critical')) statusClass = 'critical';
              else if (tapWarnings.length > 0) statusClass = 'warning';
            }

            return (
              <tr key={tap.id}>
                <td data-label="Tap">
                  <span className="tap-name">{tap.icon} {tap.label}</span>
                  {reading && (
                    <span className={`tap-source ${source === 'HARDWARE_MODE' && !reading?.simulated ? 'live' : 'sim'}`}>
                      {source === 'HARDWARE_MODE' && !reading?.simulated ? 'LIVE' : 'SIMULATED'}
                    </span>
                  )}
                </td>
                <td data-label="Status">
                  <span className={`tap-status-pill ${statusClass}`}>{status}</span>
                </td>
                <td data-label="Flow">{reading ? flowUtils.formatFlowRate(reading.flow) : '--'}</td>
                <td data-label="Condition" style={{ color }}>
                  {reading ? flowUtils.getClassificationLabel(classification) : '--'}
                </td>
                <td data-label="Running for">
                  {usage?.running ? usageUtils.formatMinutes(usage.durationMinutes) : '--'}
                </td>
                <td data-label="This run">
                  {usage?.running ? flowUtils.formatVolume(usage.litres) : '--'}
                </td>
                <td data-label="Timer">{getTimerText(tap.id)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TapStatusPanel;
