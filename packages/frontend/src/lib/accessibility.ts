/**
 * Accessibility Utilities
 * Provides helper functions and constants for WCAG 2.1 Level AA compliance
 */

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private focusableElements: HTMLElement[];
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previouslyFocused: HTMLElement | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.focusableElements = this.getFocusableElements();
    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(this.element.querySelectorAll(selector)) as HTMLElement[];
  }

  activate(): void {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.firstFocusable?.focus();
    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.previouslyFocused?.focus();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  };
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
} as const;

export function isActivationKey(key: string): boolean {
  return key === KeyboardKeys.ENTER || key === KeyboardKeys.SPACE;
}

/**
 * ARIA live region manager
 */
class LiveRegionManager {
  private regions: Map<string, HTMLElement> = new Map();

  getOrCreateRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
    if (this.regions.has(id)) {
      return this.regions.get(id)!;
    }

    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);

    this.regions.set(id, region);
    return region;
  }

  announce(message: string, regionId: string = 'default-live-region', priority: 'polite' | 'assertive' = 'polite'): void {
    const region = this.getOrCreateRegion(regionId, priority);
    region.textContent = message;
  }

  clear(regionId: string): void {
    const region = this.regions.get(regionId);
    if (region) {
      region.textContent = '';
    }
  }
}

export const liveRegionManager = new LiveRegionManager();

/**
 * Skip link utilities
 */
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = label;
  skipLink.className = 'skip-link';
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  });
  return skipLink;
}

/**
 * Color contrast checker (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: string): number {
  // Simplified - assumes hex color
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Accessible form helpers
 */
export function getAriaDescribedBy(...ids: (string | undefined)[]): string | undefined {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
}

export function getAriaInvalid(error?: string): boolean | undefined {
  return error ? true : undefined;
}

/**
 * Roving tabindex manager for keyboard navigation in lists
 */
export class RovingTabIndexManager {
  private items: HTMLElement[];
  private currentIndex: number = 0;

  constructor(items: HTMLElement[]) {
    this.items = items;
    this.updateTabIndex();
  }

  private updateTabIndex(): void {
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }

  handleKeyDown(e: KeyboardEvent): void {
    let newIndex = this.currentIndex;

    switch (e.key) {
      case KeyboardKeys.ARROW_DOWN:
      case KeyboardKeys.ARROW_RIGHT:
        e.preventDefault();
        newIndex = (this.currentIndex + 1) % this.items.length;
        break;
      case KeyboardKeys.ARROW_UP:
      case KeyboardKeys.ARROW_LEFT:
        e.preventDefault();
        newIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        break;
      case KeyboardKeys.HOME:
        e.preventDefault();
        newIndex = 0;
        break;
      case KeyboardKeys.END:
        e.preventDefault();
        newIndex = this.items.length - 1;
        break;
      default:
        return;
    }

    this.currentIndex = newIndex;
    this.updateTabIndex();
    this.items[this.currentIndex].focus();
  }
}

/**
 * Accessible notification/toast
 */
export function showAccessibleNotification(
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
): void {
  const priority = type === 'error' ? 'assertive' : 'polite';
  announceToScreenReader(`${type}: ${message}`, priority);
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Accessible loading state
 */
export function setLoadingState(element: HTMLElement, loading: boolean, label?: string): void {
  element.setAttribute('aria-busy', loading.toString());
  if (loading && label) {
    element.setAttribute('aria-label', label);
  } else if (!loading) {
    element.removeAttribute('aria-label');
  }
}
