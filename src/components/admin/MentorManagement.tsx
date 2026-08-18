import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Lock, Unlock, Trash2, Search, UserPlus, FileText, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { CreateMentorModal } from './CreateMentorModal';
import { BulkMentorImport } from './BulkMentorImport';
import { AssignMentorToTeacherModal } from './AssignMentorToTeacherModal';

interface PasswordState {
  password?: string;
  info?: string;
  isEditing?: boolean;
  newPassword?: string;
}

export function MentorManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [passwordData, setPasswordData] = useState<{[key: string]: PasswordState}>({});
  const queryClient = useQueryClient();

  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ['collegeMentors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('college_mentors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const toggleLockMutation = useMutation({
    mutationFn: async ({ mentorId, locked }: { mentorId: string; locked: boolean }) => {
      const { error } = await supabase
        .from('college_mentors')
        .update({ account_locked: locked, updated_at: new Date().toISOString() })
        .eq('id', mentorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collegeMentors'] });
    }
  });

  const deleteMentorMutation = useMutation({
    mutationFn: async (mentorId: string) => {
      const { error } = await supabase
        .from('college_mentors')
        .delete()
        .eq('id', mentorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collegeMentors'] });
    }
  });

  const handlePasswordVisibility = async (mentorId: string) => {
    try {
      const existingData = passwordData[mentorId];
      if (existingData?.isEditing) {
        setShowPassword(prev => ({ ...prev, [mentorId]: !prev[mentorId] }));
        return;
      }

      if (showPassword[mentorId]) {
        setShowPassword(prev => ({ ...prev, [mentorId]: false }));
        return;
      }

      const { data, error: rpcError } = await supabase
        .rpc('get_college_mentor_password', { p_mentor_id: mentorId });

      if (rpcError) throw rpcError;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result || !result.success) {
        setError('Mentor not found');
        return;
      }

      setPasswordData(prev => ({
        ...prev,
        [mentorId]: {
          password: result.password || '(no password stored)',
          info: result.last_changed ? `Last changed: ${new Date(result.last_changed).toLocaleString()}` : ''
        }
      }));
      setShowPassword(prev => ({ ...prev, [mentorId]: true }));
      setError(null);
    } catch (err) {
      setError('Failed to retrieve password');
    }
  };

  const handleEditPassword = (mentorId: string) => {
    setPasswordData(prev => ({
      ...prev,
      [mentorId]: {
        ...prev[mentorId],
        isEditing: true,
        newPassword: ''
      }
    }));
  };

  const handleSavePassword = async (mentorId: string) => {
    try {
      setError(null);
      const newPassword = passwordData[mentorId]?.newPassword;
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

      const { data, error: rpcError } = await supabase.rpc('update_college_mentor_password', {
        p_mentor_id: mentorId,
        p_new_password: newPassword
      });

      if (rpcError) throw rpcError;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || 'Failed to update password');

      setPasswordData(prev => ({
        ...prev,
        [mentorId]: {
          password: newPassword,
          isEditing: false,
          info: `Password changed: ${new Date().toLocaleString()}`
        }
      }));

      alert('Password updated successfully');
      queryClient.invalidateQueries({ queryKey: ['collegeMentors'] });
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    }
  };

  const handleResetPassword = async (mentorId: string, mentorName: string) => {
    if (!confirm(`Reset password for ${mentorName}? This will generate a new temporary password.`)) {
      return;
    }
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('reset_college_mentor_password', { p_mentor_id: mentorId });

      if (rpcError) throw rpcError;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || 'Failed to reset password');

      setPasswordData(prev => ({
        ...prev,
        [mentorId]: {
          password: result.temp_password,
          isEditing: false,
          info: `Password reset: ${new Date().toLocaleString()}`
        }
      }));
      setShowPassword(prev => ({ ...prev, [mentorId]: true }));
      alert(`Password reset successful.\nNew temporary password: ${result.temp_password}\n\nMake sure to copy this password!`);
      queryClient.invalidateQueries({ queryKey: ['collegeMentors'] });
    } catch (err: any) {
      setError(err?.message || 'Failed to reset mentor password');
    }
  };

  const filteredMentors = mentors.filter(mentor =>
    mentor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.university?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-oswald font-medium text-svef-gray">
            College Mentor Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage college mentor accounts and permissions
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => setShowBulkImport(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Mentor</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-red-600">
              <span className="text-sm">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <span className="text-xs">Dismiss</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search mentors by name, email, or university..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading mentors...</span>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No mentors found' : 'No College Mentors'}
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms' : 'Click "Create Mentor" to add the first college mentor'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mentor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  University
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMentors.map((mentor) => (
                <tr key={mentor.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{mentor.full_name}</div>
                      {mentor.major && (
                        <div className="text-sm text-gray-500">{mentor.major}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {mentor.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {mentor.university || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`
                        inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full
                        ${mentor.account_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      `}>
                        {mentor.account_status}
                      </span>
                      {mentor.account_locked && (
                        <span className="inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {mentor.last_login
                      ? new Date(mentor.last_login).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMentorId(mentor.id);
                          setShowAssignModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Assign to teacher"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePasswordVisibility(mentor.id)}
                        className="text-gray-600 hover:text-gray-900 p-1 relative"
                        title="View/edit password"
                      >
                        <div className="relative flex items-center">
                          {showPassword[mentor.id] ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              <div className="absolute right-6 top-0 z-50 bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[200px]">
                                {passwordData[mentor.id]?.isEditing ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={passwordData[mentor.id]?.newPassword || ''}
                                      onChange={(e) => setPasswordData(prev => ({
                                        ...prev,
                                        [mentor.id]: {
                                          ...prev[mentor.id],
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
                                        handleSavePassword(mentor.id);
                                      }}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-sm font-mono">{passwordData[mentor.id]?.password}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPassword(mentor.id);
                                      }}
                                      className="text-blue-600 hover:text-blue-700 text-sm ml-2"
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}
                                {passwordData[mentor.id]?.info && (
                                  <span className="block text-xs text-gray-500 mt-1">{passwordData[mentor.id]?.info}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => handleResetPassword(mentor.id, mentor.full_name)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Reset password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleLockMutation.mutate({
                          mentorId: mentor.id,
                          locked: !mentor.account_locked
                        })}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title={mentor.account_locked ? 'Unlock account' : 'Lock account'}
                      >
                        {mentor.account_locked ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${mentor.full_name}? This action cannot be undone.`)) {
                            deleteMentorMutation.mutate(mentor.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete mentor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateMentorModal onClose={() => setShowCreateModal(false)} />
      )}

      <BulkMentorImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {
          setShowBulkImport(false);
          queryClient.invalidateQueries({ queryKey: ['collegeMentors'] });
        }}
      />

      {showAssignModal && selectedMentorId && (
        <AssignMentorToTeacherModal
          mentorId={selectedMentorId}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedMentorId(null);
          }}
        />
      )}
    </div>
  );
}
