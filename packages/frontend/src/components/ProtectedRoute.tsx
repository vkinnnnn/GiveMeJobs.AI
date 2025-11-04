'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    setMounted(true);
    // Manually hydrate the store
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  if (!mounted || isLoading) {
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
