"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Audio Text Search
        </h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          {isSignUp ? "Create Your Account" : "Welcome Back"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {isSignUp 
            ? "Sign up to start transcribing your audio files" 
            : "Sign in to access your audio files and transcriptions"
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {isSignUp && (
            <p className="text-xs text-gray-500 mt-1">
              Choose a unique username for your account
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {isSignUp && (
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters long
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !username.trim() || password.length < 6}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isSignUp ? "Creating Account..." : "Signing In..."}
            </span>
          ) : (
            isSignUp ? "Create Account" : "Sign In"
          )}
        </button>
      </form>

      {/* Toggle between Sign In and Sign Up */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-3">
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
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
          >
            {isSignUp ? "Sign In to Existing Account" : "Create Free Account"}
          </button>
          {!isSignUp && (
            <p className="text-xs text-gray-500 mt-2">
              Get started in seconds - no email required
            </p>
          )}
        </div>
      </div>

      {/* Features Preview for Sign Up */}
      {isSignUp && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            What you'll get:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Upload and transcribe audio files
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Search through transcriptions
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Secure file storage
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              ElevenLabs integration
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
