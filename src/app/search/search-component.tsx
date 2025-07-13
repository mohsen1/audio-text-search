'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Clock, FileText, Target, Zap, BookOpen, Lightbulb, CheckCircle, ArrowRight, Eye } from 'lucide-react';
import Header from '@/components/header';

interface SearchMatch {
  text: string;
  startTime: number;
  endTime: number;
  contextBefore: string;
  contextAfter: string;
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'filename';
}

interface SearchResult {
  fileId: string;
  fileName: string;
  originalName: string;
  matches: SearchMatch[];
  relevanceScore: number;
}

interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  query: string;
}

export default function SearchComponent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data: SearchResponse = await response.json();
      setSearchResults(data);
      
      // Update URL without triggering navigation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('q', searchQuery);
      window.history.replaceState({}, '', newUrl.toString());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : (
        part
      )
    );
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    router.push('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header title="Search Audio Transcripts" showBackButton={true} />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
              <Search className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            AI-Powered Audio Search
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Search through your transcribed audio content with precision timing and intelligent matching
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-12">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 dark:border-gray-700/50">
            <form onSubmit={handleSearch}>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search in audio transcripts... (e.g., &quot;machine learning&quot;, &quot;quarterly results&quot;)"
                    className="w-full pl-14 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 text-lg transition-all"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || query.length < 2}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-8 py-4 rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 font-semibold shadow-lg flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Search
                    </>
                  )}
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div>
            <div className="mb-8">
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  Search Results for &ldquo;{searchResults.query}&rdquo;
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Found {searchResults.results.length} files with {searchResults.results.reduce((total, result) => total + result.matches.length, 0)} total matches
                </p>
              </div>
            </div>

            {searchResults.results.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-12 shadow-lg border border-white/20 dark:border-gray-700/50 max-w-md mx-auto">
                  <div className="mb-6">
                    <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl mx-auto w-fit">
                      <Search className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No results found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try different keywords or check your spelling. Our AI searches across all transcribed content.
                  </p>
                  <button
                    onClick={() => setQuery('')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 font-semibold shadow-lg mx-auto"
                  >
                    Try New Search
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {searchResults.results.map((result) => (
                  <div key={result.fileId} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50 overflow-hidden">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                              <FileText className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {result.originalName}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''} found
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {(result.relevanceScore * 100).toFixed(0)}% match
                            </span>
                            {Array.from(new Set(result.matches.map(m => m.matchType))).map(type => (
                              <span key={type} className={`px-3 py-1 rounded-full text-sm font-medium ${
                                type === 'exact' ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400' :
                                type === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400' :
                                type === 'filename' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-400' :
                                'bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-400'
                              }`}>
                                {type} match
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/files?highlight=${result.fileId}`)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all whitespace-nowrap ml-4"
                        >
                          <Eye size={16} />
                          View Full Transcript
                        </button>
                      </div>

                      <div className="space-y-4">
                        {result.matches.slice(0, 5).map((match, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
                            {/* Header with timestamp and match info */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3 flex-wrap">
                                {match.startTime > 0 || match.endTime > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg flex items-center gap-1 font-semibold">
                                      <Clock size={14} />
                                      {formatTime(match.startTime)}
                                      {match.endTime !== match.startTime && match.endTime > 0 && ` - ${formatTime(match.endTime)}`}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-2 rounded-lg">
                                    No timestamp available
                                  </span>
                                )}
                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                  match.matchType === 'exact' ? 'bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400' :
                                  match.matchType === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-400' :
                                  match.matchType === 'filename' ? 'bg-purple-100 text-purple-700 dark:bg-purple-800/30 dark:text-purple-400' :
                                  'bg-orange-100 text-orange-700 dark:bg-orange-800/30 dark:text-orange-400'
                                }`}>
                                  {match.matchType}
                                </span>
                                <span className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
                                  {(match.score * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                                #{index + 1}
                              </span>
                            </div>

                            {/* Match statement */}
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Found &ldquo;{highlightMatch(match.text, searchResults.query)}&rdquo; in 
                                <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">{result.originalName}</span>
                                {match.startTime > 0 && (
                                  <span className="text-gray-600 dark:text-gray-400 ml-1">
                                    at {formatTime(match.startTime)}
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Context */}
                            {(match.contextBefore || match.contextAfter) && (
                              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {match.contextBefore && (
                                    <span className="text-gray-500 dark:text-gray-400 mr-1">{match.contextBefore}</span>
                                  )}
                                  <span className="font-bold bg-gradient-to-r from-yellow-200 to-yellow-300 dark:from-yellow-800 dark:to-yellow-700 px-2 py-1 rounded text-gray-900 dark:text-yellow-100">
                                    {highlightMatch(match.text, searchResults.query)}
                                  </span>
                                  {match.contextAfter && (
                                    <span className="text-gray-500 dark:text-gray-400 ml-1">{match.contextAfter}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {result.matches.length > 5 && (
                          <div className="text-center py-4">
                            <button
                              onClick={() => router.push(`/files?highlight=${result.fileId}&query=${encodeURIComponent(searchResults.query)}`)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-2 mx-auto bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                            >
                              View {result.matches.length - 5} more matches in full transcript
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Search Tips */}
        {!searchResults && !loading && (
          <div className="mt-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Powerful Search Features
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Discover how our AI-powered search can help you find exactly what you&apos;re looking for
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Smart Matching</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Finds exact words, partial matches, and similar terms. Results are scored by relevance and confidence.
                </p>
              </div>
              
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Precise Timestamps</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  See exactly when words were spoken with second-level precision and surrounding context.
                </p>
              </div>
              
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Multiple Results</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  View all occurrences of your search term across all files with contextual previews.
                </p>
              </div>
              
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Comprehensive Search</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Search by filename or content - we&apos;ll find matches in both with confidence scores.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">💡 Pro Search Tips</h4>
              </div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 grid md:grid-cols-2 gap-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  Use specific words for the most accurate timestamps
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  Partial words will show fuzzy matches with confidence scores
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  Results are sorted by relevance and match quality
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  Click timestamps to jump to exact moments (when available)
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}