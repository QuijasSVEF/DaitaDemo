import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { FormField } from './forms/FormField';
import { Button } from './ui/Button';
import { Logo } from './Logo';
import { cn } from '../utils/cn';
import { signIn } from '../services/auth';
import { DEMO_MODE } from '../config/demoMode';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface Props {
  onLogin: (teacher: { username: string; name: string }) => void;
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
}

export function TeacherLogin({ onLogin, isLoading: propIsLoading, error: propError, onBack }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(propError || null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>();

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      const teacherData = await signIn(data.email, data.password);
      if (teacherData) {
        onLogin(teacherData);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-svef-gray" />
            </button>
            <div>
              <Logo />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="font-oswald text-2xl font-medium text-svef-gray">Welcome to D[ai]TA</h1>
            <p className="font-open-sans text-sm text-svef-brown mt-1">Enter your email to continue</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <FormField label="Email" error={errors.email?.message}>
              <input
                type="email"
                {...register('email', {
                  required: 'Please enter your email address',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className={cn(
                  "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-green focus:border-svef-green",
                  errors.email ? "border-red-300" : "border-gray-300"
                )}
                disabled={isLoading || propIsLoading}
                autoComplete="email"
                placeholder="Enter your email address"
              />
            </FormField>

            <FormField label="Password" error={errors.password?.message}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Please enter your password'
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-green focus:border-svef-green pr-10",
                    errors.password ? "border-red-300" : "border-gray-300"
                  )}
                  disabled={isLoading || propIsLoading}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="h-4 w-4 text-svef-green focus:ring-svef-green border-gray-300 rounded"
                  disabled={isLoading || propIsLoading}
                />
                <label className="ml-2 block text-sm text-svef-gray">
                  Remember me
                </label>
              </div>
            </div>

            <Button 
              type="submit" 
              isLoading={isLoading || propIsLoading}
            >
              {isLoading || propIsLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {DEMO_MODE && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => onLogin({ username: 'quijas', name: 'Demo Teacher' })}
                className="w-full py-2.5 px-4 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors"
              >
                Demo Login
              </button>
            </div>
          )}
        </div>
    </div>
  );
}