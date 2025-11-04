/**
 * Skip Link Component
 * Allows keyboard users to skip to main content
 */

'use client';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof document !== 'undefined') {
      const target = document.querySelector(href);
      if (target instanceof HTMLElement) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
    >
      {children}
    </a>
  );
}
