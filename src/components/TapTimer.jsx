import React, { useState, useEffect } from 'react';
import timerUtils from '../utils/timerUtils';
import './TapTimer.css';

const TapTimer = ({ timer, onStart, onPause, onResume, onStop, onExtend, isFlowing }) => {
  const [remaining, setRemaining] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [customDuration, setCustomDuration] = useState('');
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extendAmount, setExtendAmount] = useState('');

  useEffect(() => {
    if (!timer) {
      setRemaining(null);
      setElapsed(null);
      return;
    }

    const updateTimes = () => {
      setRemaining(timerUtils.getRemainingTime(timer));
      setElapsed(timerUtils.getElapsedTime(timer));
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleStart = (duration) => {
    if (timerUtils.validateDuration(duration).valid) {
      onStart(duration);
    }
  };

  const handleCustomStart = () => {
    const duration = parseFloat(customDuration);
    if (timerUtils.validateDuration(duration).valid) {
      onStart(duration);
      setCustomDuration('');
    }
  };

  const handleExtend = () => {
    const amount = parseFloat(extendAmount);
    if (timerUtils.validateDuration(amount).valid) {
      onExtend(amount);
      setShowExtendDialog(false);
      setExtendAmount('');
    }
  };

  const handleQuickExtend = (minutes) => {
    onExtend(minutes);
  };

  if (!timer) {
    return (
      <div className="tap-timer">
        <div className="timer-empty">
          <div className="timer-icon">⏱️</div>
          <h3>No Active Timer</h3>
          <p>Start a timer to monitor tap usage</p>
          
          <div className="timer-presets">
            <button 
              className="timer-preset-btn"
              onClick={() => handleStart(1)}
            >
              1 min
            </button>
            <button 
              className="timer-preset-btn"
              onClick={() => handleStart(5)}
            >
              5 min
            </button>
            <button 
              className="timer-preset-btn"
              onClick={() => handleStart(10)}
            >
              10 min
            </button>
            <button 
              className="timer-preset-btn"
              onClick={() => handleStart(15)}
            >
              15 min
            </button>
          </div>

          <div className="timer-custom">
            <input
              type="number"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="Custom minutes"
              min="1"
              max="1440"
              step="0.5"
            />
            <button 
              className="timer-start-btn"
              onClick={handleCustomStart}
              disabled={!customDuration}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = timerUtils.getTimerProgress(timer);
  const isExpired = timer.expired;
  const isCancelled = timer.cancelledByFlowStop;

  return (
    <div className="tap-timer">
      <div className={`timer-active ${isExpired ? 'expired' : ''} ${isCancelled ? 'cancelled' : ''}`}>
        <div className="timer-header">
          <div className="timer-outlet">
            <span className="outlet-icon">{timer.outlet === 'kitchen' ? '🍳' : '🚿'}</span>
            <span className="outlet-name">
              {timer.outlet === 'kitchen' ? 'Kitchen' : 'Bathroom'}
            </span>
          </div>
          
          {timer.paused && (
            <span className="timer-paused-badge">PAUSED</span>
          )}
          
          {isExpired && (
            <span className="timer-expired-badge">EXPIRED</span>
          )}
          
          {isCancelled && (
            <span className="timer-cancelled-badge">FLOW STOPPED</span>
          )}
        </div>

        <div className="timer-display">
          <div className="timer-time-large">
            {remaining ? remaining.formatted : '--:--'}
          </div>
          <div className="timer-label">Remaining</div>
        </div>

        <div className="timer-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            {elapsed ? `Elapsed: ${elapsed.formatted}` : 'Elapsed: --:--'}
          </div>
        </div>

        <div className="timer-info">
          <div className="info-item">
            <span className="info-label">Total Duration:</span>
            <span className="info-value">{timerUtils.formatDuration(timer.durationMinutes)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Deadline:</span>
            <span className="info-value">
              {new Date(timer.deadline).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="timer-controls">
          {!timer.completed && (
            <>
              {timer.paused ? (
                <button 
                  className="timer-control-btn resume"
                  onClick={onResume}
                >
                  ▶ Resume
                </button>
              ) : (
                <button 
                  className="timer-control-btn pause"
                  onClick={onPause}
                >
                  ⏸ Pause
                </button>
              )}
              
              <button 
                className="timer-control-btn extend"
                onClick={() => setShowExtendDialog(true)}
              >
                ➕ Extend
              </button>
              
              <button 
                className="timer-control-btn stop"
                onClick={onStop}
              >
                ⏹ Stop
              </button>
            </>
          )}

          {timer.completed && (
            <button 
              className="timer-control-btn new"
              onClick={() => onStop()}
            >
              + New Timer
            </button>
          )}
        </div>

        {showExtendDialog && (
          <div className="timer-extend-dialog">
            <div className="dialog-content">
              <h4>Extend Timer</h4>
              
              <div className="extend-presets">
                <button onClick={() => handleQuickExtend(1)}>+1 min</button>
                <button onClick={() => handleQuickExtend(5)}>+5 min</button>
                <button onClick={() => handleQuickExtend(10)}>+10 min</button>
              </div>

              <div className="extend-custom">
                <input
                  type="number"
                  value={extendAmount}
                  onChange={(e) => setExtendAmount(e.target.value)}
                  placeholder="Minutes"
                  min="1"
                  max="1440"
                  step="0.5"
                />
                <button onClick={handleExtend}>Add</button>
              </div>

              <button 
                className="dialog-close"
                onClick={() => setShowExtendDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TapTimer;
