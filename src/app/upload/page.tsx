'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

interface UploadedFile {
  file: File;
  id?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  transcription?: string;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Poll for processing status updates
  useEffect(() => {
    const processingFiles = files.filter(f => f.status === 'processing' && f.id);
    
    if (processingFiles.length === 0) return;

    const pollInterval = setInterval(async () => {
      try {
        for (const file of processingFiles) {
          const response = await fetch(`/api/files/status?id=${file.id}`);
          if (response.ok) {
            const { status: newStatus, transcription } = await response.json();
            
            setFiles(prev => prev.map(f => 
              f.id === file.id 
                ? { 
                    ...f, 
                    status: newStatus,
                    progress: newStatus === 'completed' ? 100 : f.progress,
                    transcription: transcription || f.transcription
                  }
                : f
            ));
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [files]);

  const addFiles = (newFiles: File[]) => {
    console.log('📂 Adding files:', {
      totalFiles: newFiles.length,
      fileDetails: newFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      }))
    });
    
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    console.log('🎵 Audio files filtered:', {
      audioCount: audioFiles.length,
      audioFiles: audioFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    
    const uploadFiles: UploadedFile[] = audioFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));
    
    console.log('✅ Files added to state');
    setFiles(prev => [...prev, ...uploadFiles]);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const uploadFile = async (fileIndex: number) => {
    console.log('🚀 Starting upload for fileIndex:', fileIndex);
    const fileToUpload = files[fileIndex];
    if (!fileToUpload) {
      console.error('❌ No file found at index:', fileIndex);
      return;
    }

    console.log('📁 File to upload:', {
      name: fileToUpload.file.name,
      size: fileToUpload.file.size,
      type: fileToUpload.file.type,
      lastModified: fileToUpload.file.lastModified,
      constructor: fileToUpload.file.constructor.name
    });

    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex && f.status === 'uploading' 
          ? { ...f, progress: Math.min(f.progress + 10, 90) } 
          : f
      ));
    }, 200);

    try {
      console.log('📦 Creating FormData...');
      const formData = new FormData();
      formData.append('audio', fileToUpload.file);
      
      console.log('📦 FormData created:', {
        hasAudio: formData.has('audio'),
        audioValue: formData.get('audio'),
        audioFile: formData.get('audio') instanceof File,
        audioFileSize: (formData.get('audio') as File)?.size
      });

      console.log('🌐 Sending fetch request...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📤 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📄 Response data:', result);

      clearInterval(progressInterval);

      if (response.ok) {
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex ? { 
            ...f, 
            status: 'processing', 
            progress: 70, // Upload complete, now processing
            id: result.fileId 
          } : f
        ));
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.status === 'pending');

    for (const { index } of pendingFiles) {
      await uploadFile(index);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'uploading': return 'text-blue-500';
      case 'processing': return 'text-yellow-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: UploadedFile['status'], progress: number) => {
    switch (status) {
      case 'pending': return 'Ready to upload';
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing with ElevenLabs Scribe...';
      case 'completed': return 'Transcription completed ✅';
      case 'failed': return 'Failed ❌';
      default: return 'Unknown';
    }
  };

  const getProgressColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading': return 'bg-blue-600';
      case 'processing': return 'bg-yellow-500';
      case 'completed': return 'bg-green-600';
      case 'failed': return 'bg-red-600';
      default: return 'bg-gray-400';
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
      <Header title="Upload Audio Files" showBackButton={true} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-300">
            Upload your audio files to transcribe them using ElevenLabs Scribe
          </p>
        </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-4xl">🎵</div>
          <div>
            <h3 className="text-lg font-medium">Drop audio files here</h3>
            <p className="text-gray-500">or click to select files</p>
          </div>
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
          >
            Select Files
          </label>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Files ({files.length})</h2>
            <button
              onClick={uploadAllFiles}
              disabled={!files.some(f => f.status === 'pending')}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Upload All
            </button>
          </div>

          <div className="space-y-3">
            {files.map((file, index) => (
              <div key={index} className="border rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.file.name}</div>
                    <div className="text-sm text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                      {getStatusText(file.status, file.progress)}
                      {file.error && ` - ${file.error}`}
                    </div>
                    {file.status === 'processing' && (
                      <div className="text-xs text-gray-400 mt-1">
                        This may take 1-2 minutes depending on file length
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {file.status === 'pending' && (
                      <button
                        onClick={() => uploadFile(index)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Upload
                      </button>
                    )}
                    
                    {(file.status === 'uploading' || file.status === 'processing') && (
                      <div className="w-32">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{file.status === 'uploading' ? 'Uploading' : 'Processing'}</span>
                          <span>{file.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(file.status)}`}
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {file.status === 'completed' && (
                      <div className="flex items-center space-x-2">
                        <div className="text-green-600 font-medium text-sm">✅ Complete</div>
                        <button
                          onClick={() => router.push('/files')}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          View Result
                        </button>
                      </div>
                    )}

                    {file.status === 'failed' && (
                      <div className="text-red-600 font-medium text-sm">❌ Failed</div>
                    )}

                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                {/* Transcription Preview for Completed Files */}
                {file.status === 'completed' && file.transcription && (
                  <div className="mx-4 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Transcription Preview:</h4>
                    <p className="text-sm text-green-700 leading-relaxed">
                      {file.transcription.length > 200 
                        ? file.transcription.substring(0, 200) + '...' 
                        : file.transcription
                      }
                    </p>
                    {file.transcription.length > 200 && (
                      <button
                        onClick={() => router.push('/files')}
                        className="text-green-600 hover:text-green-800 text-sm underline mt-2 block"
                      >
                        View Full Transcription
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => router.push('/files')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          View My Files
        </button>
      </div>
      </div>
    </div>
  );
}