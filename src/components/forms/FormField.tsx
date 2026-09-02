import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="block font-open-sans text-sm font-medium text-svef-gray">
        {label}
      </label>
      {children}
      {error && (
        <div className="mt-1 flex items-center text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}