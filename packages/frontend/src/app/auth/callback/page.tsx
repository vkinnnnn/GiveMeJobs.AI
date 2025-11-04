'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const handleOAuthCallback = async () => {
      try {
        // Get tokens from URL parameters
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const isNewUser = searchParams.get('isNewUser') === 'true';
        const errorParam = searchParams.get('error');

        console.log('OAuth callback processing:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          isNewUser,
          error: errorParam
        });

        if (errorParam) {
          console.error('OAuth error:', errorParam);
          setError(`Authentication failed: ${errorParam}`);
          setStatus('error');
          return;
        }

        if (!accessToken || !refreshToken) {
          console.error('Missing tokens');
          setError('Authentication tokens missing. Please try again.');
          setStatus('error');
          return;
        }

        // Set tokens in the auth store
        setTokens(accessToken, refreshToken);

        // Fetch user profile with the access token
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user profile: ${response.status}`);
        }

        const userData = await response.json();
        setUser(userData.user || userData.data?.user);

        setStatus('success');

        // Redirect after success
        setTimeout(() => {
          if (isNewUser) {
            router.push('/profile?welcome=true');
          } else {
            router.push('/dashboard');
          }
        }, 1500);

      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Authentication failed. Please try again.');
        setStatus('error');
      }
    };

    handleOAuthCallback();
  }, [mounted, searchParams, setTokens, setUser, router]);

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
          <p className="text-gray-600">Please wait while we set up your account.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in successful!</h2>
          <p className="text-gray-600">Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}