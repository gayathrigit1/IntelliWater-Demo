import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TapTimer from '../components/TapTimer';
import demoSensorService from '../services/demoSensorService';
import storageService from '../services/storageService';
import timerUtils from '../utils/timerUtils';
import './TapManagement.css';

const TapManagement = () => {
  const [currentPage, setCurrentPage] = useState('timer');
  const [settings, setSettings] = useState(storageService.loadSettings());
  const [selectedOutlet, setSelectedOutlet] = useState('kitchen');
  const [timer, setTimer] = useState(null);
  const [flowData, setFlowData] = useState({});
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    // Load saved timer state
    const savedTimer = storageService.loadTimerState();
    if (savedTimer && !savedTimer.completed) {
      setTimer(savedTimer);
    }

    // Update flow data
    const updateFlow = () => {
      const readings = demoSensorService.getAllReadings();
      const newFlowData = {};
      readings.forEach(reading => {
        newFlowData[reading.outlet] = reading.flow;
      });
      setFlowData(newFlowData);

      // Check if timer should be cancelled due to flow stop
      if (timer && !timer.completed && !timer.expired) {
        const outletFlow = newFlowData[timer.outlet] || 0;
        const threshold = settings.thresholds[timer.outlet]?.flowStop || 0.1;
        
        if (outletFlow <= threshold) {
          const stoppedTimer = timerUtils.stopTimer(timer, 'flow_stop');
          setTimer(stoppedTimer);
          storageService.saveTimerState(stoppedTimer);
        }
      }

      // Check timer expiry
      if (timer && !timer.completed && !timer.expired && timerUtils.isTimerExpired(timer)) {
        const expiredTimer = timerUtils.markTimerExpired(timer);
        setTimer(expiredTimer);
        storageService.saveTimerState(expiredTimer);
        
        // Generate alert if flow is still running
        const outletFlow = newFlowData[timer.outlet] || 0;
        if (outletFlow > 0.1) {
          const alert = {
            id: `alert_${Date.now()}`,
            type: 'timer_expiry',
            timestamp: Date.now(),
            outlet: timer.outlet,
            message: `Timer expired for ${timer.outlet} while water is still flowing`,
            severity: 'warning',
            acknowledged: false,
            source: 'DEMO_MODE'
          };
          storageService.saveAlert(alert);
        }
      }
    };

    updateFlow();
    const interval = setInterval(updateFlow, 1000);

    return () => clearInterval(interval);
  }, [timer, settings]);

  const handleStartTimer = (durationMinutes) => {
    const newTimer = timerUtils.createTimer(selectedOutlet, durationMinutes);
    setTimer(newTimer);
    storageService.saveTimerState(newTimer);
  };

  const handlePauseTimer = () => {
    if (timer) {
      const pausedTimer = timerUtils.pauseTimer(timer);
      setTimer(pausedTimer);
      storageService.saveTimerState(pausedTimer);
    }
  };

  const handleResumeTimer = () => {
    if (timer) {
      const resumedTimer = timerUtils.resumeTimer(timer);
      setTimer(resumedTimer);
      storageService.saveTimerState(resumedTimer);
    }
  };

  const handleStopTimer = () => {
    setTimer(null);
    storageService.clearTimerState();
  };

  const handleExtendTimer = (additionalMinutes) => {
    if (timer) {
      const extendedTimer = timerUtils.extendTimer(timer, additionalMinutes);
      setTimer(extendedTimer);
      storageService.saveTimerState(extendedTimer);
    }
  };

  const isFlowing = (outlet) => {
    const flow = flowData[outlet] || 0;
    const threshold = settings.thresholds[outlet]?.flowStop || 0.1;
    return flow > threshold;
  };

  const handleTestExpiry = () => {
    if (timer) {
      // Set deadline to 2 seconds from now for testing
      const testTimer = {
        ...timer,
        deadline: Date.now() + 2000
      };
      setTimer(testTimer);
      storageService.saveTimerState(testTimer);
    }
  };

  return (
    <div className="tap-management-page">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Header 
        pageTitle="Smart Tap Timer" 
        mode={settings.mode}
        connectionStatus="DISCONNECTED"
      />
      
      <main className="main-content">
        <div className="tap-management-content">
          <div className="outlet-selection">
            <h2>Select Tap</h2>
            <div className="outlet-buttons">
              <button
                className={`outlet-btn ${selectedOutlet === 'kitchen' ? 'active' : ''}`}
                onClick={() => setSelectedOutlet('kitchen')}
              >
                🍳 Kitchen
              </button>
              <button
                className={`outlet-btn ${selectedOutlet === 'bathroom' ? 'active' : ''}`}
                onClick={() => setSelectedOutlet('bathroom')}
              >
                🚿 Bathroom
              </button>
            </div>
          </div>

          <div className="timer-section">
            <TapTimer
              timer={timer && timer.outlet === selectedOutlet ? timer : null}
              onStart={handleStartTimer}
              onPause={handlePauseTimer}
              onResume={handleResumeTimer}
              onStop={handleStopTimer}
              onExtend={handleExtendTimer}
              isFlowing={isFlowing(selectedOutlet)}
            />
          </div>

          <div className="demo-controls">
            <h3>Demo Controls</h3>
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                />
                Test Mode (fast timer expiry)
              </label>
              {testMode && timer && !timer.completed && (
                <button 
                  className="test-btn"
                  onClick={handleTestExpiry}
                >
                  ⚡ Test Timer Expiry (2 sec)
                </button>
              )}
            </div>

            <div className="control-group">
              <label>Simulate Flow for {selectedOutlet}:</label>
              <div className="flow-simulation-buttons">
                <button
                  className="flow-btn"
                  onClick={() => demoSensorService.setFlowState(selectedOutlet, true)}
                >
                  💧 Start Flow
                </button>
                <button
                  className="flow-btn stop"
                  onClick={() => demoSensorService.setFlowState(selectedOutlet, false)}
                >
                  ⏹ Stop Flow
                </button>
              </div>
            </div>

            <div className="info-box">
              <h4>ℹ️ How It Works</h4>
              <ul>
                <li>Set a timer to monitor tap usage duration</li>
                <li>Timer warns if water is still flowing when it expires</li>
                <li>Timer cancels automatically if flow stops before expiry</li>
                <li>Extend timer without resetting (adds to original deadline)</li>
                <li>This is a warning system only - does not physically close taps</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TapManagement;
