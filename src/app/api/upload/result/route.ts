import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface ElevenLabsWord {
  text: string;
  start: number;
  end: number;
  type?: string;
  speaker_id?: string | null;
  logprob?: number;
  characters?: unknown;
}

interface TranscriptionResult {
  text?: string;
  words?: ElevenLabsWord[];
  language_code?: string;
  language_probability?: number;
  [key: string]: unknown;
}

function extractWordsFromElevenLabsResponse(transcriptionResult: TranscriptionResult): Array<{
  word: string;
  start: number;
  end: number;
}> {
  console.log('🔍 Extracting words from ElevenLabs response...');
  console.log('📋 Transcription result structure:', {
    hasWords: !!transcriptionResult?.words,
    wordsType: typeof transcriptionResult?.words,
    wordsIsArray: Array.isArray(transcriptionResult?.words),
    wordsLength: transcriptionResult?.words?.length,
    sampleKeys: Object.keys(transcriptionResult || {}).slice(0, 5)
  });
  
  if (!transcriptionResult || !transcriptionResult.words || !Array.isArray(transcriptionResult.words)) {
    console.warn('⚠️ No words array found in transcription result');
    return [];
  }

  try {
    const words = transcriptionResult.words
      .map((wordObj: ElevenLabsWord, index: number) => {
        try {
          // Validate wordObj structure
          if (!wordObj || typeof wordObj !== 'object') {
            console.warn(`⚠️ Invalid word object at index ${index}:`, wordObj);
            return null;
          }

          // Extract word text directly (new ElevenLabs format)
          const word = typeof wordObj.text === 'string' ? wordObj.text.trim() : '';
          
          if (!word) {
            console.warn(`⚠️ Empty word text at index ${index}:`, wordObj);
            return null;
          }

          // Validate timestamps (new ElevenLabs format uses 'start' and 'end')
          const startTime = typeof wordObj.start === 'number' ? wordObj.start : 0;
          const endTime = typeof wordObj.end === 'number' ? wordObj.end : 0;

          return {
            word,
            start: startTime,
            end: endTime,
          };
        } catch (error) {
          console.error(`❌ Error processing word at index ${index}:`, error);
          return null;
        }
      })
      .filter((w): w is NonNullable<typeof w> => w !== null && w.word.length > 0);

    console.log(`📝 Extracted ${words.length} words from response`);
    return words;
  } catch (error) {
    console.error('❌ Error in extractWordsFromElevenLabsResponse:', error);
    return [];
  }
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
