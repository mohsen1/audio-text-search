import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey } = await request.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!existingUser) {
      return NextResponse.json({ 
        error: 'User record not found. Please sign out and sign in again.' 
      }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { elevenlabsApiKey: apiKey }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating ElevenLabs API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { elevenlabsApiKey: true }
    });

    return NextResponse.json({ 
      hasApiKey: !!user?.elevenlabsApiKey,
      apiKey: user?.elevenlabsApiKey ? '••••••••' : null
    });
  } catch (error) {
    console.error('Error fetching ElevenLabs API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}