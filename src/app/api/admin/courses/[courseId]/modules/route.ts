import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { modules, chapters } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, order, isPublished, duration } = body;

    if (!title) {
      return NextResponse.json(
        { message: 'Module title is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    const [newModule] = await db
      .insert(modules)
      .values({
        courseId,
        title,
        description: description || null,
        order: order || 1,
        isPublished: isPublished !== undefined ? isPublished : true,
        duration: duration || 0,
      })
      .returning();

    return NextResponse.json({
      module: {
        id: newModule.id.toString(),
        courseId: newModule.courseId.toString(),
        title: newModule.title,
        description: newModule.description,
        order: newModule.order,
        isPublished: newModule.isPublished,
        duration: newModule.duration,
        chapters: [],
        createdAt: newModule.createdAt?.toISOString(),
        updatedAt: newModule.updatedAt?.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create module error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create module',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, title, description, order, isPublished, duration } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'Module ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const [updatedModule] = await db
      .update(modules)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(order !== undefined && { order }),
        ...(isPublished !== undefined && { isPublished }),
        ...(duration !== undefined && { duration }),
        updatedAt: new Date(),
      })
      .where(eq(modules.id, parseInt(id)))
      .returning();

    if (!updatedModule) {
      return NextResponse.json(
        { message: 'Module not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      module: {
        id: updatedModule.id.toString(),
        courseId: updatedModule.courseId.toString(),
        title: updatedModule.title,
        description: updatedModule.description,
        order: updatedModule.order,
        isPublished: updatedModule.isPublished,
        duration: updatedModule.duration,
        createdAt: updatedModule.createdAt?.toISOString(),
        updatedAt: updatedModule.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update module error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update module',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'Module ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    await db
      .delete(modules)
      .where(eq(modules.id, parseInt(id)));

    return NextResponse.json({ message: 'Module deleted successfully' });
  } catch (error: any) {
    console.error('Delete module error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to delete module',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

