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
