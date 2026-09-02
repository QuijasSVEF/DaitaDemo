import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertCircle, Shield, BookOpen } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface SettingsForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  enable2FA?: boolean;
}

export function AdminSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<SettingsForm>();

  const newPassword = watch('newPassword');

  const handleUpdateSettings = async (data: SettingsForm) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Update password
      if (data.newPassword) {
        if (data.newPassword !== data.confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const { error: passwordError } = await supabase.rpc('update_admin_password', {
          p_current_password: data.currentPassword,
          p_new_password: data.newPassword
        });

        if (passwordError) throw passwordError;
      }

      // Update 2FA settings if changed
      if (typeof data.enable2FA !== 'undefined') {
        const { error: twoFactorError } = await supabase.rpc('update_admin_2fa', {
          p_enabled: data.enable2FA,
          p_current_password: data.currentPassword
        });

        if (twoFactorError) throw twoFactorError;
      }

      setSuccess('Settings updated successfully');
      reset();
    } catch (error) {
      console.error('Error updating settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="w-6 h-6 text-svef-purple" />
        <h2 className="text-2xl font-oswald font-medium text-svef-gray">
          Admin Settings
        </h2>
      </div>

      <AssessmentFlowToggle />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleUpdateSettings)} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Change Password
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                {...register('currentPassword', {
                  required: 'Current password is required'
                })}
                className={cn(
                  "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                  errors.currentPassword ? "border-red-300" : "border-gray-300"
                )}
                disabled={isLoading}
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
                className={cn(
                  "mt-1 block w-full rounded-md shadow-sm focus:ring-svef-purple focus:border-svef-purple sm:text-sm",
                  errors.newPassword ? "border-red-300" : "border-gray-300"
                )}
                disabled={isLoading}
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value =>
                    value === newPassword || 'The passwords do not match'
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
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Two-Factor Authentication
          </h3>
          <div className="relative flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                {...register('enable2FA')}
                className="focus:ring-svef-purple h-4 w-4 text-svef-purple border-gray-300 rounded"
                disabled={isLoading}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="enable2FA" className="font-medium text-gray-700">
                Enable Two-Factor Authentication
              </label>
              <p className="text-gray-500">
                Require a verification code when signing in
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            isLoading={isLoading}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

function AssessmentFlowToggle() {
  const [flow, setFlow] = useState<'em_curriculum' | 'legacy'>('em_curriculum');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'assessment_flow_default')
        .maybeSingle();
      if (data?.value === 'legacy' || data?.value === 'em_curriculum') {
        setFlow(data.value);
      }
      setLoading(false);
    })();
  }, []);

  const save = async (next: 'em_curriculum' | 'legacy') => {
    setSaving(true);
    setSavedMsg(null);
    setErrMsg(null);
    try {
      const { error } = await supabase.rpc('set_system_setting', {
        p_key: 'assessment_flow_default',
        p_value: next,
      });
      if (error) throw error;
      setFlow(next);
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(null), 2000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center space-x-2">
        <BookOpen className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-medium text-gray-900">Assessment Creation Flow</h3>
      </div>
      <p className="text-sm text-gray-600">
        Choose whether teachers create assessments from the Elevate Math curriculum (recommended) or from the legacy free-form topic picker.
      </p>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { value: 'em_curriculum', title: 'Elevate Curriculum', desc: 'Level -> Module -> Subtopic cascade. Auto-fills grade, difficulty, and question types.' },
            { value: 'legacy', title: 'Legacy (Free-form)', desc: 'Manual topic, subtopics, grade, and difficulty selection.' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => save(opt.value)}
              className={cn(
                'text-left p-4 rounded-lg border-2 transition-colors',
                flow === opt.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{opt.title}</span>
                {flow === opt.value && (
                  <span className="text-xs font-semibold text-emerald-700 uppercase">Active</span>
                )}
              </div>
              <p className="text-xs text-gray-600">{opt.desc}</p>
            </button>
          ))}
        </div>
      )}
      {savedMsg && <p className="text-sm text-emerald-700">{savedMsg}</p>}
      {errMsg && <p className="text-sm text-red-600">{errMsg}</p>}
    </div>
  );
}