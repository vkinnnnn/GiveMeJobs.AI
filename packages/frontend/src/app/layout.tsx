import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/Toast';
import { SkipLink } from '@/components/ui/SkipLink';
import { OfflineIndicator } from '@/components/OfflineIndicator';

export const metadata: Metadata = {
  title: 'GiveMeJobs - AI-Powered Job Application Platform',
  description: 'Streamline your job search with AI-powered tools for resume generation, job matching, and application tracking',
  keywords: 'job search, AI resume, job application, career tools, job matching',
  authors: [{ name: 'GiveMeJobs' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover',
  themeColor: '#2563eb',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <SkipLink href="#navigation">Skip to navigation</SkipLink>
        <OfflineIndicator />
        <ErrorBoundary>
          {children}
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
