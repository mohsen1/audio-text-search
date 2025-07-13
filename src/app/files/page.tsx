'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Dashboard
            </button>
            <h1 className="text-3xl font-bold">My Audio Files</h1>
          </div>
          <button
            onClick={() => router.push('/upload')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Upload New Files
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search files and transcriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Files List */}
      {loading ? (
        <div className="text-center py-8">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎵</div>
          <h3 className="text-lg font-medium mb-2">No audio files found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Upload your first audio file to get started'
            }
          </p>
          <button
            onClick={() => router.push('/upload')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Upload Files
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((file) => (
            <div key={file.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg truncate">{file.originalName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>{file.mimeType}</span>
                    <span>Uploaded {formatDate(file.uploadedAt)}</span>
                    {file.processedAt && (
                      <span>Processed {formatDate(file.processedAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={getStatusBadge(file.status)}>
                    {file.status}
                  </span>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete file"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Transcription */}
              {file.status === 'completed' && file.transcription ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-sm text-gray-700">Transcription:</h4>
                  <p className="text-gray-800 leading-relaxed">{file.transcription}</p>
                </div>
              ) : file.status === 'processing' ? (
                <div className="bg-yellow-50 rounded-lg p-4 text-yellow-800">
                  Processing with ElevenLabs...
                </div>
              ) : file.status === 'failed' ? (
                <div className="bg-red-50 rounded-lg p-4 text-red-800">
                  Failed to process this file. Please try uploading again.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="px-4 py-2">
            Page {pagination.page} of {pagination.pages}
          </span>
          
          <button
            onClick={() => setPage(Math.min(pagination.pages, page + 1))}
            disabled={page === pagination.pages}
            className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <div className="text-center mt-8 text-sm text-gray-500">
          Showing {files.length} of {pagination.total} files
        </div>
      )}
    </div>
  );
}