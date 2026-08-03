import React, { useState } from 'react';
import { GraduationCap, ArrowLeft, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase/config';
import { DEMO_MODE } from '../../config/demoMode';

interface Props {
  onBack: () => void;
  onLogin: (mentor: CollegeMentor) => void;
}

export interface CollegeMentor {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  university?: string;
  major?: string;
}

export function MentorLogin({ onBack, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.rpc('authenticate_college_mentor', {
        p_email: email.toLowerCase().trim(),
        p_password: password
      });

      if (authError) {
        throw authError;
      }

      if (!data || data.length === 0) {
        setError('Invalid credentials');
        return;
      }

      const result = data[0];

      if (!result.success) {
        setError(result.message || 'Login failed');
        return;
      }

      const mentorSession = {
        token: `mentor_${result.mentor.id}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ...result.mentor
      };

      localStorage.setItem('mentorSession', JSON.stringify(mentorSession));
      onLogin(result.mentor);
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <GraduationCap className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <h1 className="text-3xl font-oswald font-bold text-center text-gray-900 mb-2">
            College Mentor Portal
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Sign in to access your assigned student groups
          </p>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="your.email@university.edu"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {DEMO_MODE && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => onLogin({ id: '660148c2-bb97-41db-b399-730754809644', email: 'testin@test.org', full_name: 'Demo Mentor' })}
                className="w-full py-2.5 px-4 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 transition-colors"
              >
                Demo Login
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Need help? Contact your program coordinator.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
