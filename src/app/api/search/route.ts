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

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
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

    // Get files with transcripts that match the search query
    const files = await prisma.audioFile.findMany({
      where: {
        userId: session.user.id,
        status: 'completed',
        OR: [
          { transcription: { contains: query } },
          { originalName: { contains: query } }
        ]
      },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        transcription: true,
        transcriptData: true,
        uploadedAt: true,
        fileSize: true
      },
      orderBy: { uploadedAt: 'desc' },
      skip: offset,
      take: limit
    });

    const results: SearchResult[] = [];

    for (const file of files) {
      const matches: SearchResult['matches'] = [];

      try {
        if (file.transcriptData) {
          // Parse detailed transcript data
          const transcriptData = JSON.parse(file.transcriptData);
          
          // Handle different ElevenLabs response formats
          let words: TranscriptWord[] = [];
          
          if (transcriptData.words) {
            words = transcriptData.words;
          } else if (transcriptData.segments) {
            // Flatten segments into words
            words = transcriptData.segments.flatMap((segment: any) => 
              segment.words || []
            );
          } else if (Array.isArray(transcriptData)) {
            words = transcriptData;
          }

          // Search for matches in word-level data
          const queryLower = query.toLowerCase();
          const queryWords = queryLower.split(/\s+/);

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (!word || !word.word) continue;

            const wordText = word.word.toLowerCase();
            
            // Check for single word matches
            if (wordText.includes(queryLower)) {
              matches.push(createMatch(words, i, i, query));
            }
            
            // Check for multi-word matches
            if (queryWords.length > 1) {
              let matchLength = 0;
              for (let j = 0; j < queryWords.length && i + j < words.length; j++) {
                const currentWord = words[i + j];
                if (currentWord && currentWord.word.toLowerCase().includes(queryWords[j])) {
                  matchLength++;
                } else {
                  break;
                }
              }
              
              if (matchLength === queryWords.length) {
                matches.push(createMatch(words, i, i + matchLength - 1, query));
              }
            }
          }
        }

        // Fallback to simple text search if no detailed data
        if (matches.length === 0 && file.transcription?.toLowerCase().includes(query.toLowerCase())) {
          matches.push({
            text: query,
            startTime: 0,
            endTime: 0,
            contextBefore: getContextFromText(file.transcription, query, 'before'),
            contextAfter: getContextFromText(file.transcription, query, 'after')
          });
        }

      } catch (error) {
        console.error(`Error parsing transcript data for file ${file.id}:`, error);
        
        // Fallback to simple text search
        if (file.transcription?.toLowerCase().includes(query.toLowerCase())) {
          matches.push({
            text: query,
            startTime: 0,
            endTime: 0,
            contextBefore: getContextFromText(file.transcription, query, 'before'),
            contextAfter: getContextFromText(file.transcription, query, 'after')
          });
        }
      }

      if (matches.length > 0) {
        results.push({
          fileId: file.id,
          fileName: file.fileName,
          originalName: file.originalName,
          matches: matches.slice(0, 5) // Limit to top 5 matches per file
        });
      }
    }

    const total = await prisma.audioFile.count({
      where: {
        userId: session.user.id,
        status: 'completed',
        OR: [
          { transcription: { contains: query } },
          { originalName: { contains: query } }
        ]
      }
    });

    return NextResponse.json({
      results,
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

function createMatch(words: TranscriptWord[], startIndex: number, endIndex: number, query: string) {
  const matchWords = words.slice(startIndex, endIndex + 1);
  const contextBefore = words.slice(Math.max(0, startIndex - 5), startIndex)
    .map(w => w.word).join(' ');
  const contextAfter = words.slice(endIndex + 1, Math.min(words.length, endIndex + 6))
    .map(w => w.word).join(' ');

  return {
    text: matchWords.map(w => w.word).join(' '),
    startTime: matchWords[0]?.start || 0,
    endTime: matchWords[matchWords.length - 1]?.end || 0,
    contextBefore,
    contextAfter
  };
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