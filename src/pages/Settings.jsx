import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import monitoringService from '../services/monitoringService';
import flowUtils from '../utils/flowUtils';
import './Settings.css';

const Settings = ({ currentPage = 'settings', onPageChange }) => {
  const [settings, setSettings] = useState(storageService.loadSettings());
  const [tempSettings, setTempSettings] = useState(storageService.loadSettings());
  const [validationErrors, setValidationErrors] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [connectionTest, setConnectionTest] = useState(null);

  const handleTestConnection = async () => {
    // Test against the URL currently typed in, without saving it
    const saved = storageService.loadSettings();
    storageService.saveSettings({ ...saved, apiBaseUrl: tempSettings.apiBaseUrl });
    setConnectionTest({ pending: true });
    const result = await apiService.checkHealth();
    storageService.saveSettings(saved);
    setConnectionTest(result);
  };

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

    if (!(tempSettings.continuousFlowLimitMinutes > 0)) {
      errors.continuousFlowLimitMinutes = 'Continuous flow limit must be positive';
    }

    if (!(tempSettings.wastageLimitLitres > 0)) {
      errors.wastageLimitLitres = 'Wastage limit must be positive';
    }

    if (tempSettings.apiBaseUrl && !/^https?:\/\//.test(tempSettings.apiBaseUrl)) {
      errors.apiBaseUrl = 'Backend URL must start with http:// or https://';
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
      monitoringService.refresh();
      if (tempSettings.mode === 'HARDWARE_MODE') {
        apiService.pushSettings(tempSettings).catch(error =>
          console.warn('[Settings] Could not sync settings to backend:', error.message)
        );
      }
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
      monitoringService.refresh();
      const defaults = storageService.DEFAULT_SETTINGS;
      setSettings(defaults);
      setTempSettings(defaults);
      setValidationErrors({});
      alert('All data has been reset');
    }
  };

  return (
    <div className="settings-page">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <Header 
        pageTitle="Settings" 
        mode={settings.mode}
        connectionStatus={settings.mode === 'DEMO_MODE' ? 'SIMULATED' : monitoringService.getSnapshot().connectionStatus}
      />
      
      <main className="main-content">
        <div className="settings-content">
          <div className="settings-section">
            <h2>Operating Mode</h2>
            <div className="setting-group">
              <label>Data Source:</label>
              <div className="mode-options">
                <label className={`mode-option ${tempSettings.mode === 'DEMO_MODE' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="DEMO_MODE"
                    checked={tempSettings.mode === 'DEMO_MODE'}
                    onChange={() => handleGeneralChange('mode', 'DEMO_MODE')}
                  />
                  <span>🔶 Demo mode — simulated readings (development only)</span>
                </label>
                <label className={`mode-option ${tempSettings.mode === 'HARDWARE_MODE' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="mode"
                    value="HARDWARE_MODE"
                    checked={tempSettings.mode === 'HARDWARE_MODE'}
                    onChange={() => handleGeneralChange('mode', 'HARDWARE_MODE')}
                  />
                  <span>🟢 Hardware mode — real sensor readings from the FastAPI backend</span>
                </label>
              </div>
              <p className="setting-description">
                Simulated readings are always labelled SIMULATED. In hardware mode no simulated values are shown, even if the backend is unreachable.
              </p>
            </div>

            <div className="setting-group">
              <label>FastAPI Backend URL:</label>
              <input
                type="text"
                value={tempSettings.apiBaseUrl}
                onChange={(e) => handleGeneralChange('apiBaseUrl', e.target.value.trim())}
                placeholder={apiService.DEFAULT_BASE_URL}
              />
              {validationErrors.apiBaseUrl && (
                <div className="error-message">{validationErrors.apiBaseUrl}</div>
              )}
              <div className="connection-test">
                <button type="button" className="test-connection-btn" onClick={handleTestConnection}>
                  🔌 Test Connection
                </button>
                {connectionTest?.pending && <span className="connection-result">Checking...</span>}
                {connectionTest && !connectionTest.pending && (
                  <span className={`connection-result ${connectionTest.healthy ? 'ok' : 'fail'}`}>
                    {connectionTest.healthy
                      ? `Connected to ${connectionTest.baseUrl}`
                      : connectionTest.error}
                  </span>
                )}
              </div>
              <p className="setting-description">
                Leave empty to use {apiService.DEFAULT_BASE_URL} (set VITE_API_BASE_URL to change the default).
              </p>
            </div>

            {tempSettings.mode === 'HARDWARE_MODE' && (
              <div className="setting-group">
                <label>ESP32 Address (optional):</label>
                <input
                  type="text"
                  value={tempSettings.hardwareAddress}
                  onChange={(e) => handleGeneralChange('hardwareAddress', e.target.value)}
                  placeholder="e.g., http://192.168.1.100"
                />
                <p className="setting-description">
                  IP address or hostname of the ESP32 device, for reference by the backend
                </p>
              </div>
            )}
          </div>

          <div className="settings-section">
            <h2>Timer Settings</h2>
            <div className="setting-group">
              <label>Default Tap Timer:</label>
              <div className="timer-duration-options">
                {[5, 10].map(minutes => (
                  <button
                    key={minutes}
                    type="button"
                    className={`duration-option ${tempSettings.defaultTimerDuration === minutes ? 'selected' : ''}`}
                    onClick={() => handleGeneralChange('defaultTimerDuration', minutes)}
                  >
                    {minutes} minutes
                  </button>
                ))}
                <input
                  type="number"
                  aria-label="Custom default timer minutes"
                  value={tempSettings.defaultTimerDuration}
                  onChange={(e) => handleGeneralChange('defaultTimerDuration', parseFloat(e.target.value))}
                  min="1"
                  max="1440"
                  step="0.5"
                />
              </div>
              {validationErrors.defaultTimerDuration && (
                <div className="error-message">{validationErrors.defaultTimerDuration}</div>
              )}
              <p className="setting-description">
                Used as the highlighted quick-start timer on the Smart Tap Timer page.
              </p>
            </div>

            <div className="setting-group">
              <label>Continuous Flow Warning After (minutes):</label>
              <div className="timer-duration-options">
                {[5, 10].map(minutes => (
                  <button
                    key={minutes}
                    type="button"
                    className={`duration-option ${tempSettings.continuousFlowLimitMinutes === minutes ? 'selected' : ''}`}
                    onClick={() => handleGeneralChange('continuousFlowLimitMinutes', minutes)}
                  >
                    {minutes} minutes
                  </button>
                ))}
                <input
                  type="number"
                  aria-label="Custom continuous flow limit minutes"
                  value={tempSettings.continuousFlowLimitMinutes}
                  onChange={(e) => handleGeneralChange('continuousFlowLimitMinutes', parseFloat(e.target.value))}
                  min="0.5"
                  step="0.5"
                />
              </div>
              {validationErrors.continuousFlowLimitMinutes && (
                <div className="error-message">{validationErrors.continuousFlowLimitMinutes}</div>
              )}
              <p className="setting-description">
                A tap running without a break for this long raises a continuous-flow warning.
              </p>
            </div>

            <div className="setting-group">
              <label>Water Wastage Warning Above (litres per continuous run):</label>
              <input
                type="number"
                value={tempSettings.wastageLimitLitres}
                onChange={(e) => handleGeneralChange('wastageLimitLitres', parseFloat(e.target.value))}
                min="1"
                step="1"
              />
              {validationErrors.wastageLimitLitres && (
                <div className="error-message">{validationErrors.wastageLimitLitres}</div>
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
