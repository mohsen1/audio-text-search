'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mic, FileText, Search, User, LogOut, AudioWaveform, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  backTo?: string;
}

export default function Header({ title = "Audio Text Search", showBackButton = false, backTo = "/" }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!session) return null;

  const navigationItems = [
    { icon: Mic, label: 'Transcribe', path: '/upload', color: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300' },
    { icon: FileText, label: 'Files', path: '/files', color: 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300' },
    { icon: Search, label: 'Search', path: '/search', color: 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300' },
  ];

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={() => router.push(backTo)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <AudioWaveform className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </h1>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex space-x-1">
              {navigationItems.map(({ icon: Icon, label, path, color }) => (
                <button
                  key={path}
                  onClick={() => router.push(path)}
                  className={`${color} font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all transform hover:scale-105`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/profile')}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
              >
                <User size={18} />
                Profile
              </button>
              <button
                onClick={() => signOut()}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4 space-y-2">
            {navigationItems.map(({ icon: Icon, label, path, color }) => (
              <button
                key={path}
                onClick={() => {
                  router.push(path);
                  setMobileMenuOpen(false);
                }}
                className={`${color} font-medium flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all w-full text-left`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-2">
              <button
                onClick={() => {
                  router.push('/profile');
                  setMobileMenuOpen(false);
                }}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all w-full text-left"
              >
                <User size={20} />
                Profile
              </button>
              <button
                onClick={() => signOut()}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full text-left"
              >
                <LogOut size={20} />
                Sign out
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 px-4 py-2">
              {session.user?.name || session.user?.email}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}