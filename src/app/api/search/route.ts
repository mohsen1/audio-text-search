import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
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

    // Search for words in the database using word-level timestamps with word boundaries
    console.log(`🔍 Searching for word matches with query: "${query}"`);
    
    // Create word boundary patterns for SQLite - get all words that might match
    const queryWords = query.toLowerCase().trim().split(/\s+/);
    console.log(`📝 Query split into words:`, queryWords);
    
    // Get all potential word matches (we'll filter for word boundaries in memory)
    const allWordMatches = await prisma.transcriptWord.findMany({
      where: {
        audioFile: {
          userId: session.user.id,
          status: 'completed'
        },
        OR: queryWords.map(queryWord => ({
          word: {
            contains: queryWord
          }
        }))
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
    
    // Filter for word boundaries in memory
    const wordMatches = allWordMatches.filter(match => {
      const cleanWord = match.word.toLowerCase().replace(/[^\w]/g, '');
      return queryWords.some(queryWord => {
        const cleanQuery = queryWord.replace(/[^\w]/g, '');
        return cleanWord === cleanQuery || match.word.toLowerCase() === queryWord.toLowerCase();
      });
    });
    
    console.log(`📊 Found ${wordMatches.length} word matches in database`);

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
    console.log(`🔄 Processing ${wordMatches.length} individual word matches`);
    
    for (const wordMatch of wordMatches) {
      const fileId = wordMatch.audioFile.id;
      
      console.log(`⏰ Processing word match: "${wordMatch.word}" at ${wordMatch.startTime}s-${wordMatch.endTime}s in file ${wordMatch.audioFile.originalName}`);
      
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
      
      const match = {
        text: wordMatch.word,
        startTime: wordMatch.startTime,
        endTime: wordMatch.endTime,
        contextBefore: contextWords.before.map(w => w.word).join(' '),
        contextAfter: contextWords.after.map(w => w.word).join(' ')
      };
      
      fileResult.matches.push(match);
      console.log(`✅ Added match: "${match.text}" at ${match.startTime}s-${match.endTime}s`);
    }
    
    // Log results per file
    for (const [fileId, result] of fileResultsMap.entries()) {
      console.log(`📁 File "${result.originalName}" has ${result.matches.length} matches`);
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
    console.log(`🔄 Searching for fallback matches in transcript text`);
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
    
    console.log(`📋 Found ${filesWithoutWords.length} files without word data that match in transcript`);
    
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
    
    // Convert map to array and sort matches by time within each file
    const results = Array.from(fileResultsMap.values()).map(result => ({
      ...result,
      matches: result.matches
        .sort((a, b) => a.startTime - b.startTime) // Sort by start time
        .slice(0, 10) // Limit to top 10 matches per file for performance
    }));

    // Apply pagination to filtered results
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    
    console.log(`📋 Final results: ${total} files with matches, returning ${paginatedResults.length} files`);
    console.log(`🎯 Results summary:`, paginatedResults.map(r => `${r.originalName}: ${r.matches.length} matches`));

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