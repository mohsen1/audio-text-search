'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Search, Filter, Trash2, Calendar, HardDrive, Eye, ChevronLeft, ChevronRight, Download, AudioWaveform } from 'lucide-react';
import Header from '@/components/header';

interface AudioFile {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  transcription: string | null;
  uploadedAt: string;
  processedAt: string | null;
  status: 'processing' | 'completed' | 'failed';
}

interface FilesResponse {
  files: AudioFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function FilesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/files?${params}`);
      if (response.ok) {
        const data: FilesResponse = await response.json();
        setFiles(data.files);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/files?id=${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchFiles(); // Refresh the list
      } else {
        console.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'processing':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    router.push('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header title="My Audio Files" showBackButton={true} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
              <AudioWaveform className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
            Your Audio Library
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage and explore your transcribed audio files
          </p>
        </div>

        {/* Top Actions */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.total} files in your library
            </div>
            <button
              onClick={() => router.push('/upload')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 font-semibold shadow-lg"
            >
              <Upload size={18} />
              Upload New Files
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search files and transcriptions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-400 transition-all"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-12 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white appearance-none bg-white min-w-[160px]"
                >
                  <option value="all">All Status</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Files List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg text-gray-600 dark:text-gray-300">Loading files...</span>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-12 shadow-lg border border-white/20 dark:border-gray-700/50 max-w-md mx-auto">
              <div className="mb-6">
                <div className="p-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl mx-auto w-fit">
                  <AudioWaveform className="h-12 w-12 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No audio files found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {search || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Upload your first audio file to get started with AI transcription'
                }
              </p>
              <button
                onClick={() => router.push('/upload')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 font-semibold shadow-lg mx-auto"
              >
                <Upload size={18} />
                Upload Files
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {files.map((file) => (
              <div key={file.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 dark:border-gray-700/50 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          file.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                          file.status === 'processing' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          file.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <FileText className={`h-5 w-5 ${
                            file.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                            file.status === 'processing' ? 'text-yellow-600 dark:text-yellow-400' :
                            file.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">{file.originalName}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-4 w-4" />
                              {formatFileSize(file.fileSize)}
                            </span>
                            <span>{file.mimeType}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(file.uploadedAt)}
                            </span>
                            {file.processedAt && (
                              <span>Processed {formatDate(file.processedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={getStatusBadge(file.status)}>
                        {file.status}
                      </span>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Delete file"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Transcription */}
                  {file.status === 'completed' && file.transcription ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-green-800 dark:text-green-400 flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Transcription
                        </h4>
                        <button className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-all">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-green-700 dark:text-green-300 leading-relaxed">{file.transcription}</p>
                    </div>
                  ) : file.status === 'processing' ? (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-yellow-800 dark:text-yellow-400">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-yellow-600 dark:border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        Processing with ElevenLabs AI...
                      </div>
                    </div>
                  ) : file.status === 'failed' ? (
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-800 dark:text-red-400">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Failed to process this file. Please try uploading again.
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-12">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 font-medium"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter(pageNum => 
                      pageNum === 1 || 
                      pageNum === pagination.pages || 
                      Math.abs(pageNum - page) <= 1
                    )
                    .map((pageNum, index, array) => (
                      <div key={pageNum} className="flex items-center gap-2">
                        {index > 0 && array[index - 1] !== pageNum - 1 && (
                          <span className="text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            pageNum === page
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      </div>
                    ))}
                </div>
                
                <button
                  onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 font-medium"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {!loading && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              <Eye size={16} />
              Showing {files.length} of {pagination.total} files
            </div>
          </div>
        )}
      </div>
    </div>
  );
}