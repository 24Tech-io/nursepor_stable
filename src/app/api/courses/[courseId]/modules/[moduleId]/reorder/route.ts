import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { modules } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';

// PATCH - Reorder module (move up or down)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { direction } = body; // 'up' or 'down'

    const courseId = parseInt(params.courseId);
    const moduleId = parseInt(params.moduleId);

    // Get current module
    const [currentModule] = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), eq(modules.courseId, courseId)));

    if (!currentModule) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Get all modules in this course
    const allModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(modules.order);

    const currentIndex = allModules.findIndex((m) => m.id === moduleId);
    
    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Calculate new position
    let swapIndex = -1;
    if (direction === 'up' && currentIndex > 0) {
      swapIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < allModules.length - 1) {
      swapIndex = currentIndex + 1;
    }

    if (swapIndex === -1) {
      return NextResponse.json(
        { error: 'Cannot move in that direction' },
        { status: 400 }
      );
    }

    // Swap orders
    const moduleToSwap = allModules[swapIndex];
    const tempOrder = currentModule.order;

    await db
      .update(modules)
      .set({ order: moduleToSwap.order })
      .where(eq(modules.id, moduleId));

    await db
      .update(modules)
      .set({ order: tempOrder })
      .where(eq(modules.id, moduleToSwap.id));

    return NextResponse.json({ success: true, message: 'Module reordered' });
  } catch (error) {
    console.error('Error reordering module:', error);
    return NextResponse.json({ error: 'Failed to reorder module' }, { status: 500 });
  }
}
