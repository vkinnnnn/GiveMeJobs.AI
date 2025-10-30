'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useHydration } from '@/hooks/useHydration';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useHydration();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (hydrated) {
      // Manually hydrate the store
      useAuthStore.persist.rehydrate();
    }
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, isLoading, router]);

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
