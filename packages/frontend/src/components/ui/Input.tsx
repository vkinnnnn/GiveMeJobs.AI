/**
 * Accessible Input Component
 * Provides form inputs with proper ARIA labels and error handling
 */

import { forwardRef, InputHTMLAttributes } from 'react';
import { useFormField } from '@/hooks/useAccessibility';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      description,
      hideLabel = false,
      required,
      className = '',
      ...props
    },
    ref
  ) => {
    const { fieldId, errorId, descriptionId, fieldProps, errorProps, descriptionProps } =
      useFormField({
        error,
        description,
        required,
      });

    return (
      <div className="w-full">
        <label
          htmlFor={fieldId}
          className={`block text-sm font-medium text-gray-700 mb-1 ${
            hideLabel ? 'sr-only' : ''
          }`}
        >
          {label}
          {required && (
            <span className="text-red-600 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>

        {description && (
          <p {...descriptionProps} className="text-sm text-gray-500 mb-2">
            {description}
          </p>
        )}

        <input
          ref={ref}
          {...fieldProps}
          {...props}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
          } ${className}`}
        />

        {error && (
          <p {...errorProps} className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
