'use client';

import { InterviewQuestion } from '@/stores/interview-prep.store';
import { useState } from 'react';

interface InterviewQuestionsProps {
  questions: InterviewQuestion[];
  onPractice?: (questionId: string) => void;
}

const categoryColors: Record<string, string> = {
  behavioral: 'bg-blue-100 text-blue-800',
  technical: 'bg-purple-100 text-purple-800',
  situational: 'bg-green-100 text-green-800',
  'company-specific': 'bg-orange-100 text-orange-800',
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

export function InterviewQuestions({ questions, onPractice }: InterviewQuestionsProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const groupedQuestions = questions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, InterviewQuestion[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
        <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {category.replace('-', ' ')} Questions
              </h3>
              <span className="text-sm text-gray-500">
                {categoryQuestions.length} question{categoryQuestions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {categoryQuestions.map((question, index) => (
              <div key={question.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          categoryColors[question.category]
                        }`}
                      >
                        {question.category}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          difficultyColors[question.difficulty]
                        }`}
                      >
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="text-base font-medium text-gray-900">{question.question}</p>
                  </div>
                  <button
                    onClick={() => toggleQuestion(question.id)}
                    className="ml-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {expandedQuestions.has(question.id) ? 'Hide' : 'Show'} Answer
                  </button>
                </div>

                {expandedQuestions.has(question.id) && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Suggested Answer:
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {question.suggestedAnswer}
                      </p>
                    </div>

                    {question.keyPoints && question.keyPoints.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Points:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {question.keyPoints.map((point, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {question.starFramework && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          STAR Framework:
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-purple-700">
                              Situation:
                            </span>
                            <p className="text-sm text-gray-700">
                              {question.starFramework.situation}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-purple-700">Task:</span>
                            <p className="text-sm text-gray-700">{question.starFramework.task}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-purple-700">Action:</span>
                            <p className="text-sm text-gray-700">{question.starFramework.action}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-purple-700">Result:</span>
                            <p className="text-sm text-gray-700">{question.starFramework.result}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {onPractice && (
                      <button
                        onClick={() => onPractice(question.id)}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Practice This Question
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
