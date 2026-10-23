import React from 'react';
import './MetricCard.css';

const MetricCard = ({ title, value, unit, status, icon, color, subtitle }) => {
  return (
    <div className="metric-card">
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <h3 className="card-title">{title}</h3>
      </div>
      
      <div className="card-body">
        <div className="metric-value" style={{ color }}>
          {value} <span className="metric-unit">{unit}</span>
        </div>
        
        {status && (
          <div className="metric-status" style={{ color }}>
            {status}
          </div>
        )}
        
        {subtitle && (
          <div className="metric-subtitle">{subtitle}</div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
