'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, XCircle, FileText, Eye, Mic, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import Header from '@/components/header';

interface UploadedFile {
  file: File;
  id?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  transcription?: string;
  estimatedDurationMs?: number;
  startTime?: number;
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

  // Function to get audio duration from file
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not load audio metadata'));
      });
      
      audio.src = url;
    });
  };

  const addFiles = async (newFiles: File[]) => {
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
    
    // Get audio duration for each file and calculate transcription time
    const uploadFiles: UploadedFile[] = [];
    
    for (const file of audioFiles) {
      try {
        console.log(`🔍 Getting duration for ${file.name}...`);
        const audioDuration = await getAudioDuration(file);
        // ElevenLabs Scribe is very fast: 50-70x real-time, let's use 60x
        const transcriptionTimeMs = (audioDuration / 60) * 1000;
        
        console.log(`⏱️ Audio duration: ${audioDuration}s, estimated transcription: ${transcriptionTimeMs}ms`);
        
        uploadFiles.push({
          file,
          status: 'pending',
          progress: 0,
          estimatedDurationMs: Math.max(transcriptionTimeMs, 2000) // Minimum 2 seconds
        });
      } catch  {

        console.warn(`⚠️ Could not get duration for ${file.name}, using fallback estimation`);
        // Fallback to file size estimation if duration detection fails
        const sizeMB = file.size / (1024 * 1024);
        const fallbackTime = Math.max(sizeMB * 1000, 5000); // ~1 second per MB, minimum 5 seconds
        
        uploadFiles.push({
          file,
          status: 'pending',
          progress: 0,
          estimatedDurationMs: fallbackTime
        });
      }
    }
    
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await addFiles(droppedFiles);
  }, []);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      await addFiles(selectedFiles);
    }
  };

  const uploadFileServerSide = async (fileIndex: number) => {
    console.log('🔄 Falling back to server-side upload for fileIndex:', fileIndex);
    const fileToUpload = files[fileIndex];
    if (!fileToUpload) {
      console.error('❌ No file found at index:', fileIndex);
      return;
    }

    const estimatedDuration = fileToUpload.estimatedDurationMs || 5000; // Default 5 seconds

    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      // Step 1: Initial setup
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 5 } : f
      ));

      const transcriptionStartTime = Date.now();
      
      // Start realistic progress updates based on estimated time
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, i) => {
          if (i === fileIndex && f.status === 'uploading') {
            const elapsed = Date.now() - transcriptionStartTime;
            const transcriptionProgress = Math.min((elapsed / estimatedDuration) * 80, 80);
            const totalProgress = 10 + transcriptionProgress;
            return { ...f, progress: Math.round(Math.min(totalProgress, 85)) };
          }
          return f;
        }));
      }, 500); // Update every 500ms for smoother progress

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
            progress: 90,
            id: result.fileId 
          } : f
        ));
      } else {
        throw new Error(result.error || 'Server-side upload failed');
      }
    } catch (error) {
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
      estimatedDurationMs: fileToUpload.estimatedDurationMs
    });

    const estimatedDuration = fileToUpload.estimatedDurationMs || 5000; // Default 5 seconds

    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      // Step 1: Get ElevenLabs API key (quick step)
      console.log('🔑 Fetching ElevenLabs API key...');
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 5 } : f
      ));

      const apiKeyResponse = await fetch('/api/user/elevenlabs-key?forUpload=true');
      if (!apiKeyResponse.ok) {
        throw new Error('Failed to get API key');
      }
      
      const { apiKey } = await apiKeyResponse.json();
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured. Please add your API key in settings.');
      }

      // Step 2: Send file directly to ElevenLabs with real-time progress tracking
      console.log('🎵 Sending file to ElevenLabs for transcription...');
      const transcriptionStartTime = Date.now();
      
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 10, startTime: transcriptionStartTime } : f
      ));

      // Start progress tracking for the transcription phase
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, i) => {
          if (i === fileIndex && f.status === 'uploading' && f.startTime) {
            const elapsed = Date.now() - f.startTime;
            const transcriptionProgress = Math.min((elapsed / estimatedDuration) * 80, 80); // 80% of total progress
            const totalProgress = 10 + transcriptionProgress; // Start from 10% (after API key)
            return { ...f, progress: Math.round(Math.min(totalProgress, 90)) }; // Cap at 90%
          }
          return f;
        }));
      }, 500); // Update every 500ms

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

      // Clear the progress interval and set to processing
      clearInterval(progressInterval);
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, status: 'processing', progress: 90 } : f
      ));

      const transcriptionResult = await transcriptionResponse.json();
      console.log('📝 Transcription received from ElevenLabs');

      // Step 3: Send transcription results to our backend
      console.log('💾 Storing transcription results...');
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex ? { ...f, progress: 95 } : f
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
        if (progress < 5) return 'Getting API key...';
        if (progress < 85) return 'Transcribing with ElevenLabs...';
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

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return <Upload className="h-4 w-4 text-gray-600" />;
      case 'uploading': return <Upload className="h-4 w-4 text-blue-600" />;
      case 'processing': return <div className="h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIconBg = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 dark:bg-gray-700';
      case 'uploading': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'processing': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'completed': return 'bg-green-100 dark:bg-green-900/30';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30';
      default: return 'bg-gray-100 dark:bg-gray-700';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header title="Transcribe Audio Files" showBackButton={true} />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Mic className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI Audio Transcription
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Transform your audio files into searchable text using ElevenLabs Scribe. 
            Files are processed securely with enterprise-grade AI for maximum accuracy.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 shadow-lg ${
            dragActive 
              ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-900/20 scale-105' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-6">
            <div className={`transition-all duration-300 ${dragActive ? 'scale-110' : ''}`}>
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                dragActive 
                  ? 'bg-blue-100 dark:bg-blue-900/50' 
                  : 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50'
              }`}>
                <Mic className={`h-8 w-8 ${dragActive ? 'text-blue-600' : 'text-blue-500'}`} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {dragActive ? 'Drop your audio files here' : 'Upload Audio Files'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Supports MP3, WAV, M4A, FLAC and more audio formats
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">MP3</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">WAV</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">M4A</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">FLAC</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">OGG</span>
              </div>
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
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl cursor-pointer transition-all transform hover:scale-105 shadow-lg font-semibold"
            >
              <FileText size={20} />
              Choose Audio Files
            </label>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-12">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  Files Queue ({files.length})
                </h2>
                <button
                  onClick={uploadAllFiles}
                  disabled={!files.some(f => f.status === 'pending')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center gap-2 font-semibold shadow-lg"
                >
                  <Upload size={18} />
                  Transcribe All
                </button>
              </div>

              <div className="space-y-4">
                {files.map((file, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between p-6">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${getStatusIconBg(file.status)}`}>
                            {getStatusIcon(file.status)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white truncate">
                              {file.file.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {(file.file.size / 1024 / 1024).toFixed(2)} MB • {file.file.type}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${getStatusColor(file.status)} flex items-center gap-2`}>
                          {getStatusText(file.status, file.progress)}
                          {file.error && (
                            <span className="text-red-600 dark:text-red-400">
                              - {file.error}
                            </span>
                          )}
                        </div>
                        {file.status === 'processing' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse"></div>
                            Finalizing transcription results
                          </div>
                        )}
                        {file.status === 'uploading' && file.estimatedDurationMs && file.startTime && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                            Estimated time: {Math.round(file.estimatedDurationMs / 1000)} seconds
                            {(() => {
                              const elapsed = Date.now() - file.startTime;
                              const remaining = Math.max(0, file.estimatedDurationMs - elapsed);
                              return remaining > 1000 ? ` (${Math.round(remaining / 1000)}s remaining)` : ' (almost done)';
                            })()}
                          </div>
                        )}
                        {file.status === 'uploading' && file.estimatedDurationMs && !file.startTime && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                            Estimated time: {Math.round(file.estimatedDurationMs / 1000)} seconds
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        {file.status === 'pending' && (
                          <button
                            onClick={() => uploadFile(index)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all transform hover:scale-105 flex items-center gap-2 font-medium shadow-md"
                          >
                            <Upload size={16} />
                            Transcribe
                          </button>
                        )}
                        
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <div className="w-40">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                              <span className="font-medium">
                                {file.status === 'uploading' ? 'Transcribing' : 'Processing'}
                              </span>
                              <span className="font-semibold">{file.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(file.status)}`}
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {file.status === 'completed' && (
                          <div className="flex items-center space-x-3">
                            <div className="text-green-600 dark:text-green-400 font-semibold text-sm flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                              <CheckCircle size={16} />
                              Complete
                            </div>
                            <button
                              onClick={() => router.push('/files')}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                            >
                              <Eye size={16} />
                              View Result
                            </button>
                          </div>
                        )}

                        {file.status === 'failed' && (
                          <div className="text-red-600 dark:text-red-400 font-semibold text-sm flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            <XCircle size={16} />
                            Failed
                          </div>
                        )}

                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Remove file"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Transcription Preview for Completed Files */}
                    {file.status === 'completed' && file.transcription && (
                      <div className="px-6 pb-6">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
                            <CheckCircle size={16} />
                            Transcription Preview
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                            {file.transcription.length > 200 
                              ? file.transcription.substring(0, 200) + '...' 
                              : file.transcription
                            }
                          </p>
                          {file.transcription.length > 200 && (
                            <button
                              onClick={() => router.push('/files')}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium mt-3 flex items-center gap-1 hover:underline"
                            >
                              View Full Transcription
                              <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-12 text-center">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              What&apos;s Next?
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/files')}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 font-medium shadow-lg"
              >
                <FileText size={18} />
                View My Files
              </button>
              <button
                onClick={() => router.push('/search')}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 flex items-center gap-2 font-medium shadow-lg"
              >
                <Eye size={18} />
                Search Transcriptions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}