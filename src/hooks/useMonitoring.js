import { useSyncExternalStore } from 'react';
import monitoringService from '../services/monitoringService';

// Live monitoring snapshot shared across pages
export default function useMonitoring() {
  return useSyncExternalStore(monitoringService.subscribe, monitoringService.getSnapshot);
}
