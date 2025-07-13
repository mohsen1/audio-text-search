"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mic, FileText, Search, LogIn, AudioWaveform, Sparkles, Clock, Shield } from "lucide-react";
import Header from "@/components/header";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <AudioWaveform className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Audio Text Search
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Transform your audio files into searchable transcriptions with AI-powered accuracy. 
                Upload, transcribe, and find exactly what you&apos;re looking for.
              </p>
              <button
                onClick={() => router.push('/signin')}
                className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <LogIn size={24} />
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Powerful Features
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Everything you need to manage your audio content
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  AI-Powered Transcription
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Leverage ElevenLabs Scribe for highly accurate speech-to-text conversion
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <Search className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Smart Search
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Find specific moments in your audio with powerful full-text search
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                    <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Fast Processing
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Quick turnaround times with real-time progress tracking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Shield className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Secure & Private
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Your audio files are processed securely and remain private. 
              Start transcribing your content today.
            </p>
            <button
              onClick={() => router.push('/signin')}
              className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              <LogIn size={20} />
              Sign In to Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <AudioWaveform className="h-16 w-16 text-white" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Welcome Back!
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Ready to transcribe, organize, and search through your audio content with AI-powered precision.
          </p>
        </div>
        
        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div 
            onClick={() => router.push('/upload')}
            className="group cursor-pointer bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-gray-700/50"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Mic className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Transcribe Audio
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              Upload your audio files and get highly accurate AI-powered transcriptions in minutes.
            </p>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg font-medium">
                Start Transcribing
                <Mic size={16} />
              </span>
            </div>
          </div>

          <div 
            onClick={() => router.push('/files')}
            className="group cursor-pointer bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-gray-700/50"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Manage Files
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              Browse, organize, and manage all your transcribed audio files in one place.
            </p>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg font-medium">
                View Files
                <FileText size={16} />
              </span>
            </div>
          </div>

          <div 
            onClick={() => router.push('/search')}
            className="group cursor-pointer bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-gray-700/50"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Search className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Search Content
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              Find specific words, phrases, or topics across all your transcribed audio content.
            </p>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg font-medium">
                Search Now
                <Search size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/20 dark:border-gray-700/50">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Powered by Advanced AI
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Experience the future of audio content management
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">AI Transcription</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">ElevenLabs Scribe technology</p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Quick processing & results</p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-rose-400 to-rose-500 rounded-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Your data stays protected</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
