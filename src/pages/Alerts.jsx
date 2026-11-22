import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AlertList from '../components/AlertList';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import useMonitoring from '../hooks/useMonitoring';
import './Alerts.css';

const Alerts = ({ currentPage = 'alerts', onPageChange }) => {
  const monitoring = useMonitoring();
  const [settings] = useState(storageService.loadSettings());
  const [localTick, setLocalTick] = useState(0);
  const [remoteAlerts, setRemoteAlerts] = useState([]);
  const [remoteError, setRemoteError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [outletFilter, setOutletFilter] = useState('all');
  const isHardware = settings.mode === 'HARDWARE_MODE';

  // Local alerts refresh whenever monitoring raises a new one
  const localAlerts = React.useMemo(
    () => storageService.loadAlerts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monitoring.alertsVersion, localTick]
  );

  // Backend alert history (hardware mode only)
  useEffect(() => {
    if (!isHardware) return undefined;
    let cancelled = false;
    const load = () => {
      apiService.getAlerts()
        .then(list => {
          if (cancelled) return;
          setRemoteAlerts(list);
          setRemoteError(null);
        })
        .catch(error => {
          if (!cancelled) setRemoteError(error.message);
        });
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isHardware, localTick]);

  const alerts = [...remoteAlerts, ...localAlerts].sort((a, b) => b.timestamp - a.timestamp);

  const handleAcknowledgeAlert = (alertId) => {
    const remote = remoteAlerts.find(a => a.id === alertId);
    if (remote) {
      setRemoteAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a)));
      apiService.acknowledgeAlert(remote.remoteId).catch(error => setRemoteError(error.message));
      return;
    }
    storageService.acknowledgeAlert(alertId);
    setLocalTick(t => t + 1);
  };

  const handleClearAlerts = () => {
    if (window.confirm('Clear local alert history? This cannot be undone.')) {
      storageService.clearAlerts();
      setLocalTick(t => t + 1);
    }
  };

  const handleExportCsv = () => {
    const header = ['timestamp', 'type', 'severity', 'outlet', 'message', 'value', 'unit', 'source', 'acknowledged'];
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredAlerts.map(a => [
      new Date(a.timestamp).toISOString(), a.type, a.severity, a.outlet, a.message,
      a.value, a.unit, a.source === 'HARDWARE_MODE' ? 'LIVE' : 'SIMULATED', a.acknowledged
    ].map(escape).join(','));
    const blob = new Blob([[header.join(','), ...rows].join(String.fromCharCode(10))], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intelliwater-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearDemoHistory = () => {
    if (window.confirm('Clear demo history? This will reset accumulated data.')) {
      storageService.clearDemoHistory();
      alert('Demo history cleared');
    }
  };

  const alertTypes = [...new Set(alerts.map(a => a.type))];

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unacknowledged' && alert.acknowledged) return false;
    if (filter === 'acknowledged' && !alert.acknowledged) return false;
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    if (outletFilter !== 'all' && alert.outlet !== outletFilter) return false;
    return true;
  });

  const alertStats = {
    total: alerts.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length
  };

  return (
    <div className="alerts-page">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <Header 
        pageTitle="Alerts & History" 
        mode={monitoring.source}
        connectionStatus={monitoring.connectionStatus}
      />
      
      <main className="main-content">
        <div className="alerts-content">
          <div className="alert-stats">
            <div className="stat-card">
              <div className="stat-value">{alertStats.total}</div>
              <div className="stat-label">Total Alerts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{alertStats.unacknowledged}</div>
              <div className="stat-label">Unacknowledged</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{alertStats.critical}</div>
              <div className="stat-label">Critical</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{alertStats.warning}</div>
              <div className="stat-label">Warnings</div>
            </div>
          </div>

          <div className="alert-filters">
            <h3>Filter Alerts</h3>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`filter-btn ${filter === 'unacknowledged' ? 'active' : ''}`}
                onClick={() => setFilter('unacknowledged')}
              >
                Unacknowledged
              </button>
              <button
                className={`filter-btn ${filter === 'acknowledged' ? 'active' : ''}`}
                onClick={() => setFilter('acknowledged')}
              >
                Acknowledged
              </button>
            </div>
            <div className="filter-selects">
              <label>
                Type
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All types</option>
                  {alertTypes.map(type => (
                    <option key={type} value={type}>{String(type).replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </label>
              <label>
                Tap / outlet
                <select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)}>
                  <option value="all">All outlets</option>
                  <option value="main_inlet">Main inlet</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="bathroom">Bathroom</option>
                </select>
              </label>
              <button className="filter-btn" onClick={handleExportCsv} disabled={filteredAlerts.length === 0}>
                ⬇️ Export CSV
              </button>
            </div>
            {isHardware && remoteError && (
              <p className="data-note">Backend alert history unavailable: {remoteError}</p>
            )}
          </div>

          <div className="alert-list-section">
            <AlertList
              alerts={filteredAlerts}
              onAcknowledge={handleAcknowledgeAlert}
              onClear={handleClearAlerts}
            />
          </div>

          <div className="data-management">
            <h3>Data Management</h3>
            <div className="action-buttons">
              <button 
                className="action-btn danger"
                onClick={handleClearAlerts}
              >
                🗑️ Clear Local Alert History
              </button>
              <button 
                className="action-btn warning"
                onClick={handleClearDemoHistory}
              >
                🔄 Clear Demo History
              </button>
            </div>
            <p className="data-note">
              ⚠️ Clearing data is permanent. Export important data before clearing.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Alerts;
