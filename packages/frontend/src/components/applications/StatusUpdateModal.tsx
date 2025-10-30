'use client';

import { useState } from 'react';
import { ApplicationStatus, OfferDetails } from '@/stores/applications.store';

interface StatusUpdateModalProps {
  currentStatus: ApplicationStatus;
  onUpdate: (status: ApplicationStatus, offerDetails?: OfferDetails) => Promise<void>;
  onClose: () => void;
}

const statusOptions = [
  { value: ApplicationStatus.SAVED, label: 'Saved' },
  { value: ApplicationStatus.APPLIED, label: 'Applied' },
  { value: ApplicationStatus.SCREENING, label: 'Screening' },
  { value: ApplicationStatus.INTERVIEW_SCHEDULED, label: 'Interview Scheduled' },
  { value: ApplicationStatus.INTERVIEW_COMPLETED, label: 'Interview Completed' },
  { value: ApplicationStatus.OFFER_RECEIVED, label: 'Offer Received' },
  { value: ApplicationStatus.ACCEPTED, label: 'Accepted' },
  { value: ApplicationStatus.REJECTED, label: 'Rejected' },
  { value: ApplicationStatus.WITHDRAWN, label: 'Withdrawn' },
];

export function StatusUpdateModal({ currentStatus, onUpdate, onClose }: StatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(currentStatus);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerDetails, setOfferDetails] = useState<Partial<OfferDetails>>({
    salary: 0,
    equity: '',
    benefits: [],
  });
  const [benefitInput, setBenefitInput] = useState('');

  const handleStatusChange = (status: ApplicationStatus) => {
    setSelectedStatus(status);
    setShowOfferForm(
      status === ApplicationStatus.OFFER_RECEIVED || status === ApplicationStatus.ACCEPTED
    );
  };

  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      setOfferDetails({
        ...offerDetails,
        benefits: [...(offerDetails.benefits || []), benefitInput.trim()],
      });
      setBenefitInput('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setOfferDetails({
      ...offerDetails,
      benefits: offerDetails.benefits?.filter((_, i) => i !== index) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (showOfferForm && offerDetails.salary) {
        await onUpdate(selectedStatus, offerDetails as OfferDetails);
      } else {
        await onUpdate(selectedStatus);
      }
      onClose();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Update Application Status</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              type="button"
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

          <form onSubmit={handleSubmit}>
            {/* Status Selection */}
            <div className="mb-6">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Offer Details Form */}
            {showOfferForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Offer Details</h3>

                <div className="space-y-4">
                  {/* Salary */}
                  <div>
                    <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                      Salary (Annual) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="salary"
                        value={offerDetails.salary || ''}
                        onChange={(e) =>
                          setOfferDetails({ ...offerDetails, salary: Number(e.target.value) })
                        }
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="100000"
                        required
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Equity */}
                  <div>
                    <label htmlFor="equity" className="block text-sm font-medium text-gray-700 mb-1">
                      Equity (Optional)
                    </label>
                    <input
                      type="text"
                      id="equity"
                      value={offerDetails.equity || ''}
                      onChange={(e) => setOfferDetails({ ...offerDetails, equity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 0.5% or 5000 options"
                    />
                  </div>

                  {/* Benefits */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Benefits
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={benefitInput}
                        onChange={(e) => setBenefitInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddBenefit();
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a benefit"
                      />
                      <button
                        type="button"
                        onClick={handleAddBenefit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Add
                      </button>
                    </div>
                    {offerDetails.benefits && offerDetails.benefits.length > 0 && (
                      <div className="space-y-2">
                        {offerDetails.benefits.map((benefit, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200"
                          >
                            <span className="text-sm text-gray-700">{benefit}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBenefit(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={
                        offerDetails.startDate
                          ? new Date(offerDetails.startDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setOfferDetails({
                          ...offerDetails,
                          startDate: e.target.value ? new Date(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Decision Deadline */}
                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                      Decision Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      id="deadline"
                      value={
                        offerDetails.deadline
                          ? new Date(offerDetails.deadline).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setOfferDetails({
                          ...offerDetails,
                          deadline: e.target.value ? new Date(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Message */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                Are you sure you want to update the status to{' '}
                <span className="font-semibold">
                  {statusOptions.find((opt) => opt.value === selectedStatus)?.label}
                </span>
                ?
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isSubmitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
