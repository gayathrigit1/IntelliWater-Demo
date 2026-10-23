import React from 'react';
import './AlertList.css';

const AlertList = ({ alerts, onAcknowledge, onClear }) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'timer_expiry': return '⏱️';
      case 'heavy_flow': return '⚠️';
      case 'low_flow': return '📉';
      case 'discrepancy': return '🔍';
      case 'sensor_error': return '❌';
      case 'connection_loss': return '🔌';
      default: return '🔔';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="alert-list empty">
        <div className="empty-icon">🔔</div>
        <h3>No Alerts</h3>
        <p>System is operating normally</p>
      </div>
    );
  }

  return (
    <div className="alert-list">
      <div className="alert-list-header">
        <h3>Recent Alerts</h3>
        {alerts.length > 0 && (
          <button 
            className="clear-btn"
            onClick={onClear}
          >
            Clear History
          </button>
        )}
      </div>

      <div className="alert-items">
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`alert-item ${alert.acknowledged ? 'acknowledged' : ''}`}
            style={{ borderLeftColor: getSeverityColor(alert.severity) }}
          >
            <div className="alert-header">
              <div className="alert-icon">{getAlertIcon(alert.type)}</div>
              <div className="alert-info">
                <div className="alert-type">{alert.type.replace('_', ' ').toUpperCase()}</div>
                <div className="alert-time">{formatTimestamp(alert.timestamp)}</div>
              </div>
              {!alert.acknowledged && (
                <button 
                  className="acknowledge-btn"
                  onClick={() => onAcknowledge(alert.id)}
                >
                  ✓
                </button>
              )}
            </div>

            <div className="alert-message">{alert.message}</div>

            {alert.outlet && (
              <div className="alert-details">
                <span className="detail-label">Outlet:</span>
                <span className="detail-value">{alert.outlet}</span>
              </div>
            )}

            {alert.value !== undefined && (
              <div className="alert-details">
                <span className="detail-label">Value:</span>
                <span className="detail-value">{alert.value} L/min</span>
              </div>
            )}

            {alert.threshold !== undefined && (
              <div className="alert-details">
                <span className="detail-label">Threshold:</span>
                <span className="detail-value">{alert.threshold} L/min</span>
              </div>
            )}

            {alert.source === 'DEMO_MODE' && (
              <div className="alert-source-badge">DEMO DATA</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertList;
