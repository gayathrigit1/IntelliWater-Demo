import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FlowStatusCard from '../components/FlowStatusCard';
import MetricCard from '../components/MetricCard';
import AlertList from '../components/AlertList';
import FlowChart from '../components/FlowChart';
import ConsumptionChart from '../components/ConsumptionChart';
import TapStatusPanel from '../components/TapStatusPanel';
import FlowWarnings from '../components/FlowWarnings';
import DataSourceBanner from '../components/DataSourceBanner';
import useMonitoring from '../hooks/useMonitoring';
import monitoringService from '../services/monitoringService';
import demoSensorService from '../services/demoSensorService';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import flowUtils from '../utils/flowUtils';
import './Dashboard.css';

const OUTLETS = ['main_inlet', 'kitchen', 'bathroom'];
const CONSUMPTION_REFRESH_MS = 10000;

const Dashboard = ({ currentPage = 'dashboard', onPageChange }) => {
  const monitoring = useMonitoring();
  const [settings] = useState(storageService.loadSettings());
  const [alertsTick, setAlertsTick] = useState(0);
  const [flowHistory, setFlowHistory] = useState([]);
  const [consumption, setConsumption] = useState(null);

  const { readings, classifications, source } = monitoring;
  const isDemo = source === 'DEMO_MODE';

  // Rolling main-inlet trend (last 20 readings)
  useEffect(() => {
    const interval = setInterval(() => {
      const inlet = monitoringService.getSnapshot().readings.main_inlet;
      if (!inlet) return;
      setFlowHistory(prev => [...prev, { timestamp: inlet.timestamp, value: inlet.flow }].slice(-20));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hourly / daily consumption history
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      monitoringService.getConsumptionHistory().then(history => {
        if (!cancelled) setConsumption(history);
      });
    };
    load();
    const interval = setInterval(load, CONSUMPTION_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [source, alertsTick]);

  // Re-read alerts whenever the monitoring service raises one or the user changes them
  const alerts = React.useMemo(
    () => storageService.loadAlerts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monitoring.alertsVersion, alertsTick]
  );

  const inlet = readings.main_inlet;
  const discrepancy = readings.main_inlet && readings.kitchen && readings.bathroom
    ? flowUtils.calculateDiscrepancy(readings.main_inlet.flow, readings.kitchen.flow, readings.bathroom.flow)
    : null;
  const discrepancyWarning = discrepancy && flowUtils.isDiscrepancySignificant(discrepancy, settings.discrepancyTolerance);
  const runningTaps = monitoringService.TAP_OUTLETS.filter(t => monitoring.tapUsage[t]?.running).length;
  const warningCount = monitoring.activeWarnings.length;

  const handleAcknowledgeAlert = (alertId) => {
    storageService.acknowledgeAlert(alertId);
    setAlertsTick(t => t + 1);
  };

  const handleClearAlerts = () => {
    if (window.confirm('Clear all alert history?')) {
      storageService.clearAlerts();
      setAlertsTick(t => t + 1);
    }
  };

  const handleLoadSampleHistory = () => {
    storageService.saveConsumption('DEMO_MODE', demoSensorService.generateSampleConsumption());
    setAlertsTick(t => t + 1);
  };

  const sourceBadge = (
    <span className={`chart-source-badge ${isDemo ? 'sim' : 'live'}`}>
      {isDemo ? 'SIMULATED' : consumption?.origin === 'backend' ? 'BACKEND' : 'LOCAL (REAL READINGS)'}
    </span>
  );

  return (
    <div className="dashboard-page">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <Header
        pageTitle="Dashboard"
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

        <div className="dashboard-grid">
          <div className="kpi-section">
            <MetricCard
              title="Total Flow Rate"
              value={inlet ? inlet.flow.toFixed(2) : '--'}
              unit="L/min"
              icon="💧"
              color="#0d4f6e"
              status={inlet ? flowUtils.getClassificationLabel(classifications.main_inlet) : 'No data'}
              subtitle="Main inlet, real-time"
            />
            <MetricCard
              title="Cumulative Consumption"
              value={inlet && inlet.cumulativeVolume !== null ? inlet.cumulativeVolume.toFixed(1) : '--'}
              unit="L"
              icon="📈"
              color="#1a8fb5"
              subtitle={isDemo ? 'Since simulation started' : 'Meter total reported by device'}
            />
            <MetricCard
              title="Today's Consumption"
              value={consumption ? consumption.today.toFixed(1) : '--'}
              unit="L"
              icon="📅"
              color="#6f42c1"
              subtitle={new Date().toLocaleDateString()}
            />
            <MetricCard
              title="Active Taps"
              value={`${runningTaps} / ${monitoringService.TAP_OUTLETS.length}`}
              unit=""
              icon="🚰"
              color={warningCount > 0 ? '#dc3545' : '#28a745'}
              status={warningCount > 0 ? `${warningCount} active warning${warningCount > 1 ? 's' : ''}` : 'No warnings'}
            />
          </div>

          <div className="flow-cards-section">
            <div className="section-header">
              <h2 className="section-title">Real-time Flow Monitoring</h2>
              <div className="flow-legend">
                {['LOW_FLOW', 'NORMAL_FLOW', 'HEAVY_FLOW'].map(c => (
                  <span key={c} className="legend-item">
                    <span className="legend-dot" style={{ background: flowUtils.getClassificationColor(c) }} />
                    {flowUtils.getClassificationLabel(c)}
                  </span>
                ))}
              </div>
            </div>
            <div className="flow-cards">
              {OUTLETS.map(outlet => (
                <FlowStatusCard
                  key={outlet}
                  outlet={outlet}
                  flow={readings[outlet] ? readings[outlet].flow : null}
                  cumulativeVolume={readings[outlet] ? readings[outlet].cumulativeVolume : null}
                  classification={classifications[outlet] || 'NO_FLOW'}
                  thresholds={settings.thresholds[outlet]}
                  source={source}
                />
              ))}
            </div>
          </div>

          <div className="tap-status-section">
            <h2 className="section-title">Individual Tap Status</h2>
            <TapStatusPanel
              readings={readings}
              classifications={classifications}
              tapUsage={monitoring.tapUsage}
              warnings={monitoring.activeWarnings}
              timer={storageService.loadTimerState()}
              source={source}
              now={monitoring.lastUpdated}
            />
          </div>

          <div className="warnings-section">
            <h2 className="section-title">Continuous Flow &amp; Wastage</h2>
            <FlowWarnings
              warnings={monitoring.activeWarnings}
              limits={{
                continuousFlowLimitMinutes: settings.continuousFlowLimitMinutes,
                wastageLimitLitres: settings.wastageLimitLitres
              }}
            />
          </div>

          <div className="consumption-section">
            <div className="section-header">
              <h2 className="section-title">Water Consumption</h2>
              {isDemo && (
                <button className="sample-history-btn" onClick={handleLoadSampleHistory}>
                  Load simulated 7-day history
                </button>
              )}
            </div>
            {consumption?.error && (
              <p className="consumption-note">
                Backend history unavailable ({consumption.error}); showing consumption recorded locally from real readings.
              </p>
            )}
            <div className="consumption-charts">
              <ConsumptionChart
                title="Hourly Consumption (last 24 h)"
                data={consumption ? consumption.hourly : []}
                labelEvery={4}
                badge={sourceBadge}
              />
              <ConsumptionChart
                title="Daily Consumption (last 7 days)"
                data={consumption ? consumption.daily : []}
                color="#6f42c1"
                badge={sourceBadge}
              />
            </div>
          </div>

          <div className="discrepancy-section">
            <h2 className="section-title">Flow Discrepancy</h2>
            <MetricCard
              title="Discrepancy"
              value={discrepancy ? discrepancy.value.toFixed(2) : '--'}
              unit="L/min"
              status={discrepancy ? (discrepancyWarning ? 'Warning' : 'Normal') : 'No data'}
              icon="🔍"
              color={discrepancyWarning ? '#ffc107' : '#28a745'}
              subtitle="Inlet - (Kitchen + Bathroom)"
            />
            {discrepancyWarning && (
              <p className="discrepancy-note">
                ⚠️ Possible leakage, unmeasured use, or sensor calibration difference
              </p>
            )}
          </div>

          <div className="chart-section">
            <h2 className="section-title">Flow Trend</h2>
            <FlowChart
              data={flowHistory}
              title="Main Inlet Flow"
              unit="L/min"
            />
          </div>

          <div className="alerts-section">
            <h2 className="section-title">Recent Alerts</h2>
            <AlertList
              alerts={alerts
                .filter(alert => source !== 'HARDWARE_MODE' || alert.source === 'HARDWARE_MODE')
                .slice(0, 5)}
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
