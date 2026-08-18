import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase/config';
import { DEMO_MODE } from '../../config/demoMode';

interface Props {
  onBack: () => void;
  onLogin: (admin: { id: string; email: string }) => void;
}

export function AdminLogin({ onBack, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Call the admin_login RPC function
      const { data: authResult, error: authError } = await supabase.rpc('admin_login', {
        p_email: email.trim().toLowerCase(),
        p_password: password
      });

      if (authError) {
        console.error('Authentication error:', authError);
        throw new Error(authError.message || 'Authentication failed');
      }

      if (!authResult || !authResult.success) {
        const errorMsg = authResult?.message || 'Invalid credentials';
        throw new Error(errorMsg);
      }

      // If we reach here, login was successful
      onLogin({ 
        id: authResult.admin_id, 
        email: email.toLowerCase() 
      });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-medium text-blue-500">
          Admin Login
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <div>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="block w-full px-3 py-2 bg-blue-50 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 bg-blue-50 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={onBack}
                className="px-6 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600"
              >
                {isLoading ? 'Loading...' : 'Sign In'}
              </Button>
            </div>
          </form>

          {DEMO_MODE && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => onLogin({ id: 'demo-admin', email: 'demo@admin.local' })}
                className="w-full py-2.5 px-4 rounded-md text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                Demo Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}