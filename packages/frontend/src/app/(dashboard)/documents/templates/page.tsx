'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentsStore, DocumentTemplate } from '@/stores/documents.store';

export default function TemplatesPage() {
  const router = useRouter();
  const { templates, getTemplates, isLoading } = useDocumentsStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);

  useEffect(() => {
    getTemplates();
  }, [getTemplates]);

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];
  
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      modern: 'bg-blue-100 text-blue-700',
      classic: 'bg-gray-100 text-gray-700',
      creative: 'bg-purple-100 text-purple-700',
      'ats-friendly': 'bg-green-100 text-green-700',
      general: 'bg-yellow-100 text-yellow-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Templates</h1>
        <p className="text-gray-600">
          Browse and preview professional templates for your resumes and cover letters
        </p>
      </div>

      {/* Category Filter */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try selecting a different category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Template Preview Placeholder */}
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* Template Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  {template.isPublic && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Public
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>

                <div className="mb-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => router.push(`/documents/generate?templateId=${template.id}`)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{previewTemplate.name}</h2>
                  <p className="text-gray-600 mt-1">{previewTemplate.description}</p>
                  <div className="mt-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${getCategoryColor(previewTemplate.category)}`}>
                      {previewTemplate.category}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body - Template Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-lg p-8 min-h-[400px]">
                <div className="bg-white shadow-lg rounded-lg p-8 max-w-3xl mx-auto">
                  {/* Template Preview Content */}
                  <div className="space-y-6">
                    <div className="text-center border-b pb-4">
                      <h3 className="text-2xl font-bold text-gray-900">John Doe</h3>
                      <p className="text-gray-600">Software Engineer</p>
                      <p className="text-sm text-gray-500 mt-2">
                        john.doe@example.com | (555) 123-4567 | linkedin.com/in/johndoe
                      </p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Professional Summary</h4>
                      <p className="text-gray-700 text-sm">
                        Experienced software engineer with 5+ years of expertise in full-stack development.
                        Passionate about building scalable applications and leading technical teams.
                      </p>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Experience</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between">
                            <h5 className="font-medium text-gray-900">Senior Software Engineer</h5>
                            <span className="text-sm text-gray-600">2020 - Present</span>
                          </div>
                          <p className="text-sm text-gray-600">Tech Company Inc.</p>
                          <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                            <li>Led development of microservices architecture</li>
                            <li>Mentored junior developers and conducted code reviews</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {['JavaScript', 'React', 'Node.js', 'Python', 'AWS'].map((skill) => (
                          <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setPreviewTemplate(null);
                    router.push(`/documents/generate?templateId=${previewTemplate.id}`);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Use This Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
