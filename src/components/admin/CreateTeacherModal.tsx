import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../utils/cn';

interface CreateTeacherForm {
  username: string;
  email: string;
  fullName: string;
  password: string;
  districtId: string;
  newDistrictName?: string;
  newDistrictCode?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTeacherModal({ isOpen, onClose, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingNewDistrict, setIsAddingNewDistrict] = useState(false);

  // Fetch districts
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_districts')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateTeacherForm>();

  const selectedDistrict = watch('districtId');

  const handleCreateTeacher = async (data: CreateTeacherForm) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate password complexity
      if (data.password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
      if (!passwordRegex.test(data.password)) {
        setError('Password must contain at least one uppercase letter, one number, and one special character');
        return;
      }

      let districtId: string | null = data.districtId;

      if (data.districtId === 'new' && data.newDistrictName && data.newDistrictCode) {
        const { data: newDistrict, error: districtError } = await supabase.rpc(
          'create_school_district',
          {
            p_name: data.newDistrictName,
            p_code: data.newDistrictCode
          }
        );

        if (districtError) throw districtError;
        if (!newDistrict?.success) throw new Error(newDistrict?.message || 'Failed to create district');
        districtId = newDistrict.district_id;
      }

      if (districtId === 'none' || districtId === 'new' || districtId === '') {
        districtId = null;
      }

      const { data: result, error: createError } = await supabase
        .from('teachers')
        .insert({
          username: data.username.toLowerCase(),
          email: data.email.toLowerCase(),
          name: data.fullName,
          password_hash: data.password,
          temp_password: true,
          plaintext_password: data.password,
          account_status: 'active',
          district_id: districtId
        })
        .select()
        .single();

      if (createError) throw createError;
      
      alert(`Account created successfully!\nPassword: ${data.password}`);

      reset();
      onSuccess();
    } catch (error) {
      console.error('Error creating teacher account:', error);
      setError(error instanceof Error ? error.message : 'Failed to create teacher account');
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
            Create Teacher Account
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <p className="text-sm text-svef-gray mt-1">Fill in the details below</p>
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

        <form onSubmit={handleSubmit(handleCreateTeacher)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              {...register('username', {
                required: 'Username is required',
                pattern: {
                  value: /^[a-zA-Z0-9_-]+$/,
                  message: 'Username can only contain letters, numbers, underscores, and hyphens'
                }
              })}
              className={cn(
                "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                errors.username ? "border-red-300" : "border-gray-300"
              )}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

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
            <label htmlFor="districtId" className="block text-sm font-medium text-gray-700">
              School District
            </label>
            <select
              {...register('districtId', {
                required: 'Please select a district or create a new one'
              })}
              className={cn(
                "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                errors.districtId ? "border-red-300" : "border-gray-300"
              )}
              disabled={isLoading}
              onChange={(e) => {
                if (e.target.value === 'new') {
                  setIsAddingNewDistrict(true);
                } else {
                  setIsAddingNewDistrict(false);
                }
              }}
            >
              <option value="">Select a district...</option>
              <option value="none">No District</option>
              {districts.map(district => (
                <option key={district.id} value={district.id}>
                  {district.name} ({district.code})
                </option>
              ))}
              <option value="new">+ Add New District</option>
            </select>
            {errors.districtId && (
              <p className="mt-1 text-sm text-red-600">{errors.districtId.message}</p>
            )}
          </div>

          {selectedDistrict === 'new' && (
            <>
              <div>
                <label htmlFor="newDistrictName" className="block text-sm font-medium text-gray-700">
                  New District Name
                </label>
                <input
                  type="text"
                  {...register('newDistrictName', {
                    required: 'District name is required'
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                    errors.newDistrictName ? "border-red-300" : "border-gray-300"
                  )}
                  disabled={isLoading}
                />
                {errors.newDistrictName && (
                  <p className="mt-1 text-sm text-red-600">{errors.newDistrictName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="newDistrictCode" className="block text-sm font-medium text-gray-700">
                  District Code
                </label>
                <input
                  type="text"
                  {...register('newDistrictCode', {
                    required: 'District code is required'
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                    errors.newDistrictCode ? "border-red-300" : "border-gray-300"
                  )}
                  disabled={isLoading}
                />
                {errors.newDistrictCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.newDistrictCode.message}</p>
                )}
              </div>
            </>
          )}

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