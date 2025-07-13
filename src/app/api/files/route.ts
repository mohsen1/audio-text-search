import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, any> = {
      userId: session.user.id
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { transcription: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get files with pagination
    const [files, total] = await Promise.all([
      prisma.audioFile.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          fileName: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          transcription: true,
          uploadedAt: true,
          processedAt: true,
          status: true
        }
      }),
      prisma.audioFile.count({ where })
    ]);

    return NextResponse.json({
      files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    // Verify file belongs to user
    const file = await prisma.audioFile.findFirst({
      where: {
        id: fileId,
        userId: session.user.id
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Files are processed directly without being stored on disk,
    // so we only need to delete the database record
    await prisma.audioFile.delete({
      where: { id: fileId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}