// Flow Utilities - Flow classification and discrepancy calculation
// Shared logic used by both demo and hardware modes

/**
 * Classify flow rate based on thresholds
 * @param {number} flow - Current flow rate in L/min
 * @param {object} thresholds - Threshold configuration
 * @returns {string} - Classification: 'NO_FLOW', 'LOW_FLOW', 'NORMAL_FLOW', 'HEAVY_FLOW'
 */
function classifyFlow(flow, thresholds) {
  if (flow <= thresholds.flowStop) {
    return 'NO_FLOW';
  }
  if (flow < thresholds.lowFlow) {
    return 'LOW_FLOW';
  }
  if (flow > thresholds.heavyFlow) {
    return 'HEAVY_FLOW';
  }
  return 'NORMAL_FLOW';
}

/**
 * Calculate flow discrepancy
 * @param {number} mainInletFlow - Main inlet flow in L/min
 * @param {number} kitchenFlow - Kitchen outlet flow in L/min
 * @param {number} bathroomFlow - Bathroom outlet flow in L/min
 * @returns {object} - Discrepancy value and analysis
 */
function calculateDiscrepancy(mainInletFlow, kitchenFlow, bathroomFlow) {
  const totalOutletFlow = kitchenFlow + bathroomFlow;
  const discrepancy = mainInletFlow - totalOutletFlow;
  
  return {
    value: discrepancy,
    absolute: Math.abs(discrepancy),
    percentage: totalOutletFlow > 0 ? (discrepancy / totalOutletFlow) * 100 : 0,
    totalOutletFlow,
    mainInletFlow
  };
}

/**
 * Check if discrepancy exceeds tolerance
 * @param {object} discrepancy - Discrepancy object from calculateDiscrepancy
 * @param {number} tolerance - Tolerance threshold in L/min
 * @returns {boolean}
 */
function isDiscrepancySignificant(discrepancy, tolerance) {
  return discrepancy.absolute > tolerance;
}

/**
 * Get human-readable classification label
 * @param {string} classification - Flow classification
 * @returns {string}
 */
function getClassificationLabel(classification) {
  const labels = {
    'NO_FLOW': 'No Flow',
    'LOW_FLOW': 'Low Flow',
    'NORMAL_FLOW': 'Normal Flow',
    'HEAVY_FLOW': 'Heavy Flow'
  };
  return labels[classification] || 'Unknown';
}

/**
 * Get classification color for UI
 * @param {string} classification - Flow classification
 * @returns {string} - CSS color
 */
function getClassificationColor(classification) {
  const colors = {
    'NO_FLOW': '#6c757d',
    'LOW_FLOW': '#ffc107',
    'NORMAL_FLOW': '#28a745',
    'HEAVY_FLOW': '#dc3545'
  };
  return colors[classification] || '#6c757d';
}

/**
 * Format flow rate for display
 * @param {number} flow - Flow rate in L/min
 * @param {number} decimals - Number of decimal places
 * @returns {string}
 */
function formatFlowRate(flow, decimals = 2) {
  return `${flow.toFixed(decimals)} L/min`;
}

/**
 * Format volume for display
 * @param {number} volume - Volume in litres
 * @param {number} decimals - Number of decimal places
 * @returns {string}
 */
function formatVolume(volume, decimals = 2) {
  return `${volume.toFixed(decimals)} L`;
}

/**
 * Validate threshold configuration
 * @param {object} thresholds - Threshold configuration
 * @returns {object} - Validation result with isValid and errors
 */
function validateThresholds(thresholds) {
  const errors = [];
  
  if (thresholds.flowStop < 0) {
    errors.push('Flow stop threshold cannot be negative');
  }
  
  if (thresholds.lowFlow <= thresholds.flowStop) {
    errors.push('Low flow threshold must be greater than flow stop threshold');
  }
  
  if (thresholds.heavyFlow <= thresholds.lowFlow) {
    errors.push('Heavy flow threshold must be greater than low flow threshold');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Apply hysteresis to prevent alert flickering
 * @param {number} currentFlow - Current flow value
 * @param {string} currentClassification - Current classification
 * @param {object} thresholds - Threshold configuration
 * @param {number} hysteresisMargin - Hysteresis margin (default 10% of threshold)
 * @returns {string} - New classification
 */
function applyHysteresis(currentFlow, currentClassification, thresholds, hysteresisMargin = 0.1) {
  const stopThreshold = thresholds.flowStop;
  const lowThreshold = thresholds.lowFlow;
  const heavyThreshold = thresholds.heavyFlow;
  
  const margin = hysteresisMargin * (heavyThreshold - lowThreshold);
  
  // If currently NO_FLOW, require flow above stopThreshold + margin to change
  if (currentClassification === 'NO_FLOW') {
    if (currentFlow > stopThreshold + margin) {
      return classifyFlow(currentFlow, thresholds);
    }
    return 'NO_FLOW';
  }
  
  // If currently LOW_FLOW, require flow below stopThreshold or above lowThreshold + margin to change
  if (currentClassification === 'LOW_FLOW') {
    if (currentFlow <= stopThreshold) {
      return 'NO_FLOW';
    }
    if (currentFlow > lowThreshold + margin) {
      return classifyFlow(currentFlow, thresholds);
    }
    return 'LOW_FLOW';
  }
  
  // If currently NORMAL_FLOW, apply margin at both boundaries
  if (currentClassification === 'NORMAL_FLOW') {
    if (currentFlow < lowThreshold - margin) {
      return 'LOW_FLOW';
    }
    if (currentFlow > heavyThreshold - margin) {
      return 'HEAVY_FLOW';
    }
    return 'NORMAL_FLOW';
  }
  
  // If currently HEAVY_FLOW, require flow below heavyThreshold - margin to change
  if (currentClassification === 'HEAVY_FLOW') {
    if (currentFlow < heavyThreshold - margin) {
      return classifyFlow(currentFlow, thresholds);
    }
    return 'HEAVY_FLOW';
  }
  
  return classifyFlow(currentFlow, thresholds);
}

export default {
  classifyFlow,
  calculateDiscrepancy,
  isDiscrepancySignificant,
  getClassificationLabel,
  getClassificationColor,
  formatFlowRate,
  formatVolume,
  validateThresholds,
  applyHysteresis
};
