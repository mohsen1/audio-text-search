import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { elevenlabsApiKey: true },
    });

    if (!user?.elevenlabsApiKey) {
      return NextResponse.json({
        error: 'ElevenLabs API key not configured. Please add your API key in settings.',
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Cannot process an empty file' }, { status: 400 });
    }

    // Create database record
    const dbRecord = await prisma.audioFile.create({
      data: {
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        userId: session.user.id,
      },
    });

    // Process with ElevenLabs directly from the file stream
    processAudioFile(dbRecord.id, file, user.elevenlabsApiKey)
      .catch(error => {
        console.error(`Background processing failed for fileId ${dbRecord.id}:`, error);
        prisma.audioFile.update({
          where: { id: dbRecord.id },
          data: { status: 'failed' },
        }).catch(console.error);
      });

    return NextResponse.json({
      success: true,
      fileId: dbRecord.id,
      message: 'File uploaded and is now being processed.',
    });

  } catch (error) {
    console.error('Error in POST /api/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processAudioFile(fileId: string, file: File, apiKey: string) {
  console.log(`🎵 Processing ${file.name} (${file.size} bytes) with ElevenLabs...`);

  try {
    const formData = new FormData();
    formData.append('model_id', 'scribe_v1');
    formData.append('file', file);
    formData.append('timestamps_granularity', 'word');
    formData.append('output_format', 'verbose_json');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const transcriptionResult = await response.json();
    
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
    
    // Update audio file and store words in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the audio file
      await tx.audioFile.update({
        where: { id: fileId },
        data: {
          transcription: plainText,
          transcriptData: JSON.stringify(transcriptionResult), // Store full response for timestamp search
          status: 'completed',
          processedAt: new Date(),
        },
      });
      
      // Delete any existing words for this file (in case of reprocessing)
      await tx.transcriptWord.deleteMany({
        where: { audioFileId: fileId },
      });
      
      // Insert new words if any were found
      if (words.length > 0) {
        const wordsToInsert = words.map((word, index) => ({
          audioFileId: fileId,
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
    });
    
    console.log(`✅ Successfully transcribed ${file.name} (${plainText?.length} chars, ${words.length} words with timestamps)`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to process ${file.name}:`, errorMessage);
    
    await prisma.audioFile.update({
      where: { id: fileId },
      data: { status: 'failed' },
    });
    throw error;
  }
}

interface ElevenLabsWord {
  text?: string;  // New format
  word?: string;  // Old format  
  start: number;
  end: number;
}

interface TranscriptionResponse {
  words?: ElevenLabsWord[];
  segments?: Array<{ words?: ElevenLabsWord[] }>;
  text?: string;
  [key: string]: unknown;
}

function extractWordsFromElevenLabsResponse(transcriptionResult: unknown): Array<{word: string, start: number, end: number}> {
  try {
    const result = transcriptionResult as TranscriptionResponse;
    
    console.log(`🧪 ElevenLabs response structure:`, {
      hasWords: !!result?.words,
      wordsLength: result?.words?.length,
      sampleKeys: Object.keys(result || {}).slice(0, 5)
    });
    
    // Handle different ElevenLabs response formats
    let words: ElevenLabsWord[] = [];
    
    if (result.words && Array.isArray(result.words)) {
      console.log(`📍 Found words array with ${result.words.length} words`);
      words = result.words;
    } else if (result.segments && Array.isArray(result.segments)) {
      console.log(`📍 Found segments array with ${result.segments.length} segments`);
      words = result.segments.flatMap((segment) => 
        segment.words || []
      );
    } else if (Array.isArray(result)) {
      console.log(`📍 Response is directly an array with ${result.length} items`);
      words = result as ElevenLabsWord[];
    } else if (result.text && typeof result.text === 'string') {
      console.log(`📍 Fallback: splitting text into words (no timestamps available)`);
      const textWords = result.text.split(/\s+/);
      words = textWords.map((word: string) => ({
        text: word,
        start: 0,
        end: 0
      }));
    } else {
      console.log(`⚠️ Unknown ElevenLabs response format:`, Object.keys(result || {}));
    }
    
    // Filter and clean words - handle both new format (text) and old format (word)
    return words
      .filter(word => word && (word.text || word.word) && typeof (word.text || word.word) === 'string')
      .map(word => ({
        word: (word.text || word.word || '').trim(),
        start: typeof word.start === 'number' ? word.start : 0,
        end: typeof word.end === 'number' ? word.end : 0
      }))
      .filter(word => word.word.length > 0);
      
  } catch (error) {
    console.error('Error extracting words from ElevenLabs response:', error);
    return [];
  }
}