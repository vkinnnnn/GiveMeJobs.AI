'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    setMounted(true);
    // Manually hydrate the store
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (mounted) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [mounted, isAuthenticated, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </main>
  );
}
