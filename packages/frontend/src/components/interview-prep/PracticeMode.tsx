'use client';

import { useState, useEffect } from 'react';
import { InterviewQuestion } from '@/stores/interview-prep.store';

interface PracticeModeProps {
  question: InterviewQuestion;
  onSubmit: (response: string) => Promise<void>;
  onClose: () => void;
}

export function PracticeMode({ question, onSubmit, onClose }: PracticeModeProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    setStartTime(Date.now());
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!response.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(response);
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRecording = () => {
    // Placeholder for audio recording functionality
    setIsRecording(true);
    alert('Audio recording feature coming soon! For now, please type your response.');
    setIsRecording(false);
  };

  const categoryColors: Record<string, string> = {
    behavioral: 'bg-blue-100 text-blue-800',
    technical: 'bg-purple-100 text-purple-800',
    situational: 'bg-green-100 text-green-800',
    'company-specific': 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Practice Mode</h2>
            <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[question.category]}`}>
              {question.category}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-6 bg-gray-50 border-b border-gray-200">
          <p className="text-lg font-medium text-gray-900 mb-4">{question.question}</p>
          
          {question.keyPoints && question.keyPoints.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Points to Cover:</h4>
              <ul className="list-disc list-inside space-y-1">
                {question.keyPoints.map((point, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Response Input */}
        <div className="px-6 py-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="response" className="block text-sm font-medium text-gray-700">
                Your Response
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {isRecording ? 'Recording...' : 'Record Audio'}
                </button>
              </div>
            </div>
            <textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={12}
              placeholder="Type your response here... Try to use the STAR method (Situation, Task, Action, Result) for behavioral questions."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">
                {response.length} characters • {response.split(/\s+/).filter(Boolean).length} words
              </p>
              {response.length < 50 && response.length > 0 && (
                <p className="text-sm text-orange-600">
                  Try to provide a more detailed response
                </p>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-900 mb-1">Practice Tips:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Speak naturally as if you're in a real interview</li>
                  <li>• Be specific with examples and quantify results when possible</li>
                  <li>• Keep your answer focused and concise (2-3 minutes)</li>
                  {question.category === 'behavioral' && (
                    <li>• Use the STAR method: Situation, Task, Action, Result</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!response.trim() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? 'Submitting...' : 'Submit & Get Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
