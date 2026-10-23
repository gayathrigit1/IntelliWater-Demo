import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import storageService from '../services/storageService';
import './SystemInfo.css';

const SystemInfo = () => {
  const [currentPage, setCurrentPage] = useState('system');
  const [settings, setSettings] = useState(storageService.loadSettings());

  return (
    <div className="system-info-page">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Header 
        pageTitle="System Information" 
        mode={settings.mode}
        connectionStatus="DISCONNECTED"
      />
      
      <main className="main-content">
        <div className="system-info-content">
          <div className="info-section">
            <h2>Project Overview</h2>
            <div className="info-card">
              <h3>IntelliWater — Smart Water Monitoring and Tap Management System</h3>
              <p>
                IntelliWater is an IoT-based water monitoring system designed for sustainable water management 
                in residential and commercial buildings. The system monitors water flow through multiple outlets, 
                detects unusual flow patterns, and provides smart tap timing features to promote water conservation.
              </p>
              <div className="project-meta">
                <div className="meta-item">
                  <span className="meta-label">Category:</span>
                  <span className="meta-value">Sustainable Cities</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Award:</span>
                  <span className="meta-value">Vishwakarma Awards 2026</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Version:</span>
                  <span className="meta-value">1.0.0 (Frontend Prototype)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h2>Proposed Hardware Components</h2>
            <div className="hardware-list">
              <div className="hardware-item">
                <div className="hardware-icon">📡</div>
                <div className="hardware-details">
                  <h4>ESP32 Development Board</h4>
                  <p>Microcontroller with Wi-Fi connectivity for sensor data processing and communication</p>
                </div>
              </div>
              <div className="hardware-item">
                <div className="hardware-icon">💧</div>
                <div className="hardware-details">
                  <h4>Water Flow Sensors (x3)</h4>
                  <p>Compatible flow sensors for main inlet, kitchen outlet, and bathroom outlet measurement</p>
                </div>
              </div>
              <div className="hardware-item">
                <div className="hardware-icon">🔔</div>
                <div className="hardware-details">
                  <h4>Buzzer</h4>
                  <p>Audible alert device for timer expiry and critical warnings</p>
                </div>
              </div>
              <div className="hardware-item">
                <div className="hardware-icon">💡</div>
                <div className="hardware-details">
                  <h4>Status LEDs</h4>
                  <p>Visual indicators for system status, alerts, and connection state</p>
                </div>
              </div>
              <div className="hardware-item">
                <div className="hardware-icon">🔌</div>
                <div className="hardware-details">
                  <h4>USB Power Supply</h4>
                  <p>Low-voltage 5V power source for safe operation</p>
                </div>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h2>System Architecture</h2>
            <div className="architecture-diagram">
              <div className="arch-block sensor">
                <h4>Flow Sensors</h4>
                <p>Main Inlet, Kitchen, Bathroom</p>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-block controller">
                <h4>ESP32 Controller</h4>
                <p>Data processing, timer logic, alert generation</p>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-block wifi">
                <h4>Wi-Fi Communication</h4>
                <p>REST API / WebSocket to web dashboard</p>
              </div>
              <div className="arch-arrow">→</div>
              <div className="arch-block dashboard">
                <h4>Web Dashboard</h4>
                <p>React frontend (this application)</p>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h2>Current System Status</h2>
            <div className="status-grid">
              <div className="status-card">
                <div className="status-label">Operating Mode</div>
                <div className={`status-value ${settings.mode.toLowerCase()}`}>
                  {settings.mode === 'DEMO_MODE' ? '🔶 DEMO MODE' : '🟢 HARDWARE MODE'}
                </div>
              </div>
              <div className="status-card">
                <div className="status-label">Connection Status</div>
                <div className="status-value disconnected">
                  ❌ Not Connected
                </div>
              </div>
              <div className="status-card">
                <div className="status-label">Hardware Address</div>
                <div className="status-value">
                  {settings.hardwareAddress || 'Not configured'}
                </div>
              </div>
              <div className="status-card">
                <div className="status-label">Data Source</div>
                <div className="status-value demo">
                  💧 Simulated Demo Data
                </div>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h2>Feature Status</h2>
            <div className="feature-list">
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Dashboard with flow monitoring cards</span>
              </div>
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Flow classification (No Flow, Low, Normal, Heavy)</span>
              </div>
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Flow discrepancy calculation and warnings</span>
              </div>
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Smart tap timer with pause/resume/extend</span>
              </div>
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Configurable flow thresholds per outlet</span>
              </div>
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Alert system with history and acknowledgment</span>
              </div>
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Settings persistence (localStorage)</span>
              </div>
              <div className="feature-item implemented">
                <span className="feature-status">✅ Implemented</span>
                <span className="feature-name">Flow trend charts</span>
              </div>
              <div className="feature-item simulated">
                <span className="feature-status">🔶 Simulated</span>
                <span className="feature-name">Sensor data (demo sensor service)</span>
              </div>
              <div className="feature-item future">
                <span className="feature-status">🔮 Future</span>
                <span className="feature-name">ESP32 hardware connection</span>
              </div>
              <div className="feature-item future">
                <span className="feature-status">🔮 Future</span>
                <span className="feature-name">Real sensor data integration</span>
              </div>
              <div className="feature-item future">
                <span className="feature-status">🔮 Future</span>
                <span className="feature-name">Physical buzzer control</span>
              </div>
              <div className="feature-item future">
                <span className="feature-status">🔮 Future</span>
                <span className="feature-name">Automatic tap shutoff valve (requires additional hardware)</span>
              </div>
            </div>
          </div>

          <div className="info-section warning-section">
            <h2>⚠️ Important Safety Notes</h2>
            <div className="warning-box">
              <ul>
                <li>
                  <strong>Warning-Only System:</strong> This prototype provides warnings and alerts only. 
                  It does not automatically close taps or shut off water flow.
                </li>
                <li>
                  <strong>Hardware Required:</strong> To control water flow physically, a compatible automatic 
                  shutoff valve must be added and tested separately.
                </li>
                <li>
                  <strong>Electrical Safety:</strong> ESP32 GPIO pins are not 5V tolerant. Future firmware and 
                  wiring must account for signal-voltage compatibility.
                </li>
                <li>
                  <strong>Water Protection:</strong> Keep all electronics physically separated from water. 
                  Design for safe low-voltage power and protected wiring.
                </li>
                <li>
                  <strong>Sensor Calibration:</strong> Flow sensors require calibration for accurate measurements. 
                  Values shown in demo mode are simulated.
                </li>
                <li>
                  <strong>Discrepancy Interpretation:</strong> A flow discrepancy may indicate leakage, unmeasured 
                  water use, sensor calibration differences, or measurement timing differences. It does not 
                  prove a leak.
                </li>
              </ul>
            </div>
          </div>

          <div className="info-section">
            <h2>Technical Stack</h2>
            <div className="tech-stack">
              <div className="tech-item">
                <span className="tech-label">Frontend:</span>
                <span className="tech-value">React, Vite, JavaScript, CSS</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">State Management:</span>
                <span className="tech-value">React Hooks, localStorage</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Architecture:</span>
                <span className="tech-value">Component-based, service-separated</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Data Services:</span>
                <span className="tech-value">demoSensorService, hardwareService (placeholder)</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Utilities:</span>
                <span className="tech-value">flowUtils, timerUtils</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SystemInfo;
