import { useCallback } from 'react';
import { useToastStore } from '@/components/Toast';
import { getErrorMessage } from '@/lib/api-client';

export function useApiError() {
  const { addToast } = useToastStore();

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const message = customMessage || getErrorMessage(error);
      addToast(message, 'error');
      console.error('API Error:', error);
    },
    [addToast]
  );

  const handleSuccess = useCallback(
    (message: string) => {
      addToast(message, 'success');
    },
    [addToast]
  );

  return { handleError, handleSuccess };
}
