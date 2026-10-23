import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FlowStatusCard from '../components/FlowStatusCard';
import FlowChart from '../components/FlowChart';
import demoSensorService from '../services/demoSensorService';
import storageService from '../services/storageService';
import flowUtils from '../utils/flowUtils';
import './FlowMonitoring.css';

const FlowMonitoring = () => {
  const [currentPage, setCurrentPage] = useState('flow');
  const [settings, setSettings] = useState(storageService.loadSettings());
  const [flowData, setFlowData] = useState({});
  const [classifications, setClassifications] = useState({});
  const [flowHistory, setFlowHistory] = useState({ main_inlet: [], kitchen: [], bathroom: [] });
  const [selectedOutlet, setSelectedOutlet] = useState('main_inlet');

  useEffect(() => {
    const updateReadings = () => {
      const readings = demoSensorService.getAllReadings();
      const newFlowData = {};
      const newClassifications = {};

      readings.forEach(reading => {
        newFlowData[reading.outlet] = reading.flow;
        newClassifications[reading.outlet] = flowUtils.classifyFlow(
          reading.flow,
          settings.thresholds[reading.outlet] || settings.thresholds.kitchen
        );
      });

      setFlowData(newFlowData);
      setClassifications(newClassifications);

      // Update flow history for each outlet
      setFlowHistory(prev => {
        const updated = { ...prev };
        readings.forEach(reading => {
          updated[reading.outlet] = [
            ...(updated[reading.outlet] || []),
            { timestamp: reading.timestamp, value: reading.flow }
          ].slice(-30);
        });
        return updated;
      });
    };

    updateReadings();
    const interval = setInterval(updateReadings, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  const outletLabels = {
    main_inlet: 'Main Inlet',
    kitchen: 'Kitchen',
    bathroom: 'Bathroom'
  };

  return (
    <div className="flow-monitoring-page">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Header 
        pageTitle="Flow Monitoring" 
        mode={settings.mode}
        connectionStatus="DISCONNECTED"
      />
      
      <main className="main-content">
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
              flow={flowData[selectedOutlet] || 0}
              classification={classifications[selectedOutlet] || 'NO_FLOW'}
              thresholds={settings.thresholds[selectedOutlet]}
              source="DEMO_MODE"
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
                flow={flowData.main_inlet || 0}
                classification={classifications.main_inlet || 'NO_FLOW'}
                thresholds={settings.thresholds.main_inlet}
                source="DEMO_MODE"
              />
              <FlowStatusCard
                outlet="kitchen"
                flow={flowData.kitchen || 0}
                classification={classifications.kitchen || 'NO_FLOW'}
                thresholds={settings.thresholds.kitchen}
                source="DEMO_MODE"
              />
              <FlowStatusCard
                outlet="bathroom"
                flow={flowData.bathroom || 0}
                classification={classifications.bathroom || 'NO_FLOW'}
                thresholds={settings.thresholds.bathroom}
                source="DEMO_MODE"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FlowMonitoring;
