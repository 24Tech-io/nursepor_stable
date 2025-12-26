'use client';

import { useState } from 'react';
import MatrixMultipleResponse from './MatrixMultipleResponse';
import SelectN from './SelectN';
import SATA from './SATA';
import ExtendedMultipleResponse from './ExtendedMultipleResponse';
import ExtendedDragDrop from './ExtendedDragDrop';
import ClozeDropdown from './ClozeDropdown';
import BowTie from './BowTie';
import TrendItem from './TrendItem';
import RankingItem from './RankingItem';
import CaseStudy from './CaseStudy';
import DosageCalculation from './DosageCalculation';
import HighlightText from './HighlightText';

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
  | 'dosage_calculation'
  | 'highlight_text'
  | 'multiple_choice';

interface QuestionTypeBuilderProps {
  format: QuestionFormat;
  question: any;
  onChange: (question: any) => void;
}

export default function QuestionTypeBuilder({ format, question, onChange }: QuestionTypeBuilderProps) {
  switch (format) {
    case 'matrix_multiple_response':
      return <MatrixMultipleResponse question={question} onChange={onChange} />;
    case 'select_n':
      return <SelectN question={question} onChange={onChange} />;
    case 'sata':
      return <SATA question={question} onChange={onChange} />;
    case 'extended_multiple_response':
      return <ExtendedMultipleResponse question={question} onChange={onChange} />;
    case 'extended_drag_drop':
      return <ExtendedDragDrop question={question} onChange={onChange} />;
    case 'cloze_dropdown':
      return <ClozeDropdown question={question} onChange={onChange} />;
    case 'bowtie':
      return <BowTie question={question} onChange={onChange} />;
    case 'trend_item':
      return <TrendItem question={question} onChange={onChange} />;
    case 'ranking':
      return <RankingItem question={question} onChange={onChange} />;
    case 'case_study':
      return <CaseStudy question={question} onChange={onChange} />;
    case 'dosage_calculation':
      return <DosageCalculation question={question} onChange={onChange} />;
    case 'highlight_text':
      return <HighlightText question={question} onChange={onChange} />;
    default:
      return <MultipleChoice question={question} onChange={onChange} />;
  }
}

function MultipleChoice({ question, onChange }: { question: any; onChange: (q: any) => void }) {
  const [options, setOptions] = useState(question.options || ['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer || 0);

  const updateOptions = (newOptions: string[]) => {
    setOptions(newOptions);
    onChange({ ...question, options: newOptions, correctAnswer });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
          Options
        </label>
        <div className="space-y-3">
          {options.map((opt: string, idx: number) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-[#11131a] border border-slate-800/50 rounded-lg hover:border-slate-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300">
                {String.fromCharCode(65 + idx)}
              </div>
              <input
                value={opt}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[idx] = e.target.value;
                  updateOptions(newOptions);
                }}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 px-4 py-2.5 bg-[#0b0d12] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              />
              {options.length > 2 && (
                <button
                  onClick={() => {
                    const newOptions = options.filter((_: string, i: number) => i !== idx);
                    const newCorrect = idx === correctAnswer ? 0 : (idx < correctAnswer ? correctAnswer - 1 : correctAnswer);
                    setCorrectAnswer(newCorrect);
                    setOptions(newOptions);
                    onChange({ ...question, options: newOptions, correctAnswer: newCorrect });
                  }}
                  className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const newOptions = [...options, ''];
            setOptions(newOptions);
            updateOptions(newOptions);
          }}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-purple-400 hover:text-purple-300 font-semibold hover:bg-purple-500/10 rounded-lg transition-all border border-purple-500/20 hover:border-purple-500/40"
        >
          <span className="text-lg">+</span>
          Add Option
        </button>
      </div>
      <div className="pt-4 border-t border-slate-800/50">
        <label className="block text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Correct Answer
        </label>
        <select
          value={correctAnswer}
          onChange={(e) => {
            const newCorrect = parseInt(e.target.value);
            setCorrectAnswer(newCorrect);
            onChange({ ...question, options, correctAnswer: newCorrect });
          }}
          className="w-full px-4 py-3 bg-[#11131a] border border-slate-800 rounded-lg text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-medium"
        >
          {options.map((opt: string, idx: number) => (
            <option key={idx} value={idx} className="bg-[#11131a] text-slate-200">
              Option {idx + 1}: {opt || '(empty)'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

