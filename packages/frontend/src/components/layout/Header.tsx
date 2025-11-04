'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useEscapeKey, useAnnouncer } from '@/hooks/useAccessibility';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => (mounted ? state.user : null));
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const logout = useAuthStore((state) => state.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const announce = useAnnouncer();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Job Search', href: '/jobs' },
    { name: 'Applications', href: '/applications' },
    { name: 'Documents', href: '/documents' },
    { name: 'Profile', href: '/profile' },
  ];

  const handleLogout = () => {
    logout();
    announce('You have been logged out', 'polite');
  };

  const toggleMobileMenu = () => {
    const newState = !mobileMenuOpen;
    setMobileMenuOpen(newState);
    announce(newState ? 'Menu opened' : 'Menu closed', 'polite');
  };

  // Close mobile menu on escape key
  useEscapeKey(() => setMobileMenuOpen(false), mobileMenuOpen);

  // Focus management for mobile menu
  useEffect(() => {
    if (mobileMenuOpen && mobileMenuRef.current) {
      const firstLink = mobileMenuRef.current.querySelector('a');
      firstLink?.focus();
    }
  }, [mobileMenuOpen]);

  return (
    <header className="bg-white shadow-sm" role="banner">
      <nav 
        id="navigation"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" 
        aria-label="Main navigation"
      >
        <div className="flex w-full items-center justify-between border-b border-gray-200 py-4 lg:border-none">
          <div className="flex items-center">
            <Link 
              href="/dashboard" 
              className="flex items-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded-md"
              aria-label="GiveMeJobs home"
            >
              <span className="text-2xl font-bold text-blue-600" aria-hidden="true">GiveMeJobs</span>
            </Link>
            <div className="ml-10 hidden space-x-8 lg:block" role="navigation" aria-label="Primary">
              {navigation.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded-md px-2 py-1 ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="ml-10 space-x-4 flex items-center">
            {user && (
              <>
                <span className="text-sm text-gray-700 hidden sm:inline" aria-label={`Logged in as ${user.firstName} ${user.lastName}`}>
                  {user.firstName} {user.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-block rounded-md border border-transparent bg-blue-600 py-2 px-4 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
                  aria-label="Log out of your account"
                >
                  Logout
                </button>
              </>
            )}
            <button
              type="button"
              className="lg:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              onClick={toggleMobileMenu}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            >
              <VisuallyHidden>
                {mobileMenuOpen ? 'Close menu' : 'Open menu'}
              </VisuallyHidden>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div 
            id="mobile-menu"
            ref={mobileMenuRef}
            className="lg:hidden py-4 space-y-2"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {navigation.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`block py-2 px-3 text-base font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </header>
  );
}
