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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
        {options.map((opt: string, idx: number) => (
          <input
            key={idx}
            value={opt}
            onChange={(e) => {
              const newOptions = [...options];
              newOptions[idx] = e.target.value;
              updateOptions(newOptions);
            }}
            placeholder={`Option ${idx + 1}`}
            className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
        <select
          value={correctAnswer}
          onChange={(e) => {
            const newCorrect = parseInt(e.target.value);
            setCorrectAnswer(newCorrect);
            onChange({ ...question, options, correctAnswer: newCorrect });
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          {options.map((opt: string, idx: number) => (
            <option key={idx} value={idx}>
              Option {idx + 1}: {opt || '(empty)'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

