'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="Search Audio Transcripts" showBackButton={true} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in audio transcripts..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || query.length < 2}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              {loading ? '🔍 Searching...' : '🔍 Search'}
            </button>
          </div>
          
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </form>

        {/* Search Results */}
        {searchResults && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Search Results for &ldquo;{searchResults.query}&rdquo;
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Found {searchResults.results.length} files with {searchResults.results.reduce((total, result) => total + result.matches.length, 0)} total matches
              </p>
            </div>

            {searchResults.results.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-gray-500">
                  Try different keywords or check your spelling
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {searchResults.results.map((result) => (
                  <div key={result.fileId} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {result.originalName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                              {(result.relevanceScore * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''} found
                        </p>
                        <div className="flex gap-2 text-xs">
                          {Array.from(new Set(result.matches.map(m => m.matchType))).map(type => (
                            <span key={type} className={`px-2 py-1 rounded-full text-xs font-medium ${
                              type === 'exact' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' :
                              type === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                              type === 'filename' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200' :
                              'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
                            }`}>
                              {type} match
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/files?highlight=${result.fileId}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline whitespace-nowrap ml-4"
                      >
                        View Full Transcript
                      </button>
                    </div>

                    <div className="space-y-3">
                      {result.matches.slice(0, 5).map((match, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                          {/* Header with timestamp and match info */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              {match.startTime > 0 || match.endTime > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-lg">
                                    🕒 {formatTime(match.startTime)}
                                    {match.endTime !== match.startTime && match.endTime > 0 && ` - ${formatTime(match.endTime)}`}
                                  </span>
                                  <button
                                    onClick={() => {
                                      // TODO: Implement audio player with jump-to-time
                                      console.log(`Jump to ${formatTime(match.startTime)} in ${result.originalName}`);
                                    }}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                                  >
                                    🎵 Play
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                  No timestamp available
                                </span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                match.matchType === 'exact' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200' :
                                match.matchType === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200' :
                                match.matchType === 'filename' ? 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-200'
                              }`}>
                                {match.matchType}
                              </span>
                              <span className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                {(match.score * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              Match #{index + 1}
                            </span>
                          </div>

                          {/* Match statement */}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Found &ldquo;{highlightMatch(match.text, searchResults.query)}&rdquo; in 
                              <span className="text-blue-600 font-semibold ml-1">{result.originalName}</span>
                              {match.startTime > 0 && (
                                <span className="text-gray-600 dark:text-gray-300 ml-1">
                                  at {formatTime(match.startTime)}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Context */}
                          {(match.contextBefore || match.contextAfter) && (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {match.contextBefore && (
                                  <span className="text-gray-500 mr-1">{match.contextBefore}</span>
                                )}
                                <span className="font-bold bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded">
                                  {highlightMatch(match.text, searchResults.query)}
                                </span>
                                {match.contextAfter && (
                                  <span className="text-gray-500 ml-1">{match.contextAfter}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {result.matches.length > 5 && (
                        <div className="text-center py-2">
                          <button
                            onClick={() => router.push(`/files?highlight=${result.fileId}&query=${encodeURIComponent(searchResults.query)}`)}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            View {result.matches.length - 5} more matches in full transcript
                          </button>
                        </div>
                      )}
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
            <h3 className="text-lg font-medium mb-4">Enhanced Search Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  🎯 <span>Smart Matching</span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Finds exact words, partial matches, and similar terms. Results are scored by relevance.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  ⏰ <span>Precise Timestamps</span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  See exactly when words were spoken with second-level precision and context.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  📄 <span>Multiple Results</span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  View all occurrences of your search term across all files with context preview.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  🔍 <span>Comprehensive Search</span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Search by filename or content - we&apos;ll find matches in both with confidence scores.
                </p>
              </div>
            </div>
            <div className="mt-6 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">💡 Search Tips</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Use specific words for the most accurate timestamps</li>
                <li>• Partial words will show fuzzy matches with confidence scores</li>
                <li>• Results are sorted by relevance and match quality</li>
                <li>• Click timestamps to jump to exact moments (when available)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}