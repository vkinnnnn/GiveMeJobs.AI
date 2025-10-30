/**
 * Offline Indicator Component
 * Shows a banner when the user is offline
 */

'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useEffect } from 'react';
import { useAnnouncer } from '@/hooks/useAccessibility';

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const announce = useAnnouncer();

  useEffect(() => {
    if (!isOnline) {
      announce('You are currently offline. Some features may be unavailable.', 'assertive');
    } else {
      announce('You are back online.', 'polite');
    }
  }, [isOnline, announce]);

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-center space-x-2">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="font-medium">
          You're offline. Some features may be unavailable.
        </span>
      </div>
    </div>
  );
}
