import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AlertList from '../components/AlertList';
import storageService from '../services/storageService';
import './Alerts.css';

const Alerts = () => {
  const [currentPage, setCurrentPage] = useState('alerts');
  const [settings, setSettings] = useState(storageService.loadSettings());
  const [alerts, setAlerts] = useState(storageService.loadAlerts());
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setAlerts(storageService.loadAlerts());
  }, []);

  const handleAcknowledgeAlert = (alertId) => {
    storageService.acknowledgeAlert(alertId);
    setAlerts(storageService.loadAlerts());
  };

  const handleClearAlerts = () => {
    if (window.confirm('Clear all alert history? This cannot be undone.')) {
      storageService.clearAlerts();
      setAlerts([]);
    }
  };

  const handleClearDemoHistory = () => {
    if (window.confirm('Clear demo history? This will reset accumulated data.')) {
      storageService.clearDemoHistory();
      alert('Demo history cleared');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unacknowledged') return !alert.acknowledged;
    if (filter === 'acknowledged') return alert.acknowledged;
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
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Header 
        pageTitle="Alerts & History" 
        mode={settings.mode}
        connectionStatus="DISCONNECTED"
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
                🗑️ Clear Alert History
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
