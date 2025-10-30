/**
 * Network Status Hook
 * Detects online/offline status and connection quality
 */

import { useState, useEffect } from 'react';

export type ConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: ConnectionType;
  effectiveType: ConnectionType;
  downlink?: number;
  rtt?: number;
  saveData: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    saveData: false,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      setNetworkStatus({
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData || false,
      });
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    connection?.addEventListener('change', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      connection?.removeEventListener('change', updateNetworkStatus);
    };
  }, []);

  return networkStatus;
}

export function useIsSlowConnection(): boolean {
  const { effectiveType, saveData } = useNetworkStatus();
  return effectiveType === 'slow-2g' || effectiveType === '2g' || saveData;
}
