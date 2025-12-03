import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { qbankCategories, qbankQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const categoryId = parseInt(params.categoryId);
    const body = await request.json();
    const { name, description, color, icon, sortOrder } = body;

    const db = getDatabase();

    const [updatedCategory] = await db
      .update(qbankCategories)
      .set({
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        color: color !== undefined ? color : undefined,
        icon: icon !== undefined ? icon : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        updatedAt: new Date(),
      })
      .where(eq(qbankCategories.id, categoryId))
      .returning();

    if (!updatedCategory) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category: updatedCategory });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { message: 'Failed to update category', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { categoryId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const categoryId = parseInt(params.categoryId);
    const db = getDatabase();

    // Check if category has questions
    const questions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.categoryId, categoryId));

    if (questions.length > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete category with ${questions.length} questions. Move or delete questions first.`,
          questionCount: questions.length,
        },
        { status: 400 }
      );
    }

    await db.delete(qbankCategories).where(eq(qbankCategories.id, categoryId));

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { message: 'Failed to delete category', error: error.message },
      { status: 500 }
    );
  }
}
