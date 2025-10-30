/**
 * Keyboard Shortcuts Component
 * Provides global keyboard shortcuts and displays help modal
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcut, useEscapeKey, useFocusTrap } from '@/hooks/useAccessibility';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();
  const helpModalRef = useFocusTrap(showHelp);

  const shortcuts: Shortcut[] = [
    {
      key: '/',
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
        searchInput?.focus();
      },
    },
    {
      key: 'g',
      description: 'Go to Dashboard',
      action: () => router.push('/dashboard'),
      shift: true,
    },
    {
      key: 'j',
      description: 'Go to Jobs',
      action: () => router.push('/jobs'),
      shift: true,
    },
    {
      key: 'a',
      description: 'Go to Applications',
      action: () => router.push('/applications'),
      shift: true,
    },
    {
      key: 'd',
      description: 'Go to Documents',
      action: () => router.push('/documents'),
      shift: true,
    },
    {
      key: 'p',
      description: 'Go to Profile',
      action: () => router.push('/profile'),
      shift: true,
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowHelp(true),
      shift: true,
    },
  ];

  // Register all shortcuts
  shortcuts.forEach((shortcut) => {
    useKeyboardShortcut(shortcut.key, shortcut.action, {
      ctrl: shortcut.ctrl,
      shift: shortcut.shift,
      alt: shortcut.alt,
    });
  });

  // Close help modal on escape
  useEscapeKey(() => setShowHelp(false), showHelp);

  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="keyboard-shortcuts-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          aria-hidden="true"
          onClick={() => setShowHelp(false)}
        />

        {/* Modal */}
        <div
          ref={helpModalRef as React.RefObject<HTMLDivElement>}
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="keyboard-shortcuts-title" className="text-2xl font-bold text-gray-900">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md p-1"
              aria-label="Close keyboard shortcuts dialog"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Navigation</h3>
              <dl className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex justify-between items-center py-2 border-b border-gray-200">
                    <dt className="text-gray-700">{shortcut.description}</dt>
                    <dd className="flex items-center space-x-1">
                      {shortcut.shift && (
                        <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                          Shift
                        </kbd>
                      )}
                      {shortcut.ctrl && (
                        <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                          Ctrl
                        </kbd>
                      )}
                      {shortcut.alt && (
                        <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                          Alt
                        </kbd>
                      )}
                      <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                        {shortcut.key}
                      </kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">General</h3>
              <dl className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <dt className="text-gray-700">Close dialogs/modals</dt>
                  <dd>
                    <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                      Esc
                    </kbd>
                  </dd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <dt className="text-gray-700">Navigate through items</dt>
                  <dd className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                      ↑
                    </kbd>
                    <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                      ↓
                    </kbd>
                  </dd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <dt className="text-gray-700">Activate buttons/links</dt>
                  <dd className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                      Enter
                    </kbd>
                    <span className="text-gray-500">or</span>
                    <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                      Space
                    </kbd>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowHelp(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
