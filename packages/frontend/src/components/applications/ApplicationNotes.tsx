'use client';

import { useState } from 'react';
import { ApplicationNote } from '@/stores/applications.store';

interface ApplicationNotesProps {
  notes: ApplicationNote[];
  onAddNote: (note: { content: string; type: string }) => Promise<void>;
}

const noteTypes = [
  { value: 'general', label: 'General' },
  { value: 'interview', label: 'Interview' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'follow-up', label: 'Follow-up' },
];

export function ApplicationNotes({ notes, onAddNote }: ApplicationNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ content: '', type: 'general' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddNote(newNote);
      setNewNote({ content: '', type: 'general' });
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const noteTypeColors: Record<string, string> = {
    general: 'bg-gray-100 text-gray-800',
    interview: 'bg-purple-100 text-purple-800',
    feedback: 'bg-blue-100 text-blue-800',
    'follow-up': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="mb-3">
            <label htmlFor="note-type" className="block text-sm font-medium text-gray-700 mb-1">
              Note Type
            </label>
            <select
              id="note-type"
              value={newNote.type}
              onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {noteTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 mb-1">
              Note Content
            </label>
            <textarea
              id="note-content"
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              rows={4}
              placeholder="Add your note here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewNote({ content: '', type: 'general' });
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sortedNotes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          <p>No notes yet. Add your first note to track important information.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedNotes.map((note) => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    noteTypeColors[note.type] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {noteTypes.find((t) => t.value === note.type)?.label || note.type}
                </span>
                <span className="text-xs text-gray-500">{formatDate(note.createdAt)}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
