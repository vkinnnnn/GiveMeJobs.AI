/**
 * Accessible Modal Component
 * Provides modal dialogs with focus trap and keyboard support
 */

'use client';

import { useEffect } from 'react';
import { useFocusTrap, useEscapeKey, useAnnouncer } from '@/hooks/useAccessibility';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdropClick = true,
}: ModalProps) {
  const modalRef = useFocusTrap(isOpen);
  const announce = useAnnouncer();

  // Close on escape key
  useEscapeKey(onClose, isOpen);

  // Announce when modal opens
  useEffect(() => {
    if (isOpen) {
      announce(`${title} dialog opened`, 'polite');
      // Prevent body scroll
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, title, announce]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          aria-hidden="true"
          onClick={handleBackdropClick}
        />

        {/* Modal */}
        <div
          ref={modalRef as React.RefObject<HTMLDivElement>}
          className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md p-1"
              aria-label="Close dialog"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
