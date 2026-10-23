// Demo Sensor Service - Generates simulated sensor readings for IntelliWater
// This service provides realistic but clearly labelled demo data
// Actual hardware integration will use hardwareService.js

const OUTLETS = ['main_inlet', 'kitchen', 'bathroom'];

const BASELINE_FLOW = {
  main_inlet: 5.0,    // L/min
  kitchen: 2.5,      // L/min
  bathroom: 2.0      // L/min
};

let currentFlow = { ...BASELINE_FLOW };
let cumulativeVolume = {
  main_inlet: 0,
  kitchen: 0,
  bathroom: 0
};

let isFlowing = {
  main_inlet: true,
  kitchen: true,
  bathroom: true
};

let simulationInterval = null;
let listeners = [];

// Generate realistic variation
function addVariation(baseValue, variance = 0.3) {
  const variation = (Math.random() - 0.5) * 2 * variance * baseValue;
  return Math.max(0, baseValue + variation);
}

// Update flow rates periodically
function updateFlow() {
  OUTLETS.forEach(outlet => {
    if (isFlowing[outlet]) {
      currentFlow[outlet] = addVariation(BASELINE_FLOW[outlet], 0.4);
      // Update cumulative volume (assuming 1-second intervals)
      cumulativeVolume[outlet] += currentFlow[outlet] / 60;
    } else {
      currentFlow[outlet] = 0;
    }
  });

  notifyListeners();
}

// Notify all registered listeners
function notifyListeners() {
  const readings = getCurrentReadings();
  listeners.forEach(listener => listener(readings));
}

// Get current sensor readings
function getCurrentReadings() {
  return {
    timestamp: Date.now(),
    source: 'DEMO_MODE',
    outlet: 'main_inlet',
    flow: currentFlow.main_inlet,
    cumulativeVolume: cumulativeVolume.main_inlet,
    valid: true
  };
}

// Get all outlet readings
function getAllReadings() {
  return OUTLETS.map(outlet => ({
    timestamp: Date.now(),
    source: 'DEMO_MODE',
    outlet: outlet,
    flow: currentFlow[outlet],
    cumulativeVolume: cumulativeVolume[outlet],
    valid: true
  }));
}

// Start demo simulation
function startSimulation() {
  if (simulationInterval) return;
  
  simulationInterval = setInterval(updateFlow, 1000);
  console.log('[DemoSensorService] Simulation started');
}

// Stop demo simulation
function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log('[DemoSensorService] Simulation stopped');
  }
}

// Control flow for demo testing
function setFlowState(outlet, flowing) {
  if (OUTLETS.includes(outlet)) {
    isFlowing[outlet] = flowing;
    if (!flowing) {
      currentFlow[outlet] = 0;
    }
    updateFlow();
  }
}

// Set baseline flow for demo testing
function setBaselineFlow(outlet, value) {
  if (OUTLETS.includes(outlet) && value >= 0) {
    BASELINE_FLOW[outlet] = value;
    if (isFlowing[outlet]) {
      currentFlow[outlet] = value;
    }
  }
}

// Register callback for reading updates
function onReadingUpdate(callback) {
  listeners.push(callback);
}

// Unregister callback
function offReadingUpdate(callback) {
  listeners = listeners.filter(l => l !== callback);
}

// Reset demo state
function resetDemo() {
  currentFlow = { ...BASELINE_FLOW };
  cumulativeVolume = {
    main_inlet: 0,
    kitchen: 0,
    bathroom: 0
  };
  isFlowing = {
    main_inlet: true,
    kitchen: true,
    bathroom: true
  };
  notifyListeners();
}

// Initialize
startSimulation();

export default {
  getCurrentReadings,
  getAllReadings,
  startSimulation,
  stopSimulation,
  setFlowState,
  setBaselineFlow,
  onReadingUpdate,
  offReadingUpdate,
  resetDemo,
  OUTLETS
};
