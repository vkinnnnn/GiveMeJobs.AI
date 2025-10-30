'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDocumentsStore } from '@/stores/documents.store';

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const { currentDocument, getDocumentById, updateDocument, isLoading } = useDocumentsStore();
  
  const [editedContent, setEditedContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (documentId) {
      getDocumentById(documentId);
    }
  }, [documentId, getDocumentById]);

  useEffect(() => {
    if (currentDocument) {
      // Convert document sections to editable text
      const text = currentDocument.content.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => {
          const content = typeof section.content === 'string' 
            ? section.content 
            : JSON.stringify(section.content, null, 2);
          return `## ${section.title}\n\n${content}`;
        })
        .join('\n\n');
      setEditedContent(text);
    }
  }, [currentDocument]);

  const handleSave = async () => {
    if (!currentDocument) return;
    
    setIsSaving(true);
    try {
      // Parse the edited text back into sections
      const sections = editedContent
        .split(/^## /gm)
        .filter(Boolean)
        .map((section, index) => {
          const [title, ...contentLines] = section.split('\n');
          const content = contentLines.join('\n').trim();
          return {
            type: currentDocument.content.sections[index]?.type || 'custom',
            title: title.trim(),
            content,
            order: index,
          };
        });

      await updateDocument(documentId, { sections });
      alert('Document saved successfully!');
    } catch (error) {
      console.error('Failed to save document:', error);
      alert('Failed to save document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPreview = () => {
    if (!currentDocument) return null;

    return (
      <div className="prose max-w-none">
        {currentDocument.content.sections
          .sort((a, b) => a.order - b.order)
          .map((section, index) => (
            <div key={index} className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {section.title}
              </h2>
              <div className="text-gray-700 whitespace-pre-wrap">
                {typeof section.content === 'string'
                  ? section.content
                  : JSON.stringify(section.content, null, 2)}
              </div>
            </div>
          ))}
      </div>
    );
  };

  if (isLoading || !currentDocument) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/documents')}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Documents
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentDocument.title}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {currentDocument.documentType === 'resume' ? 'Resume' : 'Cover Letter'} • 
              Last updated: {new Date(currentDocument.updatedAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor and Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Editor</h2>
            <span className="text-sm text-gray-500">
              {currentDocument.metadata.wordCount} words
            </span>
          </div>
          
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-[600px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
            placeholder="Edit your document here..."
          />
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Tip: Use ## for section headers. Each section will be formatted automatically.</p>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
              <button
                onClick={() => router.push(`/documents/export/${documentId}`)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Export →
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6 h-[600px] overflow-y-auto bg-gray-50">
              {renderPreview()}
            </div>
          </div>
        )}
      </div>

      {/* Document Info */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Version:</span>
            <span className="ml-2 font-medium">{currentDocument.version}</span>
          </div>
          <div>
            <span className="text-gray-600">Keywords:</span>
            <span className="ml-2 font-medium">
              {currentDocument.metadata.keywordsUsed.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Generation Time:</span>
            <span className="ml-2 font-medium">
              {currentDocument.metadata.generationTime}s
            </span>
          </div>
          <div>
            <span className="text-gray-600">Template:</span>
            <span className="ml-2 font-medium">{currentDocument.templateId || 'Default'}</span>
          </div>
        </div>
        
        {currentDocument.metadata.keywordsUsed.length > 0 && (
          <div className="mt-4">
            <span className="text-sm text-gray-600">Keywords used:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentDocument.metadata.keywordsUsed.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
