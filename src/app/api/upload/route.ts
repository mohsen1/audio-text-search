import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

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

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Cannot process an empty file' }, { status: 400 });
    }

    // Save file to disk
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileName);

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    // Create database record
    const dbRecord = await prisma.audioFile.create({
      data: {
        fileName: fileName,
        originalName: file.name,
        filePath: filePath,
        fileSize: buffer.length,
        mimeType: file.type,
        status: 'processing',
        userId: session.user.id,
      },
    });

    // Process with ElevenLabs
    processAudioFile(dbRecord.id, buffer, file.name, file.type, user.elevenlabsApiKey)
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

async function processAudioFile(fileId: string, audioBuffer: Buffer, originalFileName: string, mimeType: string, apiKey: string) {
  console.log(`🎵 Processing ${originalFileName} (${audioBuffer.length} bytes) with ElevenLabs...`);

  try {
    const blob = new Blob([audioBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('model_id', 'scribe_v1');
    formData.append('file', blob, originalFileName);
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
        await tx.transcriptWord.createMany({
          data: words.map((word, index) => ({
            audioFileId: fileId,
            word: word.word,
            startTime: word.start,
            endTime: word.end,
            wordIndex: index,
          })),
        });
      }
    });
    
    console.log(`✅ Successfully transcribed ${originalFileName} (${plainText?.length} chars, ${words.length} words with timestamps)`);

  } catch (error) {
    console.error(`❌ Failed to process ${originalFileName}:`, error.message);
    
    await prisma.audioFile.update({
      where: { id: fileId },
      data: { status: 'failed' },
    });
    throw error;
  }
}

interface ElevenLabsWord {
  word: string;
  start: number;
  end: number;
}

function extractWordsFromElevenLabsResponse(transcriptionResult: any): ElevenLabsWord[] {
  try {
    // Handle different ElevenLabs response formats
    let words: ElevenLabsWord[] = [];
    
    if (transcriptionResult.words && Array.isArray(transcriptionResult.words)) {
      // Direct words array
      words = transcriptionResult.words;
    } else if (transcriptionResult.segments && Array.isArray(transcriptionResult.segments)) {
      // Segments containing words
      words = transcriptionResult.segments.flatMap((segment: any) => 
        segment.words || []
      );
    } else if (Array.isArray(transcriptionResult)) {
      // Array of words directly
      words = transcriptionResult;
    } else if (transcriptionResult.text && typeof transcriptionResult.text === 'string') {
      // Fallback: split text into words without timestamps
      const textWords = transcriptionResult.text.split(/\s+/);
      words = textWords.map((word: string, index: number) => ({
        word: word,
        start: 0,
        end: 0
      }));
    }
    
    // Filter and clean words
    return words
      .filter(word => word && word.word && typeof word.word === 'string')
      .map(word => ({
        word: word.word.trim(),
        start: typeof word.start === 'number' ? word.start : 0,
        end: typeof word.end === 'number' ? word.end : 0
      }))
      .filter(word => word.word.length > 0);
      
  } catch (error) {
    console.error('Error extracting words from ElevenLabs response:', error);
    return [];
  }
}