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
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf');

  useEffect(() => {
    if (documentId) {
      getDocumentById(documentId);
    }
  }, [documentId, getDocumentById]);

  const handleExport = async (format: 'pdf' | 'docx' | 'txt') => {
    if (!currentDocument) return;
    
    setIsExporting(true);
    try {
      const blob = await exportDocument(documentId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentDocument.title}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
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
        
        <h1 className="text-3xl font-bold text-gray-900">Export Document</h1>
        <p className="text-gray-600 mt-1">
          Export "{currentDocument.title}" in your preferred format
        </p>
      </div>

      {/* Export Options */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Format</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PDF Option */}
          <button
            onClick={() => setExportFormat('pdf')}
            className={`p-6 border-2 rounded-lg text-left transition-colors ${
              exportFormat === 'pdf'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-red-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">PDF</h3>
                <p className="text-sm text-gray-600">Professional format</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Best for sharing and printing. Preserves formatting across all devices.
            </p>
          </button>

          {/* DOCX Option */}
          <button
            onClick={() => setExportFormat('docx')}
            className={`p-6 border-2 rounded-lg text-left transition-colors ${
              exportFormat === 'docx'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">DOCX</h3>
                <p className="text-sm text-gray-600">Microsoft Word format</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Editable format for further customization in Microsoft Word or similar apps.
            </p>
          </button>

          {/* TXT Option */}
          <button
            onClick={() => setExportFormat('txt')}
            className={`p-6 border-2 rounded-lg text-left transition-colors ${
              exportFormat === 'txt'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-3">
              <svg className="w-8 h-8 text-gray-600 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">TXT</h3>
                <p className="text-sm text-gray-600">Plain text format</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Simple text format compatible with any text editor or ATS system.
            </p>
          </button>
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Preview</h2>
        
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 max-h-96 overflow-y-auto">
          <div className="prose max-w-none">
            {currentDocument.content.sections
              .sort((a, b) => a.order - b.order)
              .map((section, index) => (
                <div key={index} className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {section.title}
                  </h3>
                  <div className="text-gray-700 whitespace-pre-wrap text-sm">
                    {typeof section.content === 'string'
                      ? section.content
                      : JSON.stringify(section.content, null, 2)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Ready to Export</h3>
            <p className="text-sm text-gray-600">
              Export as {exportFormat.toUpperCase()} format
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/documents/edit/${documentId}`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Edit Document
            </button>
            <button
              onClick={() => handleExport(exportFormat)}
              disabled={isExporting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Document Type:</span>
            <span className="ml-2 font-medium capitalize">
              {currentDocument.documentType.replace('-', ' ')}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Word Count:</span>
            <span className="ml-2 font-medium">{currentDocument.metadata.wordCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Version:</span>
            <span className="ml-2 font-medium">{currentDocument.version}</span>
          </div>
          <div>
            <span className="text-gray-600">Last Updated:</span>
            <span className="ml-2 font-medium">
              {new Date(currentDocument.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}