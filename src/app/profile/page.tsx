'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (session) {
      fetchApiKeyStatus();
    }
  }, [session]);

  const fetchApiKeyStatus = async () => {
    try {
      const response = await fetch('/api/user/elevenlabs-key');
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasApiKey);
      }
    } catch (error) {
      console.error('Error fetching API key status:', error);
    }
  };

  const saveApiKey = async () => {
    if (!elevenlabsApiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter your ElevenLabs API key' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/elevenlabs-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: elevenlabsApiKey.trim() }),
      });

      if (response.ok) {
        setHasApiKey(true);
        setIsEditing(false);
        setElevenlabsApiKey('');
        setMessage({ type: 'success', text: 'API key saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save API key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setLoading(false);
    }
  };

  const removeApiKey = async () => {
    if (!confirm('Are you sure you want to remove your ElevenLabs API key? This will disable audio transcription features.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/elevenlabs-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: '' }),
      });

      if (response.ok) {
        setHasApiKey(false);
        setIsEditing(false);
        setElevenlabsApiKey('');
        setMessage({ type: 'success', text: 'API key removed successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to remove API key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove API key' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    router.push('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="Profile Settings" showBackButton={true} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Account Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <div className="mt-1 text-gray-900 dark:text-white font-medium">
                {session.user?.name || session.user?.email || 'Unknown User'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Member Since
              </label>
              <div className="mt-1 text-gray-600 dark:text-gray-400">
                {new Date().toLocaleDateString()} {/* In a real app, this would come from user data */}
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* API Keys Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            API Key Management
          </h2>

          {/* ElevenLabs API Key */}
          <div className="space-y-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <span className="mr-2">🎙️</span>
                    ElevenLabs API Key
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Required for speech-to-text transcription using ElevenLabs Scribe
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {hasApiKey && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Configured
                    </span>
                  )}
                  {!hasApiKey && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⚠ Not Set
                    </span>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {hasApiKey ? (
                      <div className="flex items-center space-x-2">
                        <span>API key is configured and ready to use</span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          ••••••••••••••••
                        </span>
                      </div>
                    ) : (
                      'No API key configured. Add your ElevenLabs API key to enable transcription features.'
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {hasApiKey ? 'Update API Key' : 'Add API Key'}
                    </button>
                    {hasApiKey && (
                      <button
                        onClick={removeApiKey}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Remove API Key
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ElevenLabs API Key
                    </label>
                    <input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your ElevenLabs API key"
                      value={elevenlabsApiKey}
                      onChange={(e) => setElevenlabsApiKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      You can find your API key in your{' '}
                      <a 
                        href="https://elevenlabs.io/app/speech-synthesis" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        ElevenLabs dashboard
                      </a>
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={saveApiKey}
                      disabled={loading || !elevenlabsApiKey.trim()}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {loading ? 'Saving...' : 'Save API Key'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setElevenlabsApiKey('');
                        setMessage(null);
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Future API Keys Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 opacity-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <span className="mr-2">🔮</span>
                    Additional Integrations
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Support for more AI services coming soon
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Coming Soon
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Future integrations may include OpenAI Whisper, Azure Speech Services, and more.
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
            Need Help?
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              <strong>Getting your ElevenLabs API key:</strong> Visit your{' '}
              <a 
                href="https://elevenlabs.io/app/speech-synthesis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                ElevenLabs dashboard
              </a>{' '}
              and look for "API Key" in the profile settings.
            </p>
            <p>
              <strong>Security:</strong> Your API keys are encrypted and stored securely. Only you can access them.
            </p>
            <p>
              <strong>Usage:</strong> API keys are only used for transcribing your uploaded audio files using ElevenLabs Scribe.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}