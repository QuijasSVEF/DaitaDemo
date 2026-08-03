import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Plus, Search, AlertCircle, Users, Trash2, Lock, Unlock, FileText, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { deleteCoach, toggleCoachLock } from '../../services/supabase/coaches';
import { Button } from '../ui/Button';
import { CreateCoachModal } from './CreateCoachModal';
import { BulkCoachImport } from './BulkCoachImport';
import { AssignTeacherToCoachModal } from './AssignTeacherToCoachModal';
import { cn } from '../../utils/cn';

interface CoachRecord {
  id: string;
  email: string;
  fullName: string;
  lastLogin: string | null;
  accountLocked: boolean;
  assignedTeachers: number;
}

interface PasswordState {
  password?: string;
  info?: string;
  isEditing?: boolean;
  newPassword?: string;
}

export function CoachManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [assignModalCoach, setAssignModalCoach] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [passwordData, setPasswordData] = useState<{[key: string]: PasswordState}>({});

  const { data: coaches = [], isLoading, refetch } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data: coachData, error: coachError } = await supabase.rpc('get_coaches_with_assignments');
      if (coachError) throw coachError;

      return coachData.map((coach: any) => ({
        id: coach.coach_id,
        email: coach.coach_email,
        fullName: coach.coach_name,
        lastLogin: coach.last_login,
        accountLocked: coach.account_locked,
        assignedTeachers: coach.assigned_teachers_count || 0
      }));
    }
  });

  const filteredCoaches = coaches.filter((coach: CoachRecord) =>
    coach.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteCoach = async (coachId: string) => {
    if (!confirm('Are you sure you want to delete this coach? All teacher assignments will be removed.')) {
      return;
    }
    try {
      await deleteCoach(coachId);
      refetch();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete coach');
    }
  };

  const handleToggleLock = async (coachId: string, currentlyLocked: boolean) => {
    try {
      await toggleCoachLock(coachId, !currentlyLocked);
      refetch();
    } catch (err: any) {
      setError(err?.message || 'Failed to update coach status');
    }
  };

  const handlePasswordVisibility = async (coachId: string) => {
    try {
      const existingData = passwordData[coachId];
      if (existingData?.isEditing) {
        setShowPassword(prev => ({ ...prev, [coachId]: !prev[coachId] }));
        return;
      }

      if (showPassword[coachId]) {
        setShowPassword(prev => ({ ...prev, [coachId]: false }));
        return;
      }

      const { data, error: rpcError } = await supabase
        .rpc('get_coach_password', { p_coach_id: coachId });

      if (rpcError) throw rpcError;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        setError('Coach not found');
        return;
      }

      const { password, is_temp, last_changed } = result;

      setPasswordData(prev => ({
        ...prev,
        [coachId]: {
          password: password || '(no password set)',
          info: last_changed ? `Last changed: ${new Date(last_changed).toLocaleString()}` : (is_temp ? 'Temporary password' : '')
        }
      }));
      setShowPassword(prev => ({ ...prev, [coachId]: true }));
      setError(null);
    } catch (err) {
      setError('Failed to retrieve password');
    }
  };

  const handleEditPassword = (coachId: string) => {
    setPasswordData(prev => ({
      ...prev,
      [coachId]: {
        ...prev[coachId],
        isEditing: true,
        newPassword: ''
      }
    }));
  };

  const handleSavePassword = async (coachId: string) => {
    try {
      setError(null);
      const newPassword = passwordData[coachId]?.newPassword;
      if (!newPassword?.trim()) {
        setError('Password cannot be empty');
        return;
      }

      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
      if (!passwordRegex.test(newPassword)) {
        setError('Password must contain at least one uppercase letter, one number, and one special character');
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('update_coach_password', {
        p_coach_id: coachId,
        p_new_password: newPassword,
        p_is_temp: false
      });

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.message || 'Failed to update password');

      setPasswordData(prev => ({
        ...prev,
        [coachId]: {
          password: newPassword,
          isEditing: false,
          info: `Password changed: ${new Date().toLocaleString()}`
        }
      }));

      alert('Password updated successfully');
      refetch();
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    }
  };

  const handleResetPassword = async (coachId: string, coachName: string) => {
    if (!confirm(`Reset password for ${coachName}? This will generate a new temporary password.`)) {
      return;
    }
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('reset_coach_password', { p_coach_id: coachId });

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.message || 'Failed to reset password');

      setPasswordData(prev => ({
        ...prev,
        [coachId]: {
          password: data.temp_password,
          isEditing: false,
          info: `Password reset: ${new Date().toLocaleString()}`
        }
      }));
      setShowPassword(prev => ({ ...prev, [coachId]: true }));
      alert(`Password reset successful.\nNew temporary password: ${data.temp_password}\n\nMake sure to copy this password!`);
      refetch();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-svef-purple" />
          <h2 className="font-oswald text-2xl font-medium text-svef-gray">
            Coaches
          </h2>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => setIsBulkImportOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Coach
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <span className="text-xs">Dismiss</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search coaches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-svef-purple focus:border-svef-purple"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-svef-purple" />
          </div>
        ) : filteredCoaches.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchTerm ? 'No coaches match your search' : 'No coaches created yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Teachers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCoaches.map((coach: CoachRecord) => (
                  <tr key={coach.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {coach.fullName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{coach.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setAssignModalCoach({ id: coach.id, name: coach.fullName })}
                        className="inline-flex items-center gap-1.5 text-sm text-svef-purple hover:text-svef-purple/80 font-medium transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        {coach.assignedTeachers} teacher{coach.assignedTeachers !== 1 ? 's' : ''}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {coach.lastLogin ? new Date(coach.lastLogin).toLocaleString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
                        coach.accountLocked
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      )}>
                        {coach.accountLocked ? 'Locked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="secondary"
                          onClick={() => setAssignModalCoach({ id: coach.id, name: coach.fullName })}
                          title="Assign teachers"
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handlePasswordVisibility(coach.id)}
                          className="text-gray-600 hover:text-gray-900 relative"
                          title="View/edit password"
                        >
                          <div className="relative flex items-center space-x-2">
                            {showPassword[coach.id] ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                <div className="absolute right-6 top-0 z-50 bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[200px]">
                                  {passwordData[coach.id]?.isEditing ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={passwordData[coach.id]?.newPassword || ''}
                                        onChange={(e) => setPasswordData(prev => ({
                                          ...prev,
                                          [coach.id]: {
                                            ...prev[coach.id],
                                            newPassword: e.target.value
                                          }
                                        }))}
                                        onClick={(e) => e.stopPropagation()}
                                        className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                                        placeholder="New password"
                                        minLength={8}
                                      />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSavePassword(coach.id);
                                        }}
                                        className="text-green-600 hover:text-green-700"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-sm font-mono">{passwordData[coach.id]?.password}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditPassword(coach.id);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-sm ml-2"
                                      >
                                        Edit
                                      </button>
                                    </>
                                  )}
                                  {passwordData[coach.id]?.info && (
                                    <span className="block text-xs text-gray-500 mt-1">{passwordData[coach.id]?.info}</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </div>
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleResetPassword(coach.id, coach.fullName)}
                          title="Reset password"
                        >
                          <RefreshCw className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleToggleLock(coach.id, coach.accountLocked)}
                          title={coach.accountLocked ? 'Unlock account' : 'Lock account'}
                        >
                          {coach.accountLocked ? (
                            <Unlock className="w-4 h-4 text-green-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-amber-600" />
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDeleteCoach(coach.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateCoachModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          refetch();
        }}
      />

      <BulkCoachImport
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          setIsBulkImportOpen(false);
          refetch();
        }}
      />

      {assignModalCoach && (
        <AssignTeacherToCoachModal
          isOpen={true}
          onClose={() => setAssignModalCoach(null)}
          coachId={assignModalCoach.id}
          coachName={assignModalCoach.name}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
