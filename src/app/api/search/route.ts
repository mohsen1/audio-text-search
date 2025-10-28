import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface SearchMatch {
  text: string;
  startTime: number;
  endTime: number;
  contextBefore: string;
  contextAfter: string;
  score: number; // Relevance score
  matchType: 'exact' | 'partial' | 'fuzzy' | 'filename';
}

interface SearchResult {
  fileId: string;
  fileName: string;
  originalName: string;
  matches: SearchMatch[];
  relevanceScore: number; // Overall file relevance
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

    console.log(`🔍 Enhanced search for query: "${query}"`);
    
    const queryWords = query.toLowerCase().trim().split(/\s+/);
    console.log(`📝 Query split into words:`, queryWords);
    
    // Get exact word matches
    const exactWordMatches = await prisma.transcriptWord.findMany({
      where: {
        audioFile: {
          userId: session.user.id,
          status: 'completed'
        },
        word: {
          in: queryWords
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

    // Get partial word matches for fuzzy search
    const partialWordMatches = await prisma.transcriptWord.findMany({
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
    
    console.log(`📊 Found ${exactWordMatches.length} exact matches, ${partialWordMatches.length} partial matches`);

    // Get files where filename matches
    // Note: SQLite doesn't support mode: 'insensitive', using contains which is case-insensitive by default
    const filenameMatches = await prisma.audioFile.findMany({
      where: {
        userId: session.user.id,
        status: 'completed',
        OR: [
          { originalName: { contains: query } },
          { fileName: { contains: query } }
        ]
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

    const fileResultsMap = new Map<string, SearchResult>();
    
    // Process exact word matches (highest priority)
    for (const wordMatch of exactWordMatches) {
      await processWordMatch(wordMatch, fileResultsMap, query, 'exact', 1.0);
    }
    
    // Process partial word matches (lower priority)
    for (const wordMatch of partialWordMatches) {
      if (!exactWordMatches.find(exact => exact.id === wordMatch.id)) {
        const similarity = calculateSimilarity(wordMatch.word.toLowerCase(), query.toLowerCase());
        await processWordMatch(wordMatch, fileResultsMap, query, 'partial', similarity);
      }
    }
    
    // Process filename matches
    for (const filenameMatch of filenameMatches) {
      if (!fileResultsMap.has(filenameMatch.id)) {
        const similarity = Math.max(
          calculateSimilarity(filenameMatch.originalName.toLowerCase(), query.toLowerCase()),
          calculateSimilarity(filenameMatch.fileName.toLowerCase(), query.toLowerCase())
        );
        
        fileResultsMap.set(filenameMatch.id, {
          fileId: filenameMatch.id,
          fileName: filenameMatch.fileName,
          originalName: filenameMatch.originalName,
          matches: [{
            text: `"${query}" found in filename`,
            startTime: 0,
            endTime: 0,
            contextBefore: '',
            contextAfter: filenameMatch.originalName,
            score: similarity,
            matchType: 'filename'
          }],
          relevanceScore: similarity * 0.7 // Filename matches get lower priority than content
        });
      }
    }
    
    // Fallback: Search in transcript text for comprehensive coverage
    const transcriptMatches = await prisma.audioFile.findMany({
      where: {
        userId: session.user.id,
        status: 'completed',
        transcription: {
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
    
    // Add transcript-level matches for files not already processed
    for (const file of transcriptMatches) {
      if (!fileResultsMap.has(file.id) && file.transcription) {
        const occurrences = findAllOccurrences(file.transcription, query);
        const matches = occurrences.map(occurrence => ({
          text: occurrence.text,
          startTime: 0,
          endTime: 0,
          contextBefore: occurrence.contextBefore,
          contextAfter: occurrence.contextAfter,
          score: occurrence.score,
          matchType: 'fuzzy' as const
        }));
        
        if (matches.length > 0) {
          fileResultsMap.set(file.id, {
            fileId: file.id,
            fileName: file.fileName,
            originalName: file.originalName,
            matches: matches.slice(0, 5), // Limit to top 5 matches per file
            relevanceScore: Math.max(...matches.map(m => m.score))
          });
        }
      }
    }
    
    // Handle phrase matching for multi-word queries
    interface PhraseMatch {
      text: string;
      startTime: number;
      endTime: number;
      words: string[];
      wordIndices: number[];
      audioFile: {
        id: string;
        fileName: string;
        originalName: string;
      };
    }
    
    const phraseMatches: PhraseMatch[] = [];
    if (queryWords.length > 1) {
      const phraseQuery = query.toLowerCase();
      
      // Search for phrase matches in transcript text
      const phraseFiles = await prisma.audioFile.findMany({
        where: {
          userId: session.user.id,
          status: 'completed',
          transcription: {
            contains: phraseQuery
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
      
      // Get words for phrase matching
      for (const file of phraseFiles) {
        const fileWords = await prisma.transcriptWord.findMany({
          where: { audioFileId: file.id },
          orderBy: { wordIndex: 'asc' }
        });
        
        if (fileWords.length > 0) {
          const wordSequences = findPhraseInWords(fileWords, queryWords);
          phraseMatches.push(...wordSequences.map(seq => ({
            text: seq.text,
            startTime: seq.startTime,
            endTime: seq.endTime,
            words: seq.words,
            wordIndices: seq.wordIndices,
            audioFile: {
              id: file.id,
              fileName: file.fileName,
              originalName: file.originalName
            }
          })));
        }
      }
    }
    
    // Process phrase matches with highest priority
    for (const phraseMatch of phraseMatches) {
      await processPhraseMatch(phraseMatch, fileResultsMap);
    }
    
    // Convert to array and sort by relevance
    const results = Array.from(fileResultsMap.values())
      .map(result => ({
        ...result,
        matches: result.matches
          .sort((a, b) => b.score - a.score || a.startTime - b.startTime)
          .slice(0, 10) // Limit matches per file
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    
    console.log(`📋 Enhanced search results: ${total} files found`);
    paginatedResults.forEach(r => 
      console.log(`📁 ${r.originalName}: ${r.matches.length} matches (score: ${r.relevanceScore.toFixed(2)})`)
    );

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
    console.error('Error in enhanced search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processWordMatch(
  wordMatch: {
    id: string;
    word: string;
    startTime: number;
    endTime: number;
    wordIndex: number;
    audioFile: {
      id: string;
      fileName: string;
      originalName: string;
    };
  },
  fileResultsMap: Map<string, SearchResult>,
  query: string,
  matchType: 'exact' | 'partial' | 'fuzzy',
  score: number
) {
  const fileId = wordMatch.audioFile.id;
  
  if (!fileResultsMap.has(fileId)) {
    fileResultsMap.set(fileId, {
      fileId: fileId,
      fileName: wordMatch.audioFile.fileName,
      originalName: wordMatch.audioFile.originalName,
      matches: [],
      relevanceScore: 0
    });
  }
  
  const fileResult = fileResultsMap.get(fileId)!;
  
  // Get context words around the match
  const contextWords = await getContextWords(fileId, wordMatch.wordIndex, 5);
  
  const match: SearchMatch = {
    text: wordMatch.word,
    startTime: wordMatch.startTime,
    endTime: wordMatch.endTime,
    contextBefore: contextWords.before.map(w => w.word).join(' '),
    contextAfter: contextWords.after.map(w => w.word).join(' '),
    score: score,
    matchType: matchType
  };
  
  fileResult.matches.push(match);
  fileResult.relevanceScore = Math.max(fileResult.relevanceScore, score);
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple similarity calculation based on substring matching and length
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Exact match
  if (str1 === str2) return 1.0;
  
  // Check if shorter string is contained in longer
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }
  
  // Calculate edit distance-based similarity
  const editDistance = levenshteinDistance(str1, str2);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

interface TextOccurrence {
  text: string;
  contextBefore: string;
  contextAfter: string;
  score: number;
}

function findAllOccurrences(text: string, query: string): TextOccurrence[] {
  const occurrences: TextOccurrence[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const contextLength = 100;
  
  let startIndex = 0;
  while (true) {
    const index = lowerText.indexOf(lowerQuery, startIndex);
    if (index === -1) break;
    
    const beforeStart = Math.max(0, index - contextLength);
    const afterEnd = Math.min(text.length, index + query.length + contextLength);
    
    const contextBefore = text.substring(beforeStart, index).trim();
    const contextAfter = text.substring(index + query.length, afterEnd).trim();
    const matchedText = text.substring(index, index + query.length);
    
    // Calculate score based on exact vs partial match
    const score = matchedText.toLowerCase() === lowerQuery ? 1.0 : 0.8;
    
    occurrences.push({
      text: matchedText,
      contextBefore,
      contextAfter,
      score
    });
    
    startIndex = index + 1;
  }
  
  return occurrences;
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

// Find sequences of words that match the query phrase
interface WordData {
  id: string;
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

interface PhraseSequence {
  text: string;
  startTime: number;
  endTime: number;
  words: string[];
  wordIndices: number[];
}

function findPhraseInWords(words: WordData[], queryWords: string[]): PhraseSequence[] {
  const sequences: PhraseSequence[] = [];
  
  for (let i = 0; i <= words.length - queryWords.length; i++) {
    let matches = true;
    const sequenceWords = [];
    const sequenceIndices = [];
    
    for (let j = 0; j < queryWords.length; j++) {
      const word = words[i + j];
      if (!word || word.word.toLowerCase().replace(/[^\w]/g, '') !== queryWords[j].toLowerCase().replace(/[^\w]/g, '')) {
        matches = false;
        break;
      }
      sequenceWords.push(word.word);
      sequenceIndices.push(word.wordIndex);
    }
    
    if (matches && sequenceWords.length > 0) {
      const startWord = words[i];
      const endWord = words[i + queryWords.length - 1];
      
      sequences.push({
        text: sequenceWords.join(' '),
        startTime: startWord.startTime,
        endTime: endWord.endTime,
        words: sequenceWords,
        wordIndices: sequenceIndices
      });
    }
  }
  
  return sequences;
}

async function processPhraseMatch(
  phraseMatch: {
    text: string;
    startTime: number;
    endTime: number;
    wordIndices: number[];
    audioFile: {
      id: string;
      fileName: string;
      originalName: string;
    };
  },
  fileResultsMap: Map<string, SearchResult>
) {
  const fileId = phraseMatch.audioFile.id;
  
  if (!fileResultsMap.has(fileId)) {
    fileResultsMap.set(fileId, {
      fileId: fileId,
      fileName: phraseMatch.audioFile.fileName,
      originalName: phraseMatch.audioFile.originalName,
      matches: [],
      relevanceScore: 0
    });
  }
  
  const fileResult = fileResultsMap.get(fileId)!;
  
  // Get context words around the phrase match
  const contextWords = await getContextWords(fileId, phraseMatch.wordIndices[0], 5);
  
  const match: SearchMatch = {
    text: phraseMatch.text,
    startTime: phraseMatch.startTime,
    endTime: phraseMatch.endTime,
    contextBefore: contextWords.before.map(w => w.word).join(' '),
    contextAfter: contextWords.after.map(w => w.word).join(' '),
    score: 1.0, // Phrase matches get highest score
    matchType: 'exact'
  };
  
  fileResult.matches.push(match);
  fileResult.relevanceScore = Math.max(fileResult.relevanceScore, 1.0);
}