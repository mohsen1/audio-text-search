import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface SearchResult {
  fileId: string;
  fileName: string;
  originalName: string;
  matches: Array<{
    text: string;
    startTime: number;
    endTime: number;
    contextBefore: string;
    contextAfter: string;
  }>;
}


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Search for words in the database using word-level timestamps
    const wordMatches = await prisma.transcriptWord.findMany({
      where: {
        audioFile: {
          userId: session.user.id,
          status: 'completed'
        },
        word: {
          contains: query
        }
      },
      include: {
        audioFile: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            transcription: true,
            uploadedAt: true,
            fileSize: true
          }
        }
      },
      orderBy: [
        { audioFile: { uploadedAt: 'desc' } },
        { wordIndex: 'asc' }
      ]
    });

    // Also get files where the filename matches
    const filenameMatches = await prisma.audioFile.findMany({
      where: {
        userId: session.user.id,
        status: 'completed',
        originalName: {
          contains: query
        }
      },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        transcription: true,
        uploadedAt: true,
        fileSize: true
      }
    });

    // Process word matches and group by file
    const fileResultsMap = new Map<string, SearchResult>();
    
    // Process word-level matches with exact timestamps
    for (const wordMatch of wordMatches) {
      const fileId = wordMatch.audioFile.id;
      
      if (!fileResultsMap.has(fileId)) {
        fileResultsMap.set(fileId, {
          fileId: fileId,
          fileName: wordMatch.audioFile.fileName,
          originalName: wordMatch.audioFile.originalName,
          matches: []
        });
      }
      
      const fileResult = fileResultsMap.get(fileId)!;
      
      // Get context words around the match
      const contextWords = await getContextWords(fileId, wordMatch.wordIndex, 5);
      
      fileResult.matches.push({
        text: wordMatch.word,
        startTime: wordMatch.startTime,
        endTime: wordMatch.endTime,
        contextBefore: contextWords.before.map(w => w.word).join(' '),
        contextAfter: contextWords.after.map(w => w.word).join(' ')
      });
    }
    
    // Process filename matches (add files that match by name but may not have word matches)
    for (const filenameMatch of filenameMatches) {
      if (!fileResultsMap.has(filenameMatch.id)) {
        fileResultsMap.set(filenameMatch.id, {
          fileId: filenameMatch.id,
          fileName: filenameMatch.fileName,
          originalName: filenameMatch.originalName,
          matches: [{
            text: query + ' (in filename)',
            startTime: 0,
            endTime: 0,
            contextBefore: '',
            contextAfter: ''
          }]
        });
      }
    }
    
    // Fallback: Search in transcript text for files without word-level data
    const filesWithoutWords = await prisma.audioFile.findMany({
      where: {
        userId: session.user.id,
        status: 'completed',
        transcription: {
          contains: query
        },
        words: {
          none: {} // Files that have no word records
        }
      },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        transcription: true,
        uploadedAt: true,
        fileSize: true
      }
    });
    
    // Add fallback matches for files without word-level data
    for (const file of filesWithoutWords) {
      if (!fileResultsMap.has(file.id) && file.transcription) {
        fileResultsMap.set(file.id, {
          fileId: file.id,
          fileName: file.fileName,
          originalName: file.originalName,
          matches: [{
            text: query,
            startTime: 0,
            endTime: 0,
            contextBefore: getContextFromText(file.transcription, query, 'before'),
            contextAfter: getContextFromText(file.transcription, query, 'after')
          }]
        });
      }
    }
    
    // Convert map to array and limit matches per file
    const results = Array.from(fileResultsMap.values()).map(result => ({
      ...result,
      matches: result.matches.slice(0, 5) // Limit to top 5 matches per file
    }));

    // Apply pagination to filtered results
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return NextResponse.json({
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      query
    });

  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getContextWords(audioFileId: string, wordIndex: number, contextSize: number = 5) {
  const before = await prisma.transcriptWord.findMany({
    where: {
      audioFileId: audioFileId,
      wordIndex: {
        gte: Math.max(0, wordIndex - contextSize),
        lt: wordIndex
      }
    },
    orderBy: { wordIndex: 'asc' },
    select: { word: true, wordIndex: true }
  });

  const after = await prisma.transcriptWord.findMany({
    where: {
      audioFileId: audioFileId,
      wordIndex: {
        gt: wordIndex,
        lte: wordIndex + contextSize
      }
    },
    orderBy: { wordIndex: 'asc' },
    select: { word: true, wordIndex: true }
  });

  return { before, after };
}

function getContextFromText(text: string, query: string, direction: 'before' | 'after'): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return '';

  if (direction === 'before') {
    const start = Math.max(0, index - 100);
    return text.substring(start, index).trim();
  } else {
    const end = Math.min(text.length, index + query.length + 100);
    return text.substring(index + query.length, end).trim();
  }
}