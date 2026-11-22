import React from 'react';
import './DataSourceBanner.css';

// Makes it explicit whether the numbers on screen are simulated or real sensor data
const DataSourceBanner = ({ source, connectionStatus, error, lastUpdated, apiBaseUrl }) => {
  if (source === 'HARDWARE_MODE') {
    if (connectionStatus === 'CONNECTED') {
      return (
        <div className="data-source-banner live" role="status">
          <span className="banner-dot" />
          <strong>LIVE SENSOR DATA</strong>
          <span>
            Readings from the IntelliWater backend ({apiBaseUrl})
            {lastUpdated ? ` · updated ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
          </span>
        </div>
      );
    }
    return (
      <div className="data-source-banner offline" role="alert">
        <strong>{connectionStatus === 'CONNECTING' ? 'CONNECTING TO BACKEND' : 'BACKEND UNREACHABLE'}</strong>
        <span>
          {error || `Waiting for ${apiBaseUrl}`}. No readings are shown until real sensor data arrives.
        </span>
      </div>
    );
  }

  return (
    <div className="data-source-banner simulated" role="status">
      <strong>SIMULATED DATA</strong>
      <span>
        Development demo readings generated in the browser. These are not real sensor measurements.
        Switch to Hardware mode in Settings to use the backend.
      </span>
    </div>
  );
};

export default DataSourceBanner;
