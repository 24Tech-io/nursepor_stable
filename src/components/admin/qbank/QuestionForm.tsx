'use client';

import React, { useState, useEffect, useRef } from 'react';
import FileUpload from '../FileUpload';
import QuestionTypeBuilder from './QuestionTypeBuilder';
import { Image as ImageIcon, X } from 'lucide-react';

type QuestionFormat =
  | 'matrix_multiple_response'
  | 'select_n'
  | 'sata'
  | 'extended_multiple_response'
  | 'extended_drag_drop'
  | 'cloze_dropdown'
  | 'bowtie'
  | 'trend_item'
  | 'ranking'
  | 'case_study'
  | 'multiple_choice';

interface QuestionFormProps {
  question?: any;
  format?: QuestionFormat;
  onChange: (question: any) => void;
  onSave?: (question: any) => void;
  showSaveButton?: boolean;
}

export default function QuestionForm({
  question: initialQuestion,
  format: initialFormat = 'multiple_choice',
  onChange,
  onSave,
  showSaveButton = false,
}: QuestionFormProps) {
  const [question, setQuestion] = useState(
    initialQuestion || {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      imageUrl: '',
      format: initialFormat,
    }
  );
  const [format, setFormat] = useState<QuestionFormat>(initialFormat);

  // Track if update is from props to prevent infinite loops
  const isUpdatingFromProps = useRef(false);
  const previousQuestionRef = useRef<string>('');
  const onChangeRef = useRef(onChange);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Update onChange ref
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Update local state when prop changes (only if actually different)
  useEffect(() => {
    if (initialQuestion) {
      const currentStr = JSON.stringify({ ...question, format });
      const newStr = JSON.stringify({ ...initialQuestion, format: initialQuestion.format || format });
      
      // Only update if actually different
      if (currentStr !== newStr && previousQuestionRef.current !== newStr) {
        isUpdatingFromProps.current = true;
        previousQuestionRef.current = newStr;
        setQuestion(initialQuestion);
        if (initialQuestion.format) {
          setFormat(initialQuestion.format);
        }
        // Reset flag after state update completes
        setTimeout(() => {
          isUpdatingFromProps.current = false;
        }, 0);
      }
    }
  }, [initialQuestion]);

  // Notify parent of changes (debounced and only for user changes)
  useEffect(() => {
    // Skip if update came from props
    if (isUpdatingFromProps.current) {
      return;
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce onChange calls to prevent excessive updates
    debounceTimer.current = setTimeout(() => {
      onChangeRef.current({ ...question, format });
    }, 200); // 200ms debounce

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [question, format]);

  const handleQuestionChange = (field: string, value: any) => {
    setQuestion((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormatChange = (newFormat: QuestionFormat) => {
    setFormat(newFormat);
    setQuestion((prev) => ({ ...prev, format: newFormat }));
  };

  const handleImageUpload = (url: string) => {
    handleQuestionChange('imageUrl', url);
  };

  const handleRemoveImage = () => {
    handleQuestionChange('imageUrl', '');
  };

  const handleQuestionTypeChange = (updatedQuestion: any) => {
    setQuestion((prev) => ({ ...prev, ...updatedQuestion }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...question, format });
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Stem */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          Question Stem
        </label>
        <textarea
          value={question.question || ''}
          onChange={(e) => handleQuestionChange('question', e.target.value)}
          placeholder="Enter the question text here..."
          className="w-full min-h-[120px] px-4 py-3 bg-[#11131a] border border-slate-800/50 rounded-lg text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <ImageIcon size={16} className="text-purple-400" />
          Question Image (Optional)
        </label>
        {question.imageUrl ? (
          <div className="relative">
            <img
              src={question.imageUrl}
              alt="Question"
              className="w-full max-h-64 object-contain rounded-lg border border-slate-800/50 bg-[#11131a] p-2"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors"
              title="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <FileUpload
            type="thumbnail"
            onUploadComplete={handleImageUpload}
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            maxSizeMB={5}
            label="Upload question image"
          />
        )}
      </div>

      {/* Question Type Builder */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
          Question Format
        </label>
        <select
          value={format}
          onChange={(e) => handleFormatChange(e.target.value as QuestionFormat)}
          className="w-full px-4 py-2.5 bg-[#11131a] border border-slate-800/50 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all mb-4"
        >
          <option value="multiple_choice">Multiple Choice</option>
          <option value="sata">Select All That Apply (SATA)</option>
          <option value="extended_multiple_response">Extended Multiple Response (NGN)</option>
          <option value="extended_drag_drop">Extended Drag & Drop (NGN)</option>
          <option value="matrix_multiple_response">Matrix/Grid (NGN)</option>
          <option value="cloze_dropdown">Cloze (Drop-Down)</option>
          <option value="bowtie">Bowtie/Highlight (NGN)</option>
          <option value="trend_item">Trend (NGN)</option>
          <option value="ranking">Ranking/Ordering</option>
          <option value="case_study">Case Study (NGN)</option>
          <option value="select_n">Select N</option>
        </select>

        <div className="bg-[#161922] border border-slate-800/60 rounded-xl p-6">
          <QuestionTypeBuilder
            format={format}
            question={question}
            onChange={handleQuestionTypeChange}
          />
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Explanation (Optional)
        </label>
        <textarea
          value={question.explanation || ''}
          onChange={(e) => handleQuestionChange('explanation', e.target.value)}
          placeholder="Enter explanation for the correct answer..."
          className="w-full min-h-[100px] px-4 py-3 bg-[#11131a] border border-slate-800/50 rounded-lg text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all resize-none"
        />
      </div>

      {/* Save Button (if provided) */}
      {showSaveButton && onSave && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20"
          >
            Save Question
          </button>
        </div>
      )}
    </div>
  );
}

