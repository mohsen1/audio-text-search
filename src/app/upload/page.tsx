'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, XCircle, FileText, Eye, Mic } from 'lucide-react';
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

  const uploadFileServerSide = async (fileIndex: number) => {
    console.log('🔄 Falling back to server-side upload for fileIndex:', fileIndex);
    const fileToUpload = files[fileIndex];
    if (!fileToUpload) {
      console.error('❌ No file found at index:', fileIndex);
      return;
    }

    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    // Progress simulation for server-side upload
    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex && f.status === 'uploading' 
          ? { ...f, progress: Math.min(f.progress + 10, 90) } 
          : f
      ));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('audio', fileToUpload.file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      clearInterval(progressInterval);

      if (response.ok) {
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex ? { 
            ...f, 
            status: 'processing', 
            progress: 70,
            id: result.fileId 
          } : f
        ));
      } else {
        throw new Error(result.error || 'Server-side upload failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Server-side upload failed'
        } : f
      ));
    }
  };

  const uploadFileClientSide = async (fileIndex: number) => {
    console.log('🚀 Starting client-side transcription for fileIndex:', fileIndex);
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

    try {
      // Step 1: Get ElevenLabs API key
      console.log('🔑 Fetching ElevenLabs API key...');
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 10 } : f
      ));

      const apiKeyResponse = await fetch('/api/user/elevenlabs-key?forUpload=true');
      if (!apiKeyResponse.ok) {
        throw new Error('Failed to get API key');
      }
      
      const { apiKey } = await apiKeyResponse.json();
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured. Please add your API key in settings.');
      }

      // Step 2: Send file directly to ElevenLabs
      console.log('🎵 Sending file to ElevenLabs for transcription...');
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 30 } : f
      ));

      const formData = new FormData();
      formData.append('model_id', 'scribe_v1');
      formData.append('file', fileToUpload.file);
      formData.append('timestamps_granularity', 'word');
      formData.append('output_format', 'verbose_json');

      const transcriptionResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        throw new Error(`ElevenLabs API error: ${transcriptionResponse.status} - ${errorText}`);
      }

      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 70 } : f
      ));

      const transcriptionResult = await transcriptionResponse.json();
      console.log('📝 Transcription received from ElevenLabs');

      // Step 3: Send transcription results to our backend
      console.log('💾 Storing transcription results...');
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'processing', progress: 80 } : f
      ));

      const storeResponse = await fetch('/api/upload/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileToUpload.file.name,
          fileSize: fileToUpload.file.size,
          mimeType: fileToUpload.file.type,
          transcriptionResult,
        }),
      });

      if (!storeResponse.ok) {
        const errorData = await storeResponse.json();
        throw new Error(errorData.error || 'Failed to store transcription');
      }

      const result = await storeResponse.json();
      console.log('✅ Transcription stored successfully');

      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: 'completed', 
          progress: 100,
          id: result.fileId 
        } : f
      ));

    } catch (error) {
      console.error('❌ Transcription failed:', error);
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { 
          ...f, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Transcription failed'
        } : f
      ));
    }
  };

  const uploadFile = async (fileIndex: number) => {
    const fileToUpload = files[fileIndex];
    if (!fileToUpload) {
      return;
    }

    // For files over 4MB, use client-side processing to avoid Vercel limits
    // For smaller files, try client-side first, then fallback to server-side if needed
    const useClientSide = fileToUpload.file.size > 4 * 1024 * 1024; // 4MB threshold

    console.log(`🚀 Starting ${useClientSide ? 'client-side' : 'client-side (with server fallback)'} transcription for fileIndex:`, fileIndex);
    console.log('📁 File to upload:', {
      name: fileToUpload.file.name,
      size: fileToUpload.file.size,
      type: fileToUpload.file.type,
    });

    try {
      // Always try client-side first
      await uploadFileClientSide(fileIndex);
    } catch (error) {
      console.warn('❌ Client-side transcription failed:', error);
      
      // Only fallback to server-side for smaller files
      if (!useClientSide) {
        console.log('🔄 Attempting server-side fallback...');
        try {
          await uploadFileServerSide(fileIndex);
        } catch (serverError) {
          console.error('❌ Server-side fallback also failed:', serverError);
          setFiles(prev => prev.map((f, i) => 
            i === fileIndex ? { 
              ...f, 
              status: 'failed', 
              error: `Both client-side and server-side processing failed. ${error instanceof Error ? error.message : 'Unknown error'}`
            } : f
          ));
        }
      } else {
        // For large files, don't attempt server-side (would fail due to size limits)
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex ? { 
            ...f, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Client-side transcription failed'
          } : f
        ));
      }
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
      case 'pending': return 'Ready to transcribe';
      case 'uploading': 
        if (progress < 20) return 'Getting API key...';
        if (progress < 70) return 'Transcribing with ElevenLabs...';
        return 'Storing results...';
      case 'processing': return 'Finalizing transcription...';
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
      <Header title="Transcribe Audio Files" showBackButton={true} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <p className="text-gray-600 dark:text-gray-300">
            Transcribe your audio files using ElevenLabs Scribe. Files are processed directly in your browser for faster uploads and support for large files.
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
          <div className="text-4xl text-blue-500">
            <Mic className="mx-auto" size={48} />
          </div>
          <div>
            <h3 className="text-lg font-medium">Drop audio files to transcribe</h3>
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
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
          >
            <FileText size={16} />
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
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Upload size={16} />
              Transcribe All
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
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                      >
                        <Upload size={14} />
                        Transcribe
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
                        <div className="text-green-600 font-medium text-sm flex items-center gap-1">
                          <CheckCircle size={16} />
                          Complete
                        </div>
                        <button
                          onClick={() => router.push('/files')}
                          className="text-blue-600 hover:text-blue-800 text-sm underline flex items-center gap-1"
                        >
                          <Eye size={14} />
                          View Result
                        </button>
                      </div>
                    )}

                    {file.status === 'failed' && (
                      <div className="text-red-600 font-medium text-sm flex items-center gap-1">
                        <XCircle size={16} />
                        Failed
                      </div>
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