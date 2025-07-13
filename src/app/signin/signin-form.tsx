"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AudioWaveform, User, Lock, Eye, EyeOff, Mail, CheckCircle, ArrowRight } from "lucide-react";

export default function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (isSignUp) {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          const result = await signIn("credentials", {
            username,
            password,
            redirect: false,
          });

          if (result?.ok) {
            router.push("/");
          } else {
            setError("Failed to sign in after registration");
          }
        } else {
          const data = await response.json();
          setError(data.error || "Registration failed");
        }
      } catch (err) {
        console.error("Registration error:", err);
        setError("Registration failed");
      }
    } else {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/");
      } else {
        console.error("Signin failed:", result?.error);
        setError(result?.error || "Invalid username or password");
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-md w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <AudioWaveform className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Audio Text Search
        </h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {isSignUp ? "Create Your Account" : "Welcome Back"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {isSignUp 
            ? "Join thousands transforming audio into searchable content" 
            : "Sign in to access your audio transcriptions and search"
          }
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 dark:border-gray-700/50">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 transition-all"
              />
            </div>
            {isSignUp && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Choose a unique username for your account
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {isSignUp && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Must be at least 6 characters long
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !username.trim() || password.length < 6}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isSignUp ? "Creating Account..." : "Signing In..."}
              </>
            ) : (
              <>
                {isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">or</span>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isSignUp ? "Already have an account?" : "New to Audio Text Search?"}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setUsername("");
                setPassword("");
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-all border border-gray-300 dark:border-gray-600"
            >
              {isSignUp ? "Sign In to Existing Account" : "Create Free Account"}
            </button>
            {!isSignUp && (
              <p className="text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" />
                Get started in seconds - no email required
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Features Preview for Sign Up */}
      {isSignUp && (
        <div className="mt-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            What you&apos;ll get:
          </h3>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Upload and transcribe audio files with AI
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Search through transcriptions instantly
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Secure and private file storage
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              ElevenLabs Scribe integration
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
