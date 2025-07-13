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
                Upload, transcribe, and find exactly what you're looking for.
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      {/* Main Content - Mostly Empty */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Audio Text Search
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Transcribe audio files and search through their content
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push('/upload')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Mic size={20} />
              Transcribe Files
            </button>
            <button
              onClick={() => router.push('/files')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FileText size={20} />
              View Files
            </button>
            <button
              onClick={() => router.push('/search')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Search size={20} />
              Search Audio
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
