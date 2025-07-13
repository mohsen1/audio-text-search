'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, FileText, Search, User, LogOut } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  backTo?: string;
}

export default function Header({ title = "Audio Text Search", showBackButton = false, backTo = "/" }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={() => router.push(backTo)}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <nav className="flex space-x-4">
              <button
                onClick={() => router.push('/upload')}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <Mic size={16} />
                Transcribe
              </button>
              <button
                onClick={() => router.push('/files')}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <FileText size={16} />
                Files
              </button>
              <button
                onClick={() => router.push('/search')}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <Search size={16} />
                Search
              </button>
            </nav>
            <div className="border-l border-gray-300 dark:border-gray-600 h-6"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {session.user?.name || session.user?.email}
            </span>
            <button
              onClick={() => router.push('/profile')}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white flex items-center gap-1"
            >
              <User size={16} />
              Profile
            </button>
            <button
              onClick={() => signOut()}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}