import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import storageService from '../services/storageService';
import flowUtils from '../utils/flowUtils';
import './Settings.css';

const Settings = () => {
  const [currentPage, setCurrentPage] = useState('settings');
  const [settings, setSettings] = useState(storageService.loadSettings());
  const [tempSettings, setTempSettings] = useState(storageService.loadSettings());
  const [validationErrors, setValidationErrors] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleThresholdChange = (outlet, field, value) => {
    const numValue = parseFloat(value);
    setTempSettings(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [outlet]: {
          ...prev.thresholds[outlet],
          [field]: numValue
        }
      }
    }));
  };

  const handleGeneralChange = (field, value) => {
    setTempSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateSettings = () => {
    const errors = {};
    
    ['main_inlet', 'kitchen', 'bathroom'].forEach(outlet => {
      const thresholds = tempSettings.thresholds[outlet];
      const validation = flowUtils.validateThresholds(thresholds);
      
      if (!validation.isValid) {
        errors[`${outlet}_thresholds`] = validation.errors.join(', ');
      }
    });

    if (tempSettings.defaultTimerDuration <= 0) {
      errors.defaultTimerDuration = 'Default timer duration must be positive';
    }

    if (tempSettings.discrepancyTolerance < 0) {
      errors.discrepancyTolerance = 'Discrepancy tolerance cannot be negative';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (validateSettings()) {
      storageService.saveSettings(tempSettings);
      setSettings(tempSettings);
      alert('Settings saved successfully');
    }
  };

  const handleResetToDefaults = () => {
    const defaults = storageService.DEFAULT_SETTINGS;
    setTempSettings({ ...defaults });
    setValidationErrors({});
    setShowResetConfirm(false);
  };

  const handleResetAllData = () => {
    if (window.confirm('This will clear all settings, alerts, and history. Are you sure?')) {
      storageService.clearAllData();
      const defaults = storageService.DEFAULT_SETTINGS;
      setSettings(defaults);
      setTempSettings(defaults);
      setValidationErrors({});
      alert('All data has been reset');
    }
  };

  return (
    <div className="settings-page">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Header 
        pageTitle="Settings" 
        mode={settings.mode}
        connectionStatus="DISCONNECTED"
      />
      
      <main className="main-content">
        <div className="settings-content">
          <div className="settings-section">
            <h2>Operating Mode</h2>
            <div className="setting-group">
              <label>Current Mode:</label>
              <div className="mode-display">
                <span className={`mode-badge ${tempSettings.mode.toLowerCase()}`}>
                  {tempSettings.mode === 'DEMO_MODE' ? '🔶 DEMO MODE' : '🟢 HARDWARE MODE'}
                </span>
              </div>
              <p className="setting-description">
                Demo mode uses simulated sensor data. Hardware mode connects to ESP32 (not yet implemented).
              </p>
            </div>

            {tempSettings.mode === 'HARDWARE_MODE' && (
              <div className="setting-group">
                <label>ESP32 Address:</label>
                <input
                  type="text"
                  value={tempSettings.hardwareAddress}
                  onChange={(e) => handleGeneralChange('hardwareAddress', e.target.value)}
                  placeholder="e.g., http://192.168.1.100"
                />
                <p className="setting-description">
                  Enter the IP address or hostname of your ESP32 device
                </p>
              </div>
            )}
          </div>

          <div className="settings-section">
            <h2>Timer Settings</h2>
            <div className="setting-group">
              <label>Default Timer Duration (minutes):</label>
              <input
                type="number"
                value={tempSettings.defaultTimerDuration}
                onChange={(e) => handleGeneralChange('defaultTimerDuration', parseFloat(e.target.value))}
                min="1"
                max="1440"
                step="0.5"
              />
              {validationErrors.defaultTimerDuration && (
                <div className="error-message">{validationErrors.defaultTimerDuration}</div>
              )}
            </div>

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={tempSettings.buzzerEnabled}
                  onChange={(e) => handleGeneralChange('buzzerEnabled', e.target.checked)}
                />
                Enable Buzzer Notifications
              </label>
              <p className="setting-description">
                When enabled, the system will attempt to trigger the hardware buzzer for alerts (requires ESP32)
              </p>
            </div>
          </div>

          <div className="settings-section">
            <h2>Flow Thresholds - Main Inlet</h2>
            <div className="thresholds-grid">
              <div className="threshold-input">
                <label>Flow Stop (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.main_inlet.flowStop}
                  onChange={(e) => handleThresholdChange('main_inlet', 'flowStop', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="threshold-input">
                <label>Low Flow (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.main_inlet.lowFlow}
                  onChange={(e) => handleThresholdChange('main_inlet', 'lowFlow', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="threshold-input">
                <label>Heavy Flow (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.main_inlet.heavyFlow}
                  onChange={(e) => handleThresholdChange('main_inlet', 'heavyFlow', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            {validationErrors.main_inlet_thresholds && (
              <div className="error-message">{validationErrors.main_inlet_thresholds}</div>
            )}
          </div>

          <div className="settings-section">
            <h2>Flow Thresholds - Kitchen</h2>
            <div className="thresholds-grid">
              <div className="threshold-input">
                <label>Flow Stop (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.kitchen.flowStop}
                  onChange={(e) => handleThresholdChange('kitchen', 'flowStop', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="threshold-input">
                <label>Low Flow (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.kitchen.lowFlow}
                  onChange={(e) => handleThresholdChange('kitchen', 'lowFlow', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="threshold-input">
                <label>Heavy Flow (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.kitchen.heavyFlow}
                  onChange={(e) => handleThresholdChange('kitchen', 'heavyFlow', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            {validationErrors.kitchen_thresholds && (
              <div className="error-message">{validationErrors.kitchen_thresholds}</div>
            )}
          </div>

          <div className="settings-section">
            <h2>Flow Thresholds - Bathroom</h2>
            <div className="thresholds-grid">
              <div className="threshold-input">
                <label>Flow Stop (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.bathroom.flowStop}
                  onChange={(e) => handleThresholdChange('bathroom', 'flowStop', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="threshold-input">
                <label>Low Flow (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.bathroom.lowFlow}
                  onChange={(e) => handleThresholdChange('bathroom', 'lowFlow', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="threshold-input">
                <label>Heavy Flow (L/min):</label>
                <input
                  type="number"
                  value={tempSettings.thresholds.bathroom.heavyFlow}
                  onChange={(e) => handleThresholdChange('bathroom', 'heavyFlow', e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            {validationErrors.bathroom_thresholds && (
              <div className="error-message">{validationErrors.bathroom_thresholds}</div>
            )}
          </div>

          <div className="settings-section">
            <h2>Discrepancy Detection</h2>
            <div className="setting-group">
              <label>Discrepancy Tolerance (L/min):</label>
              <input
                type="number"
                value={tempSettings.discrepancyTolerance}
                onChange={(e) => handleGeneralChange('discrepancyTolerance', parseFloat(e.target.value))}
                min="0"
                step="0.1"
              />
              {validationErrors.discrepancyTolerance && (
                <div className="error-message">{validationErrors.discrepancyTolerance}</div>
              )}
              <p className="setting-description">
                Flow discrepancy warning threshold. Difference between inlet and outlet flows above this value triggers a warning.
              </p>
            </div>

            <div className="setting-group">
              <label>Warning Persistence Duration (seconds):</label>
              <input
                type="number"
                value={tempSettings.warningPersistenceDuration}
                onChange={(e) => handleGeneralChange('warningPersistenceDuration', parseInt(e.target.value))}
                min="0"
                step="1"
              />
              <p className="setting-description">
                How long a condition must persist before generating a warning (0 for immediate)
              </p>
            </div>
          </div>

          <div className="settings-section danger-zone">
            <h2>Danger Zone</h2>
            <div className="danger-actions">
              <button 
                className="danger-btn"
                onClick={() => setShowResetConfirm(true)}
              >
                🔄 Reset to Default Settings
              </button>
              <button 
                className="danger-btn critical"
                onClick={handleResetAllData}
              >
                🗑️ Reset All Application Data
              </button>
            </div>
            
            {showResetConfirm && (
              <div className="confirm-dialog">
                <p>Are you sure you want to reset all settings to defaults?</p>
                <div className="confirm-buttons">
                  <button onClick={handleResetToDefaults}>Yes, Reset</button>
                  <button onClick={() => setShowResetConfirm(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div className="settings-actions">
            <button className="save-btn" onClick={handleSave}>
              💾 Save Settings
            </button>
            <button className="cancel-btn" onClick={() => setTempSettings(settings)}>
              ❌ Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
