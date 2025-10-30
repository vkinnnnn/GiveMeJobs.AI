# GiveMeJobs Frontend

Next.js 14 frontend application for the GiveMeJobs platform.

## Features Implemented

### Task 14.1: Next.js Setup ✅
- Next.js 14 with TypeScript
- Tailwind CSS for styling
- ESLint and Prettier configuration
- App Router architecture

### Task 14.2: Authentication UI ✅
- Login page with email/password and OAuth (Google, LinkedIn)
- Registration page with form validation
- Forgot password flow
- Reset password flow
- Form validation using react-hook-form and Zod

### Task 14.3: Layout and Navigation ✅
- Responsive header with navigation
- Sidebar navigation for desktop
- Mobile menu support
- Dashboard layout with protected routes
- Placeholder pages for all main sections

### Task 14.4: State Management ✅
- Zustand stores for:
  - Authentication (login, register, logout, token management)
  - Jobs (search, save, recommendations)
  - Applications (CRUD, status tracking, statistics)
- Persistent auth state using localStorage

### Task 14.5: API Client and Error Handling ✅
- Axios client with interceptors
- Automatic token refresh on 401 errors
- Global error boundary component
- Toast notification system
- Protected route wrapper
- Custom hooks for error handling

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── applications/
│   │   ├── documents/
│   │   ├── profile/
│   │   ├── interview-prep/
│   │   └── analytics/
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page (redirects)
├── components/
│   ├── layout/              # Layout components
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── ErrorBoundary.tsx
│   ├── ProtectedRoute.tsx
│   └── Toast.tsx
├── stores/                  # Zustand state stores
│   ├── auth.store.ts
│   ├── jobs.store.ts
│   └── applications.store.ts
├── lib/
│   └── api-client.ts        # Axios client with interceptors
└── hooks/
    └── useApiError.ts       # Error handling hook
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Key Features

### Authentication
- Email/password authentication
- OAuth integration (Google, LinkedIn)
- JWT token management with automatic refresh
- Protected routes

### State Management
- Zustand for lightweight state management
- Persistent authentication state
- Separate stores for different domains

### Error Handling
- Global error boundary
- Toast notifications for user feedback
- Automatic token refresh on authentication errors
- Graceful error messages

### UI/UX
- Responsive design (mobile, tablet, desktop)
- Tailwind CSS for styling
- Loading states
- Form validation with helpful error messages

## Next Steps

The following features are ready for implementation:
- Task 15: User profile and dashboard UI
- Task 16: Job search and matching UI
- Task 17: Document generation UI
- Task 18: Application tracking UI
- Task 19: Interview preparation UI
- Task 20: Analytics and insights UI

## API Integration

The frontend is configured to connect to the backend API at `http://localhost:4000`. All API calls include:
- Automatic authentication token injection
- Token refresh on expiration
- Error handling and user feedback
- Request/response interceptors

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Authentication**: JWT with refresh tokens
