import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's ElevenLabs API key
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { elevenlabsApiKey: true }
    });

    if (!user?.elevenlabsApiKey) {
      return NextResponse.json({ 
        error: 'ElevenLabs API key not configured. Please add your API key in settings.' 
      }, { status: 400 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('audio') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Only audio files are allowed' }, { status: 400 });
    }

    // Create unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Create database record
    const dbRecord = await prisma.audioFile.create({
      data: {
        fileName: fileName,
        originalName: file.name,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        userId: session.user.id,
      }
    });

    // Process with ElevenLabs STT in background
    processAudioFile(dbRecord.id, filePath, user.elevenlabsApiKey)
      .catch(error => {
        console.error('Error processing audio file:', error);
        // Update status to failed
        prisma.audioFile.update({
          where: { id: dbRecord.id },
          data: { status: 'failed' }
        }).catch(console.error);
      });

    return NextResponse.json({ 
      success: true, 
      fileId: dbRecord.id,
      message: 'File uploaded successfully and is being processed'
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processAudioFile(fileId: string, filePath: string, apiKey: string) {
  try {
    const client = new ElevenLabs({ apiKey });
    
    // Read the audio file
    const audioBuffer = await fs.readFile(filePath);
    
    // Create a FormData object for the transcription request
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer]), 'audio.mp3');
    
    // Use ElevenLabs Speech-to-Text
    const response = await client.speechToText.transcribe({
      audio: audioBuffer,
      model_id: 'eleven_multilingual_sts_v2'
    });

    // Update database with transcription
    await prisma.audioFile.update({
      where: { id: fileId },
      data: {
        transcription: response.text,
        status: 'completed',
        processedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error processing audio with ElevenLabs:', error);
    
    // Update status to failed
    await prisma.audioFile.update({
      where: { id: fileId },
      data: { status: 'failed' }
    });
    
    throw error;
  }
}