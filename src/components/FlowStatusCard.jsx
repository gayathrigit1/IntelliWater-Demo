import React from 'react';
import flowUtils from '../utils/flowUtils';
import './FlowStatusCard.css';

const FlowStatusCard = ({ outlet, flow, classification, thresholds, source, cumulativeVolume, simulated = false }) => {
  const hasData = flow !== null && flow !== undefined;
  const getOutletIcon = (outlet) => {
    switch (outlet) {
      case 'main_inlet': return '🔵';
      case 'kitchen': return '🍳';
      case 'bathroom': return '🚿';
      default: return '💧';
    }
  };

  const getOutletLabel = (outlet) => {
    switch (outlet) {
      case 'main_inlet': return 'Main Inlet';
      case 'kitchen': return 'Kitchen';
      case 'bathroom': return 'Bathroom';
      default: return outlet;
    }
  };

  const color = hasData ? flowUtils.getClassificationColor(classification) : '#9e9e9e';
  const label = hasData ? flowUtils.getClassificationLabel(classification) : 'No data';

  return (
    <div className="flow-status-card">
      <div className="flow-card-header">
        <span className="flow-card-icon">{getOutletIcon(outlet)}</span>
        <h3 className="flow-card-title">{getOutletLabel(outlet)}</h3>
        {(source === 'DEMO_MODE' || simulated) && (
          <span className="demo-badge" title="Simulated reading - not a real sensor measurement">SIMULATED</span>
        )}
        {source === 'HARDWARE_MODE' && hasData && !simulated && (
          <span className="demo-badge live" title="Real sensor reading from the backend">LIVE</span>
        )}
      </div>

      <div className="flow-card-body">
        <div className="flow-value" style={{ color }}>
          {hasData ? flowUtils.formatFlowRate(flow) : '-- L/min'}
        </div>

        <div className="flow-classification" style={{ color }}>
          {label}
        </div>

        {cumulativeVolume !== undefined && (
          <div className="flow-cumulative">
            <span className="threshold-label">Cumulative:</span>
            <span className="threshold-value">
              {cumulativeVolume === null ? '--' : flowUtils.formatVolume(cumulativeVolume)}
            </span>
          </div>
        )}

        <div className="flow-thresholds">
          <div className="threshold-info">
            <span className="threshold-label">Low:</span>
            <span className="threshold-value">{thresholds.lowFlow} L/min</span>
          </div>
          <div className="threshold-info">
            <span className="threshold-label">Heavy:</span>
            <span className="threshold-value">{thresholds.heavyFlow} L/min</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowStatusCard;
