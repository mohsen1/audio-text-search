import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const file = await prisma.audioFile.findFirst({
      where: {
        id: fileId,
        userId: session.user.id
      },
      select: {
        id: true,
        status: true,
        transcription: true,
        processedAt: true
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: file.status,
      transcription: file.transcription,
      processedAt: file.processedAt
    });

  } catch (error) {
    console.error('Error fetching file status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}