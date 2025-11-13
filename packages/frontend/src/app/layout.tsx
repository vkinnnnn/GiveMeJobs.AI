import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ChatBot } from '@/components/chatbot';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GiveMeJobs - Your AI-Powered Job Search Platform',
  description: 'Find your dream job with AI-powered job search, resume building, and interview preparation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ChatBot defaultOpen={false} position="bottom-right" theme="auto" />
      </body>
    </html>
  );
}
