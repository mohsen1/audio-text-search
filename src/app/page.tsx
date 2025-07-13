"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      checkApiKey();
    }
  }, [session]);

  const checkApiKey = async () => {
    try {
      const response = await fetch('/api/user/elevenlabs-key');
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasApiKey);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/user/elevenlabs-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (response.ok) {
        setHasApiKey(true);
        setShowApiKeyForm(false);
        setApiKey("");
      } else {
        console.error('Failed to save API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Audio Text Search
              </h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => router.push('/profile')}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => signOut()}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* API Key Setup */}
          {!hasApiKey && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    ElevenLabs API Key Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>You need to configure your ElevenLabs API key to use speech-to-text features.</p>
                  </div>
                  <div className="mt-4">
                    {!showApiKeyForm ? (
                      <button
                        onClick={() => setShowApiKeyForm(true)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors"
                      >
                        Add API Key
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          placeholder="Enter your ElevenLabs API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={saveApiKey}
                          disabled={loading || !apiKey.trim()}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setShowApiKeyForm(false);
                            setApiKey("");
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">📤</div>
                <h3 className="text-lg font-medium mb-2">Upload Audio Files</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Upload your audio files for speech-to-text transcription
                </p>
                <button
                  onClick={() => router.push('/upload')}
                  disabled={!hasApiKey}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Upload Files
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">📂</div>
                <h3 className="text-lg font-medium mb-2">My Files</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  View and search through your uploaded audio files and transcriptions
                </p>
                <button
                  onClick={() => router.push('/files')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
                >
                  View Files
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">⚙️</div>
                <h3 className="text-lg font-medium mb-2">Profile & Settings</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Manage your account, API keys, and preferences
                </p>
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Go to Profile
                </button>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Features</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Upload multiple audio files in batch
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Automatic speech-to-text transcription using ElevenLabs
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Search through file names and transcriptions
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Real-time processing status updates
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Secure API key storage and file management
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Audio Text Search</h1>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          Please sign in to continue
        </p>
        <button
          onClick={() => router.push('/signin')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
