'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDocumentsStore, DocumentType } from '@/stores/documents.store';
import { useJobsStore } from '@/stores/jobs.store';
import { useAuthStore } from '@/stores/auth.store';

export default function GenerateDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('jobId');
  
  const { user } = useAuthStore();
  const { generateResume, generateCoverLetter, templates, getTemplates, isGenerating } = useDocumentsStore();
  const { jobs, savedJobs, getSavedJobs, getJobById } = useJobsStore();
  
  const [selectedJobId, setSelectedJobId] = useState<string>(jobIdParam || '');
  const [documentType, setDocumentType] = useState<DocumentType>(DocumentType.RESUME);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'enthusiastic'>('professional');
  const [length, setLength] = useState<'concise' | 'standard' | 'detailed'>('standard');
  const [focusAreas, setFocusAreas] = useState<string>('');

  useEffect(() => {
    getSavedJobs();
    getTemplates();
  }, [getSavedJobs, getTemplates]);

  useEffect(() => {
    if (jobIdParam) {
      getJobById(jobIdParam);
    }
  }, [jobIdParam, getJobById]);

  const allJobs = [...savedJobs, ...jobs].filter(
    (job, index, self) => index === self.findIndex((j) => j.id === job.id)
  );

  const filteredTemplates = templates.filter(
    (template) => template.category === documentType || template.category === 'general'
  );

  const handleGenerate = async () => {
    if (!selectedJobId || !user?.id) {
      alert('Please select a job');
      return;
    }

    try {
      const request = {
        userId: user.id,
        jobId: selectedJobId,
        documentType,
        templateId: selectedTemplateId || undefined,
        customizations: {
          tone,
          length,
          focusAreas: focusAreas ? focusAreas.split(',').map(a => a.trim()) : undefined,
        },
      };

      let document;
      if (documentType === DocumentType.RESUME) {
        document = await generateResume(request);
      } else {
        document = await generateCoverLetter(request);
      }

      router.push(`/documents/edit/${document.id}`);
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document. Please try again.');
    }
  };

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

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate Document</h1>
      <p className="text-gray-600 mb-8">
        Create a tailored resume or cover letter for your job application
      </p>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Document Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setDocumentType(DocumentType.RESUME)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                documentType === DocumentType.RESUME
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">Resume</div>
              <div className="text-sm text-gray-600 mt-1">
                AI-powered resume tailored to the job
              </div>
            </button>
            <button
              onClick={() => setDocumentType(DocumentType.COVER_LETTER)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                documentType === DocumentType.COVER_LETTER
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">Cover Letter</div>
              <div className="text-sm text-gray-600 mt-1">
                Personalized cover letter for the position
              </div>
            </button>
          </div>
        </div>

        {/* Job Selection */}
        <div>
          <label htmlFor="job" className="block text-sm font-medium text-gray-700 mb-2">
            Select Job <span className="text-red-500">*</span>
          </label>
          <select
            id="job"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a job...</option>
            {allJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} at {job.company}
              </option>
            ))}
          </select>
          {allJobs.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              No saved jobs found.{' '}
              <button
                onClick={() => router.push('/jobs')}
                className="text-blue-600 hover:text-blue-700"
              >
                Browse jobs
              </button>
            </p>
          )}
        </div>

        {/* Template Selection */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
            Template (Optional)
          </label>
          <select
            id="template"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Default Template</option>
            {filteredTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.description}
              </option>
            ))}
          </select>
        </div>

        {/* Customization Options */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customization</h3>
          
          <div className="space-y-4">
            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['professional', 'casual', 'enthusiastic'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-4 py-2 border rounded-lg capitalize transition-colors ${
                      tone === t
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['concise', 'standard', 'detailed'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLength(l)}
                    className={`px-4 py-2 border rounded-lg capitalize transition-colors ${
                      length === l
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <label htmlFor="focusAreas" className="block text-sm font-medium text-gray-700 mb-2">
                Focus Areas (comma-separated)
              </label>
              <input
                type="text"
                id="focusAreas"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="e.g., leadership, technical skills, project management"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Specify areas you want to emphasize in the document
              </p>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="border-t pt-6">
          <button
            onClick={handleGenerate}
            disabled={!selectedJobId || isGenerating}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              `Generate ${documentType === DocumentType.RESUME ? 'Resume' : 'Cover Letter'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
