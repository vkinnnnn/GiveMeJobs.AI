# GiveMeJobs Frontend Architecture Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Project Structure](#project-structure)
4. [Configuration Files](#configuration-files)
5. [Application Routing](#application-routing)
6. [Component Architecture](#component-architecture)
7. [State Management](#state-management)
8. [Accessibility Implementation](#accessibility-implementation)
9. [Performance Optimizations](#performance-optimizations)
10. [Testing Strategy](#testing-strategy)

---

## Project Overview

**GiveMeJobs** is a comprehensive AI-powered job application platform built with Next.js 14, featuring:

- **AI-Powered Resume & Cover Letter Generation**
- **Intelligent Job Matching & Recommendations**
- **Application Tracking & Analytics**
- **Interview Preparation Tools**
- **WCAG 2.1 AA Accessibility Compliance**
- **Mobile-First Responsive Design**
- **OAuth Authentication (Google/LinkedIn)**

### Key Features
✅ **Complete Job Search Platform** - Search, save, and apply to jobs  
✅ **Application Management** - Track application lifecycle with detailed analytics  
✅ **Document Generation** - AI-powered resume and cover letter creation  
✅ **Interview Preparation** - AI-generated questions and company research  
✅ **Analytics Dashboard** - Comprehensive job search insights  
✅ **Profile Management** - Skills, experience, and career goals tracking  
✅ **Accessibility First** - Full WCAG 2.1 AA compliance  
✅ **Mobile Optimized** - Progressive Web App capabilities  

---

## Architecture & Technology Stack

### Core Technologies
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Testing**: Vitest + Playwright
- **Monitoring**: Sentry

### Development Tools
- **Linting**: ESLint + Next.js Config
- **Type Checking**: TypeScript
- **Build Tool**: Next.js SWC
- **Package Manager**: npm/yarn
- **Deployment**: Docker + Standalone Output

---

## Project Structure

```
packages/frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── api/               # API routes
│   │   ├── auth/              # OAuth callback
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── analytics/         # Analytics components
│   │   ├── applications/      # Application tracking
│   │   ├── interview-prep/    # Interview preparation
│   │   ├── jobs/              # Job search components
│   │   ├── layout/            # Layout components
│   │   ├── profile/           # Profile management
│   │   ├── providers/         # Context providers
│   │   └── ui/                # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── services/              # External services
│   ├── stores/                # Zustand state stores
│   └── tests/                 # Test files
├── e2e/                       # End-to-end tests
├── public/                    # Static assets
├── .env.local                 # Environment variables
├── next.config.js             # Next.js configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

---

## Configuration Files

### Package.json
```json
{
  "name": "@givemejobs/frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:a11y": "vitest run src/tests/accessibility.test.ts",
    "test:watch": "vitest watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  },
  "dependencies": {
    "@givemejobs/shared-types": "*",
    "@hookform/resolvers": "^5.2.2",
    "@sentry/nextjs": "^10.20.0",
    "@tailwindcss/forms": "^0.5.10",
    "axios": "^1.6.0",
    "critters": "^0.0.23",
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.65.0",
    "zod": "^3.25.76",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.56.1",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.0.0",
    "playwright": "^1.56.1",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.2.0",
    "vitest": "^1.0.0"
  }
}
```

### Next.js Configuration
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Prevent hydration mismatches
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Output configuration for standalone deployment
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: ['api.givemejobs.com', 'staging-api.givemejobs.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Compression
  compress: true,
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@givemejobs/shared-types'],
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
```

### Tailwind CSS Configuration
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Ensure touch-friendly sizes
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      // Mobile-first breakpoints
      screens: {
        xs: '475px',
        // sm: '640px', // default
        // md: '768px', // default
        // lg: '1024px', // default
        // xl: '1280px', // default
        // '2xl': '1536px', // default
      },
      // Safe area insets for mobile devices
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
```

---

## Application Routing

### Route Structure

#### Public Routes
- `/` - Landing page (redirects based on auth status)
- `/login` - User authentication
- `/register` - User registration
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/auth/callback` - OAuth callback handler

#### Protected Routes (Dashboard)
- `/dashboard` - Main dashboard with overview
- `/profile` - User profile management
- `/jobs` - Job search and browsing
- `/jobs/[id]` - Individual job details
- `/jobs/saved` - Saved jobs list
- `/jobs/alerts` - Job alert management
- `/applications` - Application tracking
- `/applications/[id]` - Individual application details
- `/documents` - Document management
- `/documents/generate` - Document generation
- `/documents/edit/[id]` - Document editor
- `/documents/export/[id]` - Document export
- `/documents/templates` - Template library
- `/interview-prep` - Interview preparation tools
- `/analytics` - Job search analytics

### Route Protection

All dashboard routes are protected using the `ProtectedRoute` component:

```typescript
// src/components/ProtectedRoute.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    setMounted(true);
    // Manually hydrate the store
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

---

## Component Architecture

### Layout Components

#### Root Layout
```typescript
// src/app/layout.tsx
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
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning>
        <div id="skip-links">
          <SkipLink href="#main-content">Skip to main content</SkipLink>
          <SkipLink href="#navigation">Skip to navigation</SkipLink>
        </div>
        <OfflineIndicator />
        <ErrorBoundary>
          {children}
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

#### Dashboard Layout
```typescript
// src/app/(dashboard)/layout.tsx
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0">
        <Header />
        <div className="flex">
          <Sidebar />
          <main 
            id="main-content" 
            className="flex-1 p-4 sm:p-6"
            role="main"
            aria-label="Main content"
            tabIndex={-1}
          >
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
        <BottomNav />
        <KeyboardShortcuts />
      </div>
    </ProtectedRoute>
  );
}
```

### UI Component Library

#### Button Component
```typescript
// src/components/ui/Button.tsx
/**
 * Accessible Button Component
 * Provides consistent button styling with full keyboard and screen reader support
 */

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { useReducedMotion } from '@/hooks/useAccessibility';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion();

    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className={`animate-spin -ml-1 mr-2 h-4 w-4 ${reducedMotion ? 'animate-none' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2" aria-hidden="true">{leftIcon}</span>}
        <span>{loading && loadingText ? loadingText : children}</span>
        {!loading && rightIcon && <span className="ml-2" aria-hidden="true">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

#### Modal Component
```typescript
// src/components/ui/Modal.tsx
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
```

### Component Categories

#### 1. Layout Components (`src/components/layout/`)
- **Header.tsx** - Top navigation with user menu and mobile toggle
- **Sidebar.tsx** - Desktop sidebar navigation with icons
- **BottomNav.tsx** - Mobile bottom navigation bar

#### 2. UI Components (`src/components/ui/`)
- **Button.tsx** - Accessible button with variants and loading states
- **Card.tsx** - Responsive card component with variants
- **Input.tsx** - Form input with validation and accessibility
- **Modal.tsx** - Accessible modal with focus trap
- **Skeleton.tsx** - Loading skeleton components
- **LazyImage.tsx** - Performance-optimized image loading
- **ResponsiveContainer.tsx** - Responsive layout wrapper
- **ResponsiveGrid.tsx** - Responsive grid system
- **SkipLink.tsx** - Accessibility skip navigation
- **VisuallyHidden.tsx** - Screen reader only content
- **LiveRegion.tsx** - Dynamic content announcements

#### 3. Feature Components
- **Analytics** (`src/components/analytics/`)
  - MetricsCards.tsx
  - TrendCharts.tsx
  - InsightsPanel.tsx
  - BenchmarkComparison.tsx
  - ExportPanel.tsx

- **Applications** (`src/components/applications/`)
  - ApplicationCard.tsx
  - ApplicationFilters.tsx
  - ApplicationStats.tsx
  - ApplicationTimeline.tsx
  - ApplicationTrends.tsx
  - ApplicationHealthBar.tsx
  - ApplicationNotes.tsx
  - StatusUpdateModal.tsx

- **Interview Prep** (`src/components/interview-prep/`)
  - InterviewQuestions.tsx
  - CompanyResearch.tsx
  - InterviewTips.tsx
  - PracticeMode.tsx
  - ResponseFeedback.tsx
  - InterviewReminders.tsx

- **Jobs** (`src/components/jobs/`)
  - JobRecommendations.tsx

- **Profile** (`src/components/profile/`)
  - SkillsSection.tsx
  - ExperienceSection.tsx
  - EducationSection.tsx
  - CareerGoalsSection.tsx
  - PreferencesSection.tsx
  - SkillScoreWidget.tsx
  - SkillProgressChart.tsx

#### 4. Core Components (`src/components/`)
- **ErrorBoundary.tsx** - Error handling wrapper
- **ProtectedRoute.tsx** - Authentication guard
- **Toast.tsx** - Notification system
- **KeyboardShortcuts.tsx** - Global keyboard navigation
- **OfflineIndicator.tsx** - Network status indicator
- **NoSSR.tsx** - Client-side only rendering wrapper

---

## State Management

### Zustand Stores

The application uses Zustand for state management with the following stores:

#### 1. Authentication Store (`src/stores/auth.store.ts`)
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  refreshAccessToken: () => Promise<void>;
}
```

#### 2. Jobs Store (`src/stores/jobs.store.ts`)
```typescript
interface JobsState {
  jobs: Job[];
  savedJobs: Job[];
  currentJob: Job | null;
  matchAnalysis: JobMatchAnalysis | null;
  isLoading: boolean;
  totalPages: number;
  currentPage: number;
  searchJobs: (query: JobSearchQuery) => Promise<void>;
  getJobById: (id: string) => Promise<void>;
  getMatchAnalysis: (jobId: string) => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  getSavedJobs: () => Promise<void>;
  getRecommendations: () => Promise<void>;
}
```

#### 3. Applications Store (`src/stores/applications.store.ts`)
```typescript
interface ApplicationsState {
  applications: Application[];
  currentApplication: Application | null;
  stats: ApplicationStats | null;
  isLoading: boolean;
  getApplications: () => Promise<void>;
  getApplicationById: (id: string) => Promise<void>;
  createApplication: (data: CreateApplicationData) => Promise<void>;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => Promise<void>;
  addNote: (id: string, note: NoteData) => Promise<void>;
  getStats: () => Promise<void>;
}
```

#### 4. Documents Store (`src/stores/documents.store.ts`)
```typescript
interface DocumentsState {
  documents: GeneratedDocument[];
  templates: DocumentTemplate[];
  currentDocument: GeneratedDocument | null;
  isLoading: boolean;
  isGenerating: boolean;
  generateResume: (request: DocumentGenerationRequest) => Promise<GeneratedDocument>;
  generateCoverLetter: (request: DocumentGenerationRequest) => Promise<GeneratedDocument>;
  getDocuments: (userId: string) => Promise<void>;
  getDocumentById: (id: string) => Promise<void>;
  updateDocument: (id: string, content: any) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  exportDocument: (id: string, format: 'pdf' | 'docx' | 'txt') => Promise<Blob>;
  getTemplates: () => Promise<void>;
  getTemplateById: (id: string) => Promise<DocumentTemplate>;
}
```

#### 5. Profile Store (`src/stores/profile.store.ts`)
```typescript
interface ProfileState {
  profile: UserProfile | null;
  skillScore: SkillScore | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  fetchSkillScore: (userId: string) => Promise<void>;
  updateProfile: (userId: string, data: Partial<UserProfile>) => Promise<void>;
  addSkill: (userId: string, skill: Omit<Skill, 'id'>) => Promise<void>;
  updateSkill: (userId: string, skillId: string, skill: Partial<Skill>) => Promise<void>;
  deleteSkill: (userId: string, skillId: string) => Promise<void>;
  // ... other CRUD operations for experience, education, career goals
  updatePreferences: (userId: string, preferences: UserPreferences) => Promise<void>;
}
```

#### 6. Analytics Store (`src/stores/analytics.store.ts`)
```typescript
interface AnalyticsState {
  dashboard: AnalyticsDashboard | null;
  benchmarks: BenchmarkComparison | null;
  loading: boolean;
  error: string | null;
  fetchDashboard: (period?: 'week' | 'month' | 'quarter' | 'year') => Promise<void>;
  fetchBenchmarks: () => Promise<void>;
  exportAnalytics: (format: 'csv' | 'pdf', period: string) => Promise<void>;
  clearError: () => void;
}
```

#### 7. Interview Prep Store (`src/stores/interview-prep.store.ts`)
```typescript
interface InterviewPrepState {
  interviewPreps: InterviewPrep[];
  currentPrep: InterviewPrep | null;
  practiceSessions: PracticeSession[];
  currentSession: PracticeSession | null;
  isLoading: boolean;
  generateInterviewPrep: (applicationId: string) => Promise<void>;
  getInterviewPrep: (applicationId: string) => Promise<void>;
  submitPracticeResponse: (prepId: string, questionId: string, response: string) => Promise<void>;
  getPracticeSessions: (prepId: string) => Promise<void>;
  analyzeResponse: (prepId: string, practiceId: string) => Promise<void>;
}
```

### State Persistence

Authentication state is persisted using Zustand's persist middleware:

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      skipHydration: true,
    }
  )
);
```

---

## Accessibility Implementation

### WCAG 2.1 AA Compliance

The application implements comprehensive accessibility features:

#### 1. Accessibility Utilities (`src/lib/accessibility.ts`)
```typescript
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
```

#### 2. Accessibility Hooks (`src/hooks/useAccessibility.ts`)
```typescript
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
 * Hook for announcing messages to screen readers
 */
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);

  return announce;
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
```

#### 3. Global Accessibility Styles (`src/app/globals.css`)
```css
/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Make sr-only content visible when focused */
.sr-only:focus,
.sr-only:active {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Skip link styles */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}

/* Focus visible styles for keyboard navigation */
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Remove focus outline for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  * {
    border-color: currentColor;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Touch target size (minimum 44x44px for WCAG 2.1) */
button,
a,
input[type="checkbox"],
input[type="radio"],
select {
  min-height: 44px;
  min-width: 44px;
}

/* Exception for inline links */
p a,
li a {
  min-height: auto;
  min-width: auto;
}

/* Ensure form labels are associated */
label {
  cursor: pointer;
}

/* Improve form field visibility */
input:focus,
textarea:focus,
select:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Error states */
[aria-invalid="true"] {
  border-color: #dc2626;
}

[aria-invalid="true"]:focus {
  outline-color: #dc2626;
}

/* Loading states */
[aria-busy="true"] {
  cursor: wait;
  opacity: 0.6;
}

/* Disabled states */
:disabled,
[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.5;
}
```

### Accessibility Features

1. **Keyboard Navigation**
   - Full keyboard support for all interactive elements
   - Custom keyboard shortcuts (Shift+G for dashboard, Shift+J for jobs, etc.)
   - Focus management and visible focus indicators
   - Skip links for main content and navigation

2. **Screen Reader Support**
   - Proper ARIA labels and descriptions
   - Live regions for dynamic content announcements
   - Semantic HTML structure
   - Alternative text for images

3. **Visual Accessibility**
   - High contrast mode support
   - Reduced motion preferences
   - Sufficient color contrast ratios (WCAG AA)
   - Touch-friendly target sizes (44px minimum)

4. **Form Accessibility**
   - Associated labels for all form controls
   - Error state indicators
   - Validation messages with proper ARIA
   - Required field indicators

---

## Performance Optimizations

### 1. Code Splitting & Lazy Loading
- Automatic route-based code splitting via Next.js App Router
- Dynamic imports for heavy components
- Lazy image loading with intersection observer

### 2. Bundle Optimization
```javascript
// next.config.js - Webpack optimization
webpack: (config, { dev, isServer }) => {
  if (!dev) {
    config.optimization = {
      ...config.optimization,
      minimize: true,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    };
  }
  return config;
}
```

### 3. Image Optimization
```javascript
// next.config.js - Image configuration
images: {
  domains: ['api.givemejobs.com', 'staging-api.givemejobs.com'],
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 60,
}
```

### 4. Caching Strategy
```javascript
// HTTP headers for caching
async headers() {
  return [
    {
      source: '/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/_next/image',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
}
```

### 5. Network Optimization
- Connection quality detection
- Adaptive loading based on network speed
- Offline support with service worker
- Request deduplication and caching

### 6. Runtime Optimizations
- React.memo for expensive components
- useMemo and useCallback for expensive computations
- Virtualization for large lists
- Skeleton loading states

---

## Testing Strategy

### 1. Unit Testing (Vitest)
```json
// package.json scripts
{
  "test": "vitest",
  "test:a11y": "vitest run src/tests/accessibility.test.ts",
  "test:watch": "vitest watch"
}
```

### 2. End-to-End Testing (Playwright)
```typescript
// e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
```

### 3. Accessibility Testing
```typescript
// src/tests/accessibility.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA attributes when loading', async () => {
    const { getByRole } = render(<Button loading>Loading...</Button>);
    const button = getByRole('button');
    
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
```

### 4. Test Scripts
```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

---

## Summary

This documentation provides a comprehensive overview of the GiveMeJobs frontend architecture, including:

- **Modern Tech Stack** - Next.js 14, TypeScript, Tailwind CSS, Zustand
- **Accessibility First** - WCAG 2.1 AA compliance with comprehensive accessibility features
- **Performance Optimized** - Code splitting, lazy loading, image optimization, caching
- **Mobile Responsive** - Progressive Web App with mobile-first design
- **Comprehensive Testing** - Unit tests, E2E tests, accessibility testing
- **Production Ready** - Docker deployment, monitoring, error handling

The application follows modern React patterns and best practices while maintaining a focus on accessibility, performance, and user experience across all devices and abilities.