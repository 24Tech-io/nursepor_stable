import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Get code suggestions from Gemini
 */
export async function getCodeSuggestion(prompt: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to get code suggestion from Gemini');
  }
}

/**
 * Explain code using Gemini
 */
export async function explainCode(code: string) {
  const prompt = `Explain the following code in detail:\n\n${code}`;
  return getCodeSuggestion(prompt);
}

/**
 * Fix code errors using Gemini
 */
export async function fixCodeError(code: string, error: string) {
  const prompt = `Fix the following code error:\n\nCode:\n${code}\n\nError:\n${error}\n\nProvide the corrected code and explanation.`;
  return getCodeSuggestion(prompt);
}

/**
 * Generate code based on description
 */
export async function generateCode(description: string, language: string = 'typescript') {
  const prompt = `Generate ${language} code for the following requirement:\n\n${description}\n\nProvide clean, well-commented code following best practices.`;
  return getCodeSuggestion(prompt);
}

/**
 * Review code and provide suggestions
 */
export async function reviewCode(code: string) {
  const prompt = `Review the following code and provide suggestions for improvement, including:\n- Code quality\n- Performance\n- Security\n- Best practices\n\nCode:\n${code}`;
  return getCodeSuggestion(prompt);
}

/**
 * Chat with Gemini about coding questions
 */
export async function chatWithGemini(question: string, context?: string) {
  const prompt = context ? `Context:\n${context}\n\nQuestion:\n${question}` : question;
  return getCodeSuggestion(prompt);
}
