import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FlowStatusCard from '../components/FlowStatusCard';
import FlowChart from '../components/FlowChart';
import DataSourceBanner from '../components/DataSourceBanner';
import useMonitoring from '../hooks/useMonitoring';
import monitoringService from '../services/monitoringService';
import apiService from '../services/apiService';
import storageService from '../services/storageService';
import './FlowMonitoring.css';

const FlowMonitoring = ({ currentPage = 'flow', onPageChange }) => {
  const monitoring = useMonitoring();
  const [settings] = useState(storageService.loadSettings());
  const [flowHistory, setFlowHistory] = useState({ main_inlet: [], kitchen: [], bathroom: [] });
  const [selectedOutlet, setSelectedOutlet] = useState('main_inlet');
  const { readings, classifications, source } = monitoring;

  useEffect(() => {
    const interval = setInterval(() => {
      const latest = monitoringService.getSnapshot().readings;
      setFlowHistory(prev => {
        const updated = { ...prev };
        Object.values(latest).forEach(reading => {
          updated[reading.outlet] = [
            ...(updated[reading.outlet] || []),
            { timestamp: reading.timestamp, value: reading.flow }
          ].slice(-30);
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const outletLabels = {
    main_inlet: 'Main Inlet',
    kitchen: 'Kitchen',
    bathroom: 'Bathroom'
  };

  return (
    <div className="flow-monitoring-page">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <Header 
        pageTitle="Flow Monitoring" 
        mode={source}
        connectionStatus={monitoring.connectionStatus}
      />
      
      <main className="main-content">
        <DataSourceBanner
          source={source}
          connectionStatus={monitoring.connectionStatus}
          error={monitoring.error}
          lastUpdated={monitoring.lastUpdated}
          apiBaseUrl={apiService.getBaseUrl()}
        />
        <div className="flow-monitoring-content">
          <div className="outlet-selector">
            <h2>Select Outlet</h2>
            <div className="outlet-buttons">
              {['main_inlet', 'kitchen', 'bathroom'].map(outlet => (
                <button
                  key={outlet}
                  className={`outlet-btn ${selectedOutlet === outlet ? 'active' : ''}`}
                  onClick={() => setSelectedOutlet(outlet)}
                >
                  {outlet === 'main_inlet' ? '🔵 Main Inlet' : 
                   outlet === 'kitchen' ? '🍳 Kitchen' : '🚿 Bathroom'}
                </button>
              ))}
            </div>
          </div>

          <div className="flow-details-section">
            <h2 className="section-title">{outletLabels[selectedOutlet]} Details</h2>
            
            <FlowStatusCard
              outlet={selectedOutlet}
              flow={readings[selectedOutlet] ? readings[selectedOutlet].flow : null}
              cumulativeVolume={readings[selectedOutlet] ? readings[selectedOutlet].cumulativeVolume : null}
              simulated={Boolean(readings[selectedOutlet]?.simulated)}
              classification={classifications[selectedOutlet] || 'NO_FLOW'}
              thresholds={settings.thresholds[selectedOutlet]}
              source={source}
            />

            <div className="thresholds-info">
              <h3>Configured Thresholds</h3>
              <div className="threshold-grid">
                <div className="threshold-item">
                  <span className="threshold-label">Flow Stop</span>
                  <span className="threshold-value">
                    {settings.thresholds[selectedOutlet].flowStop} L/min
                  </span>
                </div>
                <div className="threshold-item">
                  <span className="threshold-label">Low Flow</span>
                  <span className="threshold-value">
                    {settings.thresholds[selectedOutlet].lowFlow} L/min
                  </span>
                </div>
                <div className="threshold-item">
                  <span className="threshold-label">Heavy Flow</span>
                  <span className="threshold-value">
                    {settings.thresholds[selectedOutlet].heavyFlow} L/min
                  </span>
                </div>
              </div>
              <p className="threshold-note">
                ⚙️ Adjust thresholds in Settings
              </p>
            </div>

            <div className="flow-chart-section">
              <FlowChart
                data={flowHistory[selectedOutlet] || []}
                title={`${outletLabels[selectedOutlet]} Flow Trend`}
                unit="L/min"
              />
            </div>
          </div>

          <div className="all-outlets-section">
            <h2 className="section-title">All Outlets Overview</h2>
            <div className="flow-cards">
              <FlowStatusCard
                outlet="main_inlet"
                flow={readings.main_inlet ? readings.main_inlet.flow : null}
              cumulativeVolume={readings.main_inlet ? readings.main_inlet.cumulativeVolume : null}
                classification={classifications.main_inlet || 'NO_FLOW'}
                thresholds={settings.thresholds.main_inlet}
                source={source}
              />
              <FlowStatusCard
                outlet="kitchen"
                flow={readings.kitchen ? readings.kitchen.flow : null}
              cumulativeVolume={readings.kitchen ? readings.kitchen.cumulativeVolume : null}
                classification={classifications.kitchen || 'NO_FLOW'}
                thresholds={settings.thresholds.kitchen}
                source={source}
              />
              <FlowStatusCard
                outlet="bathroom"
                flow={readings.bathroom ? readings.bathroom.flow : null}
              cumulativeVolume={readings.bathroom ? readings.bathroom.cumulativeVolume : null}
                classification={classifications.bathroom || 'NO_FLOW'}
                thresholds={settings.thresholds.bathroom}
                source={source}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FlowMonitoring;
