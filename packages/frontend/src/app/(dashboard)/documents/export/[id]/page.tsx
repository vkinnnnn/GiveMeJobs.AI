'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDocumentsStore } from '@/stores/documents.store';

export default function ExportDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;
  
  const { currentDocument, getDocumentById, exportDocument, isLoading } = useDocumentsStore();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf');

  useEffect(() => {
    if (documentId) {
      getDocumentById(documentId);
    }
  }, [documentId, getDocumentById]);

  const handleExport = async (format: 'pdf' | 'docx' | 'txt') => {
    setIsExporting(true);
    setSelectedFormat(format);
    
    try {
      const blob = await exportDocument(documentId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'txt' ? 'txt' : format;
      const filename = `${currentDocument?.title || 'document'}.${extension}`;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export document:', error);
      alert('Failed to export document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !currentDocument) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Export Document</h1>
      <p className="text-gray-600 mb-8">
        Download your document in your preferred format
      </p>

      <div className="bg-white shadow rounded-lg p-6">
        {/* Document Info */}
        <div className="mb-6 pb-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {currentDocument.title}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="capitalize">
              {currentDocument.documentType === 'resume' ? 'Resume' : 'Cover Letter'}
            </span>
            <span>•</span>
            <span>{currentDocument.metadata.wordCount} words</span>
            <span>•</span>
            <span>Version {currentDocument.version}</span>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Select Format</h3>
          
          {/* PDF Export */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <svg className="w-8 h-8 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900">PDF</h4>
                    <p className="text-sm text-gray-600">
                      Best for printing and professional submissions
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting && selectedFormat === 'pdf'}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isExporting && selectedFormat === 'pdf' ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>

          {/* DOCX Export */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <svg className="w-8 h-8 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900">DOCX</h4>
                    <p className="text-sm text-gray-600">
                      Editable format for Microsoft Word
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleExport('docx')}
                disabled={isExporting && selectedFormat === 'docx'}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isExporting && selectedFormat === 'docx' ? 'Exporting...' : 'Export DOCX'}
              </button>
            </div>
          </div>

          {/* TXT Export */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <svg className="w-8 h-8 text-gray-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900">Plain Text</h4>
                    <p className="text-sm text-gray-600">
                      Simple text format without formatting
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleExport('txt')}
                disabled={isExporting && selectedFormat === 'txt'}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isExporting && selectedFormat === 'txt' ? 'Exporting...' : 'Export TXT'}
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold text-gray-900 mb-2">Export Tips</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• PDF is recommended for most job applications</li>
            <li>• DOCX allows further editing in Microsoft Word or Google Docs</li>
            <li>• Plain text is useful for copying into online application forms</li>
            <li>• Always review the exported document before submitting</li>
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => router.push(`/documents/edit/${documentId}`)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Edit Document
        </button>
        <button
          onClick={() => router.push('/documents')}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back to Library
        </button>
      </div>
    </div>
  );
}
