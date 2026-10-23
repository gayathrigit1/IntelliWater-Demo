import React from 'react';
import flowUtils from '../utils/flowUtils';
import './FlowStatusCard.css';

const FlowStatusCard = ({ outlet, flow, classification, thresholds, source }) => {
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

  const color = flowUtils.getClassificationColor(classification);
  const label = flowUtils.getClassificationLabel(classification);

  return (
    <div className="flow-status-card">
      <div className="flow-card-header">
        <span className="flow-card-icon">{getOutletIcon(outlet)}</span>
        <h3 className="flow-card-title">{getOutletLabel(outlet)}</h3>
        {source === 'DEMO_MODE' && (
          <span className="demo-badge">DEMO</span>
        )}
      </div>

      <div className="flow-card-body">
        <div className="flow-value" style={{ color }}>
          {flowUtils.formatFlowRate(flow)}
        </div>

        <div className="flow-classification" style={{ color }}>
          {label}
        </div>

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
