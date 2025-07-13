import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface ElevenLabsWord {
  chars: Array<{
    char: string;
    start_time: number;
    end_time: number;
  }>;
  start_time: number;
  end_time: number;
}

interface TranscriptionResult {
  text?: string;
  words?: ElevenLabsWord[];
  [key: string]: unknown;
}

function extractWordsFromElevenLabsResponse(transcriptionResult: TranscriptionResult): Array<{
  word: string;
  start: number;
  end: number;
}> {
  console.log('🔍 Extracting words from ElevenLabs response...');
  
  if (!transcriptionResult.words || !Array.isArray(transcriptionResult.words)) {
    console.warn('⚠️ No words array found in transcription result');
    return [];
  }

  const words = transcriptionResult.words.map((wordObj: ElevenLabsWord) => {
    const word = wordObj.chars.map(char => char.char).join('');
    return {
      word: word.trim(),
      start: wordObj.start_time,
      end: wordObj.end_time,
    };
  }).filter((w) => w.word.length > 0); // Filter out empty words

  console.log(`📝 Extracted ${words.length} words from response`);
  return words;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      fileName,
      fileSize,
      mimeType,
      transcriptionResult
    } = await request.json();

    if (!fileName || !fileSize || !transcriptionResult) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileName, fileSize, transcriptionResult' 
      }, { status: 400 });
    }

    // Extract plain text for simple search compatibility
    const plainText = typeof transcriptionResult === 'string' 
      ? transcriptionResult 
      : transcriptionResult.text || JSON.stringify(transcriptionResult);
    
    // Extract and store word-level timestamps
    const words = extractWordsFromElevenLabsResponse(transcriptionResult);
    console.log(`📝 Extracted ${words.length} words from ElevenLabs response`);
    
    if (words.length > 0) {
      console.log(`🔍 First few words with timestamps:`, words.slice(0, 5).map(w => `"${w.word}" (${w.start}s-${w.end}s)`));
    }
    
    // Create database record and store words in a transaction
    const dbRecord = await prisma.$transaction(async (tx) => {
      // Create the audio file record
      const audioFile = await tx.audioFile.create({
        data: {
          fileName,
          originalName: fileName,
          fileSize,
          mimeType: mimeType || 'audio/unknown',
          transcription: plainText,
          transcriptData: JSON.stringify(transcriptionResult),
          status: 'completed',
          processedAt: new Date(),
          userId: session.user.id,
        },
      });
      
      // Insert words if any were found
      if (words.length > 0) {
        const wordsToInsert = words.map((word, index) => ({
          audioFileId: audioFile.id,
          word: word.word,
          startTime: word.start,
          endTime: word.end,
          wordIndex: index,
        }));
        
        console.log(`💾 Storing ${wordsToInsert.length} words in database`);
        await tx.transcriptWord.createMany({
          data: wordsToInsert,
        });
        console.log(`✅ Successfully stored word-level timestamps in database`);
      } else {
        console.log(`⚠️ No words with timestamps found to store`);
      }

      return audioFile;
    });
    
    console.log(`✅ Successfully processed transcription for ${fileName} (${plainText?.length} chars, ${words.length} words)`);

    return NextResponse.json({
      success: true,
      fileId: dbRecord.id,
      message: 'Transcription processed successfully.',
    });

  } catch (error) {
    console.error('Error in POST /api/upload/result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
