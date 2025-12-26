import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { aiAssistSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import {
  getCodeSuggestion,
  explainCode,
  fixCodeError,
  generateCode,
  reviewCode,
  chatWithGemini,
} from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const bodyValidation = await extractAndValidate(request, aiAssistSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { action, code, error, description, language, question, context } = bodyValidation.data;

    let result: string;

    switch (action) {
      case 'suggest':
        if (!description) {
          return NextResponse.json(
            { error: 'Description is required for suggestions' },
            { status: 400 }
          );
        }
        result = await getCodeSuggestion(description);
        break;

      case 'explain':
        if (!code) {
          return NextResponse.json(
            { error: 'Code is required for explanation' },
            { status: 400 }
          );
        }
        result = await explainCode(code);
        break;

      case 'fix':
        if (!code || !error) {
          return NextResponse.json(
            { error: 'Code and error are required for fixing' },
            { status: 400 }
          );
        }
        result = await fixCodeError(code, error);
        break;

      case 'generate':
        if (!description) {
          return NextResponse.json(
            { error: 'Description is required for code generation' },
            { status: 400 }
          );
        }
        result = await generateCode(description, language);
        break;

      case 'review':
        if (!code) {
          return NextResponse.json(
            { error: 'Code is required for review' },
            { status: 400 }
          );
        }
        result = await reviewCode(code);
        break;

      case 'chat':
        if (!question) {
          return NextResponse.json(
            { error: 'Question is required for chat' },
            { status: 400 }
          );
        }
        result = await chatWithGemini(question, context);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ result });
  } catch (error) {
    logger.error('AI Assist API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

