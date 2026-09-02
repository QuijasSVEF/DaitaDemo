import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface CreateCoachForm {
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCoachModal({ isOpen, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<CreateCoachForm>();

  const password = watch('password');

  const handleCreateCoach = async (data: CreateCoachForm) => {
    try {
      setIsLoading(true);
      setError(null);

      if (data.password !== data.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const { error: createError } = await supabase.rpc('create_coach', {
        p_email: data.email,
        p_full_name: data.fullName,
        p_password: data.password
      });

      if (createError) throw createError;

      reset();
      onSuccess();
    } catch (error) {
      console.error('Error creating coach:', error);
      setError(error instanceof Error ? error.message : 'Failed to create coach account');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-oswald font-medium text-svef-gray">
            Create Coach Account
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleCreateCoach)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              className={cn(
                "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                errors.email ? "border-red-300" : "border-gray-300"
              )}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              {...register('fullName', { required: 'Full name is required' })}
              className={cn(
                "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                errors.fullName ? "border-red-300" : "border-gray-300"
              )}
              disabled={isLoading}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                },
                pattern: {
                  value: /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
                  message: 'Password must contain at least one uppercase letter, one number, and one special character'
                }
              })}
              className={cn(
                "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                errors.password ? "border-red-300" : "border-gray-300"
              )}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value =>
                  value === password || 'The passwords do not match'
              })}
              className={cn(
                "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                errors.confirmPassword ? "border-red-300" : "border-gray-300"
              )}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}