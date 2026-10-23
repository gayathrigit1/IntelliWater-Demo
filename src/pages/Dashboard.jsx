import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FlowStatusCard from '../components/FlowStatusCard';
import MetricCard from '../components/MetricCard';
import AlertList from '../components/AlertList';
import FlowChart from '../components/FlowChart';
import demoSensorService from '../services/demoSensorService';
import storageService from '../services/storageService';
import flowUtils from '../utils/flowUtils';
import './Dashboard.css';

const Dashboard = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [settings, setSettings] = useState(storageService.loadSettings());
  const [flowData, setFlowData] = useState({});
  const [classifications, setClassifications] = useState({});
  const [alerts, setAlerts] = useState(storageService.loadAlerts());
  const [discrepancy, setDiscrepancy] = useState(null);
  const [flowHistory, setFlowHistory] = useState([]);

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

      // Calculate discrepancy
      if (newFlowData.main_inlet !== undefined && 
          newFlowData.kitchen !== undefined && 
          newFlowData.bathroom !== undefined) {
        const disc = flowUtils.calculateDiscrepancy(
          newFlowData.main_inlet,
          newFlowData.kitchen,
          newFlowData.bathroom
        );
        setDiscrepancy(disc);
      }

      // Update flow history for chart
      setFlowHistory(prev => {
        const newHistory = [...prev, {
          timestamp: Date.now(),
          value: newFlowData.main_inlet || 0
        }];
        return newHistory.slice(-20); // Keep last 20 points
      });
    };

    updateReadings();
    const interval = setInterval(updateReadings, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  const handleAcknowledgeAlert = (alertId) => {
    storageService.acknowledgeAlert(alertId);
    setAlerts(storageService.loadAlerts());
  };

  const handleClearAlerts = () => {
    if (window.confirm('Clear all alert history?')) {
      storageService.clearAlerts();
      setAlerts([]);
    }
  };

  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="dashboard-page">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Header 
        pageTitle="Dashboard" 
        mode={settings.mode}
        connectionStatus="DISCONNECTED"
      />
      
      <main className="main-content">
        <div className="dashboard-grid">
          {/* Flow Monitoring Cards */}
          <div className="flow-cards-section">
            <h2 className="section-title">Flow Monitoring</h2>
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

          {/* Discrepancy Card */}
          <div className="discrepancy-section">
            <h2 className="section-title">Flow Discrepancy</h2>
            <MetricCard
              title="Discrepancy"
              value={discrepancy ? discrepancy.value.toFixed(2) : '0.00'}
              unit="L/min"
              status={discrepancy && flowUtils.isDiscrepancySignificant(discrepancy, settings.discrepancyTolerance) 
                ? 'Warning' 
                : 'Normal'}
              icon="🔍"
              color={discrepancy && flowUtils.isDiscrepancySignificant(discrepancy, settings.discrepancyTolerance) 
                ? '#ffc107' 
                : '#28a745'}
              subtitle="Inlet - (Kitchen + Bathroom)"
            />
            {discrepancy && flowUtils.isDiscrepancySignificant(discrepancy, settings.discrepancyTolerance) && (
              <p className="discrepancy-note">
                ⚠️ Possible leakage, unmeasured use, or sensor calibration difference
              </p>
            )}
          </div>

          {/* Flow Trend Chart */}
          <div className="chart-section">
            <h2 className="section-title">Flow Trend</h2>
            <FlowChart
              data={flowHistory}
              title="Main Inlet Flow"
              unit="L/min"
            />
          </div>

          {/* Recent Alerts */}
          <div className="alerts-section">
            <h2 className="section-title">Recent Alerts</h2>
            <AlertList
              alerts={recentAlerts}
              onAcknowledge={handleAcknowledgeAlert}
              onClear={handleClearAlerts}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
