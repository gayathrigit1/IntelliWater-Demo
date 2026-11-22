import React from 'react';
import './FlowWarnings.css';

const ICONS = {
  continuous_flow: '⏳',
  water_wastage: '🚱'
};

// Active continuous-flow and water-wastage warnings
const FlowWarnings = ({ warnings, limits }) => {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="flow-warnings ok">
        <span className="flow-warnings-icon">✅</span>
        <div>
          <strong>No continuous-flow or wastage warnings</strong>
          {limits && (
            <div className="flow-warnings-limits">
              Limits: {limits.continuousFlowLimitMinutes} min continuous flow · {limits.wastageLimitLitres} L per run
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flow-warnings-list">
      {warnings.map(warning => (
        <div key={`${warning.type}_${warning.outlet}`} className={`flow-warnings ${warning.severity}`} role="alert">
          <span className="flow-warnings-icon">{ICONS[warning.type] || '⚠️'}</span>
          <div>
            <strong>{warning.type === 'water_wastage' ? 'Water wastage warning' : 'Continuous flow warning'}</strong>
            <div>{warning.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FlowWarnings;
