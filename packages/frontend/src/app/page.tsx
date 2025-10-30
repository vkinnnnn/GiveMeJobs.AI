'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useHydration } from '@/hooks/useHydration';

export default function Home() {
  const router = useRouter();
  const hydrated = useHydration();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (hydrated) {
      // Manually hydrate the store
      useAuthStore.persist.rehydrate();
    }
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [hydrated, isAuthenticated, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </main>
  );
}
