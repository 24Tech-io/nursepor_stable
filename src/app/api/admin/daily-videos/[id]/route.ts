import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { dailyVideos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch single daily video
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const id = parseInt(params.id);

    const video = await db.select().from(dailyVideos).where(eq(dailyVideos.id, id)).limit(1);

    if (video.length === 0) {
      return NextResponse.json({ message: 'Daily video not found' }, { status: 404 });
    }

    // Parse metadata
    let parsedDesc = video[0].description;
    let metadataObj = {};

    try {
      parsedDesc = JSON.parse(video[0].description || '{}');
      metadataObj = parsedDesc.metadata || {};
    } catch (e) {
      parsedDesc = { description: video[0].description || '' };
    }

    return NextResponse.json({
      dailyVideo: {
        ...video[0],
        description: parsedDesc.description || video[0].description || '',
        videoUrl: (metadataObj as any).videoUrl || null,
        videoProvider: (metadataObj as any).videoProvider || 'youtube',
        videoDuration: (metadataObj as any).videoDuration || null,
        thumbnail: (metadataObj as any).thumbnail || null,
        scheduledDate: (metadataObj as any).scheduledDate || null,
        priority: (metadataObj as any).priority || 0,
      },
    });
  } catch (error: any) {
    console.error('Get daily video error:', error);
    return NextResponse.json(
      { message: 'Failed to get daily video', error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update daily video
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const id = parseInt(params.id);
    const data = await request.json();

    // Check if video exists
    const existing = await db.select().from(dailyVideos).where(eq(dailyVideos.id, id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ message: 'Daily video not found' }, { status: 404 });
    }

    // Parse existing description/metadata
    let existingDesc = '';
    let existingMetadata = {};

    try {
      const parsed = JSON.parse(existing[0].description || '{}');
      // Extract the actual description string, handling nested JSON strings
      if (typeof parsed.description === 'string') {
        // Check if it's a JSON string that needs parsing
        try {
          const nestedParsed = JSON.parse(parsed.description);
          if (typeof nestedParsed === 'object' && nestedParsed.description) {
            existingDesc = nestedParsed.description;
          } else {
            existingDesc = parsed.description;
          }
        } catch (e) {
          // Not a nested JSON string, use as-is
          existingDesc = parsed.description;
        }
      } else {
        existingDesc = existing[0].description || '';
      }
      existingMetadata = parsed.metadata || {};
    } catch (e) {
      // If not JSON, use as plain description
      existingDesc = existing[0].description || '';
    }

    // Prepare update data
    const updateData: any = {};
    if (data.chapterId !== undefined) updateData.chapterId = parseInt(data.chapterId);
    if (data.title !== undefined) updateData.title = data.title;
    if (data.day !== undefined) updateData.day = data.day; // Already a string in dd-mm-yyyy format
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update description and metadata
    if (
      data.description !== undefined ||
      data.videoUrl !== undefined ||
      data.videoProvider !== undefined ||
      data.videoDuration !== undefined ||
      data.thumbnail !== undefined ||
      data.scheduledDate !== undefined ||
      data.priority !== undefined
    ) {
      const metadata = {
        videoUrl:
          data.videoUrl !== undefined ? data.videoUrl : (existingMetadata as any).videoUrl || null,
        videoProvider:
          data.videoProvider !== undefined
            ? data.videoProvider
            : (existingMetadata as any).videoProvider || 'youtube',
        videoDuration:
          data.videoDuration !== undefined
            ? data.videoDuration
            : (existingMetadata as any).videoDuration || null,
        thumbnail:
          data.thumbnail !== undefined
            ? data.thumbnail
            : (existingMetadata as any).thumbnail || null,
        scheduledDate:
          data.scheduledDate !== undefined
            ? data.scheduledDate
            : (existingMetadata as any).scheduledDate || null,
        priority:
          data.priority !== undefined ? data.priority : (existingMetadata as any).priority || 0,
      };

      // Ensure description is always a plain string, not a JSON string
      let cleanDescription = data.description !== undefined ? data.description : existingDesc;
      
      // If the incoming description is already a JSON string, parse it first
      if (typeof cleanDescription === 'string' && cleanDescription.trim().startsWith('{')) {
        try {
          const testParse = JSON.parse(cleanDescription);
          if (typeof testParse === 'object' && testParse.description) {
            cleanDescription = testParse.description;
          }
        } catch (e) {
          // Not a JSON string, use as-is
        }
      }

      const enhancedDescription = {
        description: cleanDescription, // Always use plain string
        metadata: metadata,
      };

      updateData.description = JSON.stringify(enhancedDescription);
    }

    const updated = await db
      .update(dailyVideos)
      .set(updateData)
      .where(eq(dailyVideos.id, id))
      .returning();

    // Parse and return with metadata
    let parsedDesc = updated[0].description;
    let metadataObj = {};

    try {
      parsedDesc = JSON.parse(updated[0].description || '{}');
      metadataObj = parsedDesc.metadata || {};
    } catch (e) {
      parsedDesc = { description: updated[0].description || '' };
    }

    return NextResponse.json({
      dailyVideo: {
        ...updated[0],
        description: parsedDesc.description || updated[0].description || '',
        videoUrl: (metadataObj as any).videoUrl || null,
        videoProvider: (metadataObj as any).videoProvider || 'youtube',
        videoDuration: (metadataObj as any).videoDuration || null,
        thumbnail: (metadataObj as any).thumbnail || null,
        scheduledDate: (metadataObj as any).scheduledDate || null,
        priority: (metadataObj as any).priority || 0,
      },
    });
  } catch (error: any) {
    console.error('Update daily video error:', error);
    return NextResponse.json(
      { message: 'Failed to update daily video', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete daily video
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const id = parseInt(params.id);

    await db.delete(dailyVideos).where(eq(dailyVideos.id, id));

    return NextResponse.json({ message: 'Daily video deleted successfully' });
  } catch (error: any) {
    console.error('Delete daily video error:', error);
    return NextResponse.json(
      { message: 'Failed to delete daily video', error: error.message },
      { status: 500 }
    );
  }
}
