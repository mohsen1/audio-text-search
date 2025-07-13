'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Key, Settings, Shield, CheckCircle, AlertCircle, Eye, EyeOff, ExternalLink, HelpCircle, Save, X } from 'lucide-react';
import Header from '@/components/header';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
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
      console.error("Error saving API key:", error);
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
      console.error("Error removing API key:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header title="Profile Settings" showBackButton={true} />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Settings className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Profile Settings
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your account and API configurations
          </p>
        </div>

        {/* User Info Section */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8 border border-white/20 dark:border-gray-700/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <User className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Account Information
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Username
              </label>
              <div className="text-lg text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-lg">
                {session.user?.name || session.user?.email || 'Unknown User'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Member Since
              </label>
              <div className="text-lg text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-lg">
                {new Date().toLocaleDateString()} {/* In a real app, this would come from user data */}
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            {message.text}
          </div>
        )}

        {/* API Keys Section */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/20 dark:border-gray-700/50">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Key className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              API Key Management
            </h2>
          </div>

          {/* ElevenLabs API Key */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                    <Key className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      ElevenLabs API Key
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Required for speech-to-text transcription using ElevenLabs Scribe
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {hasApiKey ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Not Set
                    </span>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <div className="space-y-6">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {hasApiKey ? (
                      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center space-x-3">
                          <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="text-green-800 dark:text-green-300 font-medium">
                            API key is configured and ready to use
                          </span>
                        </div>
                        <span className="font-mono text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded border">
                          ••••••••••••••••
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-yellow-800 dark:text-yellow-300">
                          No API key configured. Add your ElevenLabs API key to enable transcription features.
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
                    >
                      <Settings className="h-4 w-4" />
                      {hasApiKey ? 'Update API Key' : 'Add API Key'}
                    </button>
                    {hasApiKey && (
                      <button
                        onClick={removeApiKey}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center gap-2 shadow-lg"
                      >
                        <X className="h-4 w-4" />
                        Remove API Key
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      ElevenLabs API Key
                    </label>
                    <div className="relative">
                      <input
                        id="apiKey"
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your ElevenLabs API key"
                        value={elevenlabsApiKey}
                        onChange={(e) => setElevenlabsApiKey(e.target.value)}
                        className="w-full pl-4 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 text-lg transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <HelpCircle className="h-4 w-4" />
                        You can find your API key in your{' '}
                        <a 
                          href="https://elevenlabs.io/app/speech-synthesis" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          ElevenLabs dashboard
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={saveApiKey}
                      disabled={loading || !elevenlabsApiKey.trim()}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center gap-2 shadow-lg"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save API Key
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setElevenlabsApiKey('');
                        setMessage(null);
                      }}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
              Need Help?
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 text-sm text-blue-800 dark:text-blue-200">
            <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Getting your ElevenLabs API key
              </h4>
              <p>
                Visit your{' '}
                <a 
                  href="https://elevenlabs.io/app/speech-synthesis" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline inline-flex items-center gap-1"
                >
                  ElevenLabs dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>{' '}
                and look for &quot;API Key&quot; in the profile settings.
              </p>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </h4>
              <p>
                Your API keys are encrypted and stored securely. Only you can access them and they&apos;re never shared with third parties.
              </p>
            </div>
            
            <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Usage
              </h4>
              <p>
                API keys are only used for transcribing your uploaded audio files using ElevenLabs Scribe technology.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}