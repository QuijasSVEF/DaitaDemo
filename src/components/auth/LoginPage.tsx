import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { Logo } from '../Logo';

interface LoginForm {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface Props {
  onLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
  userType: 'teacher' | 'admin';
}

export function LoginPage({ onLogin, isLoading, error, onBack, userType }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>();

  const handleFormSubmit = async (data: LoginForm) => {
    await onLogin(data.username, data.password, data.rememberMe);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-svef-beige/30">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6">
            <Logo />
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-svef-purple" />
            <h1 className="font-oswald text-2xl font-medium text-svef-gray">
              {userType === 'admin' ? 'Admin Portal' : 'Teacher Login'}
            </h1>
          </div>
          <p className="font-open-sans text-sm text-svef-brown mt-1">
            Sign in to access your account
          </p>
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
            <label htmlFor="username" className="block font-open-sans text-sm font-medium text-svef-gray">
              {userType === 'admin' ? 'Email Address' : 'Username'}
            </label>
            <input
              type={userType === 'admin' ? 'email' : 'text'}
              {...register('username', {
                required: userType === 'admin' ? 'Email is required' : 'Username is required',
                ...(userType === 'admin' && {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })
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
            <label htmlFor="password" className="block font-open-sans text-sm font-medium text-svef-gray">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                type={showPassword ? 'text' : 'password'}
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
                  "block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm pr-10",
                  errors.password ? "border-red-300" : "border-gray-300"
                )}
                disabled={isLoading}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="h-4 w-4 text-svef-purple focus:ring-svef-purple border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-svef-gray">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-svef-purple hover:text-svef-purple/80">
                Forgot password?
              </a>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full"
          >
            Sign In
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-svef-purple hover:text-svef-purple/80"
            >
              ← Back to Start
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}