/**
 * Accessibility Hooks
 * Custom React hooks for accessibility features
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FocusTrap,
  announceToScreenReader,
  generateId,
  prefersReducedMotion,
} from '@/lib/accessibility';

/**
 * Hook for managing focus trap in modals/dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const elementRef = useRef<HTMLElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    if (isActive) {
      focusTrapRef.current = new FocusTrap(elementRef.current);
      focusTrapRef.current.activate();
    }

    return () => {
      focusTrapRef.current?.deactivate();
    };
  }, [isActive]);

  return elementRef;
}

/**
 * Hook for generating stable IDs for ARIA relationships
 */
export function useId(prefix?: string): string {
  const [id] = useState(() => generateId(prefix));
  return id;
}

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);

  return announce;
}

/**
 * Hook for managing roving tabindex in lists
 */
export function useRovingTabIndex(itemsCount: number) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          newIndex = (currentIndex + 1) % itemsCount;
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = (currentIndex - 1 + itemsCount) % itemsCount;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = itemsCount - 1;
          break;
        default:
          return;
      }

      setCurrentIndex(newIndex);
      itemsRef.current[newIndex]?.focus();
    },
    [currentIndex, itemsCount]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        itemsRef.current[index] = el;
      },
      tabIndex: index === currentIndex ? 0 : -1,
      onKeyDown: handleKeyDown,
    }),
    [currentIndex, handleKeyDown]
  );

  return { getItemProps, currentIndex, setCurrentIndex };
}

/**
 * Hook for detecting reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  } = {}
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const matchesModifiers =
        (!options.ctrl || e.ctrlKey) &&
        (!options.shift || e.shiftKey) &&
        (!options.alt || e.altKey) &&
        (!options.meta || e.metaKey);

      if (e.key === key && matchesModifiers) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, options]);
}

/**
 * Hook for managing focus on mount
 */
export function useAutoFocus(shouldFocus: boolean = true) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus();
    }
  }, [shouldFocus]);

  return ref;
}

/**
 * Hook for managing escape key to close modals/menus
 */
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback, isActive]);
}

/**
 * Hook for managing click outside to close dropdowns/menus
 */
export function useClickOutside(callback: () => void, isActive: boolean = true) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [callback, isActive]);

  return ref;
}

/**
 * Hook for managing loading states with accessibility
 */
export function useAccessibleLoading(isLoading: boolean, loadingMessage: string = 'Loading...') {
  const announce = useAnnouncer();

  useEffect(() => {
    if (isLoading) {
      announce(loadingMessage, 'polite');
    }
  }, [isLoading, loadingMessage, announce]);

  return {
    'aria-busy': isLoading,
    'aria-live': 'polite' as const,
  };
}

/**
 * Hook for managing form field accessibility
 */
export function useFormField(options: {
  error?: string;
  description?: string;
  required?: boolean;
}) {
  const fieldId = useId('field');
  const errorId = useId('error');
  const descriptionId = useId('description');

  const describedBy = [
    options.description ? descriptionId : null,
    options.error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    fieldId,
    errorId,
    descriptionId,
    fieldProps: {
      id: fieldId,
      'aria-invalid': options.error ? true : undefined,
      'aria-describedby': describedBy || undefined,
      'aria-required': options.required,
    },
    errorProps: {
      id: errorId,
      role: 'alert',
    },
    descriptionProps: {
      id: descriptionId,
    },
  };
}
