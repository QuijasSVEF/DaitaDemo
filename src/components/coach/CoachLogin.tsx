import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, AlertCircle, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { Logo } from '../Logo';
import { signInCoach } from '../../services/supabase/coaches';
import { Coach } from '../../types';
import { DEMO_MODE } from '../../config/demoMode';

interface LoginForm {
  email: string;
  password: string;
}

interface Props {
  onLogin: (coach: Coach) => void;
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
}

export function CoachLogin({ onLogin, isLoading: propIsLoading, error: propError, onBack }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(propError || null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>();

  const handleFormSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);
      const coach = await signInCoach(data.email, data.password);
      if (coach) {
        onLogin(coach);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || propIsLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-svef-gray" />
          </button>
          <div>
            <Logo />
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-6">
          <Shield className="w-6 h-6 text-svef-purple" />
          <h1 className="font-oswald text-2xl font-medium text-svef-gray">
            Coach Portal
          </h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-svef-gray">
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
              disabled={loading}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-svef-gray">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: 'Password is required'
                })}
                className={cn(
                  "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm pr-10",
                  errors.password ? "border-red-300" : "border-gray-300"
                )}
                disabled={loading}
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
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
            className={cn(
              "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-purple",
              loading ? "bg-svef-purple/70 cursor-not-allowed" : "bg-svef-purple hover:bg-svef-purple/90"
            )}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
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
              onClick={() => onLogin({ id: 'dadeac85-46fa-46f3-9a0a-3d10d2d07c85', full_name: 'Demo Coach', email: 'coach@svef.com' } as Coach)}
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
