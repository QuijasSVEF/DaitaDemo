import React, { useState } from 'react';
import { Lock, Unlock, RefreshCw, Trash2, AlertCircle, Eye, EyeOff, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { FormField } from '../forms/FormField';
import { useEffect } from 'react';
import { cn } from '../../utils/cn';

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface TeacherAccount {
  username: string;
  name: string;
  email: string;
  full_name: string;
  account_locked: boolean;
  temp_password: boolean;
  last_login: string | null;
  district_id?: string;
  district_name?: string;
  district_code?: string;
}

export function TeacherList() {
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [persistedPasswords, setPersistedPasswords] = useState<{[key: string]: {
    timestamp: number;
    data: {
      password?: string;
      info?: string;
      isEditing?: boolean;
    };
  }}>({});
  const [passwordData, setPasswordData] = useState<{[key: string]: {
    password?: string;
    info?: string;
    isEditing?: boolean;
    newPassword?: string;
  }}>({});

  // Load persisted password data on mount
  useEffect(() => {
    const stored = localStorage.getItem('teacherPasswordData');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only restore data less than 5 minutes old
      const filtered = Object.entries(parsed).reduce((acc, [key, value]: [string, any]) => {
        if (Date.now() - value.timestamp < 5 * 60 * 1000) {
          acc[key] = value.data;
        }
        return acc;
      }, {} as {[key: string]: any});
      setPasswordData(filtered);
    }
  }, []);

  // Persist password data on change
  useEffect(() => {
    const toStore = Object.entries(passwordData).reduce((acc, [key, value]) => {
      acc[key] = {
        timestamp: Date.now(),
        data: value
      };
      return acc;
    }, {} as {[key: string]: any});
    localStorage.setItem('teacherPasswordData', JSON.stringify(toStore));
  }, [passwordData]);

  // Fetch districts that have at least one teacher assigned
  const { data: districts = [] } = useQuery({
    queryKey: ['districts-with-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('district_id, school_districts!inner(id, name, code)')
        .not('district_id', 'is', null);

      if (error) throw error;

      const seen = new Map<string, { id: string; name: string; code: string }>();
      for (const row of data || []) {
        const d = row.school_districts as any;
        if (d && !seen.has(d.id)) {
          seen.set(d.id, { id: d.id, name: d.name, code: d.code });
        }
      }
      return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  const { data: teachers = [], isLoading, refetch } = useQuery({
    queryKey: ['teacherList', page, pageSize, debouncedSearchTerm, sortConfig.field, sortConfig.direction, selectedDistrict],
    queryFn: async () => {
      // Only search if there is a search term
      const searchTermLower = debouncedSearchTerm?.trim().toLowerCase() || '';
      
      const { data, error } = await supabase.rpc('get_teacher_list', {
        p_search: searchTermLower || null,
        p_page: page,
        p_page_size: pageSize,
        p_district_id: selectedDistrict === 'all' ? null : selectedDistrict,
        p_sort_by: sortConfig.field,
        p_sort_dir: sortConfig.direction
      });
      if (error) throw error;
      
      // Update total count
      setTotalTeachers(data?.total || 0);
      
      return data?.data || [];
    },
    keepPreviousData: true
  });

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, selectedDistrict]);

  const handleSort = (field: string) => {
    if (field === sortConfig.field) {
      setSortConfig(prev => ({
        ...prev,
        direction: prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setSortConfig({
        field,
        direction: 'asc'
      });
    }
  };

  const handleLockAccount = async (username: string, locked: boolean) => {
    try {
      const { error } = await supabase.rpc('update_teacher_status', {
        p_username: username.trim(),
        p_account_status: locked ? 'locked' : 'active' 
      });

      if (error) throw error;
      
      // Show feedback to user
      alert(locked ? 'Account locked successfully' : 'Account unlocked successfully');
      
      refetch();
    } catch (error) {
      console.error('Error toggling account lock:', error);
      setError(error instanceof Error ? error.message : 'Failed to update account status');
    }
  };

  const handleResetPassword = async (username: string) => {
    try {
      setError(null);
      const { data, error } = await supabase.rpc('reset_teacher_password', {
        p_username: username
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to reset password');
      }

      // Show temporary password in a more visible way
      const message = `Password has been reset.\nTemporary password: ${data.temp_password}\n\nMake sure to copy this password!`;
      alert(message);

      // Update password data state
      setPasswordData(prev => ({
        ...prev,
        [username]: {
          ...prev[username],
          password: data.temp_password,
          info: `Password reset: ${new Date().toLocaleString()}`
        }
      }));

      refetch();
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password');
    }
  };

  const handleDeleteAccount = async (username: string) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);

      // First, get all quiz templates for this teacher
      const { data: templates, error: templatesError } = await supabase
        .from('quiz_templates')
        .select('id')
        .eq('teacher_username', username);

      if (templatesError) throw templatesError;

      // If there are templates, delete their questions first
      if (templates && templates.length > 0) {
        const templateIds = templates.map(t => t.id);
        
        // Delete all quiz questions for these templates
        const { error: questionsError } = await supabase
          .from('quiz_questions')
          .delete()
          .in('template_id', templateIds);

        if (questionsError) throw questionsError;
      }

      // Now we can safely delete the teacher account
      const { error: deleteError } = await supabase.rpc('delete_teacher_account', {
        p_username: username
      });

      if (deleteError) throw deleteError;

      refetch();
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
    }
  };

  const handlePasswordVisibility = async (username: string) => {
    try {
      // Toggle visibility without closing if editing
      const existingData = passwordData[username];
      if (existingData?.isEditing) {
        setShowPassword(prev => ({
          ...prev,
          [username]: !prev[username]
        }));
        return;
      }
      
      // Use cached data if available and less than 5 minutes old
      const stored = localStorage.getItem('teacherPasswordData');
      if (stored) {
        const parsed = JSON.parse(stored);
        const cachedData = parsed[username];
        if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
          setPasswordData(prev => ({
            ...prev,
            [username]: cachedData.data
          }));
          setShowPassword(prev => ({
            ...prev,
            [username]: !prev[username]
          }));
          return;
        }
      }

      // Get actual password
      const { data, error } = await supabase.rpc('get_teacher_password', {
        p_username: username
      });

      if (error) throw error;

      if (data?.password) {
        setPasswordData(prev => ({
          ...prev,
          [username]: {
            ...prev[username],
            password: data.password,
            info: `Last changed: ${new Date(data.last_changed).toLocaleString()}`
          }
        }));
      }

      setShowPassword(prev => ({
        ...prev,
        [username]: !prev[username]
      }));
    } catch (error) {
      console.error('Error handling password visibility:', error);
      setError('Failed to access password information');
    }
  };

  const handleEditPassword = (username: string) => {
    setPasswordData(prev => ({
      ...prev,
      [username]: {
        ...prev[username],
        isEditing: true,
        newPassword: ''
      }
    }));
  };

  const handleSavePassword = async (username: string) => {
    try {
      setError(null);
      const newPassword = passwordData[username]?.newPassword;
      if (!newPassword?.trim()) {
        setError('Password cannot be empty');
        return;
      }

      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      // Regular expression to check password complexity
      const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
      if (!passwordRegex.test(newPassword)) {
        setError('Password must contain at least one uppercase letter, one number, and one special character');
        return;
      }

      const { data, error } = await supabase.rpc('update_teacher_password', {
        p_username: username,
        p_new_password: newPassword,
        p_temp_password: false
      });

      if (error) {
        console.error('Error updating password:', error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to update password');
      }

      setPasswordData(prev => ({
        ...prev,
        [username]: {
          ...prev[username],
          isEditing: false,
          password: newPassword,
          info: `Password changed: ${new Date().toLocaleString()}`
        }
      }));

      // Refresh the teacher list to get updated status
      refetch();

      // Show success message
      alert('Password updated successfully');

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update password');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4 md:p-6 lg:p-8">
        <div className="h-12 bg-gray-200 rounded-lg mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 flex">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter name, username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchTerm('');
                  setDebouncedSearchTerm('');
                  refetch();
                }
                if (e.key === 'Enter') {
                  setDebouncedSearchTerm(searchTerm.trim());
                  refetch();
                }
              }}
              className="w-full pl-10 pr-4 py-2 sm:py-3 text-sm border border-gray-300 rounded-l-lg shadow-sm focus:ring-2 focus:ring-svef-purple focus:border-svef-purple"
              aria-label="Search teachers"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="hidden sm:block w-40 lg:w-52 border-y border-gray-300 shadow-sm text-sm focus:border-svef-purple focus:ring-svef-purple"
          >
            <option value="all">All Districts</option>
            {districts.map(district => (
              <option key={district.id} value={district.id}>
                {district.name} ({district.code})
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            onClick={() => {
              setDebouncedSearchTerm(searchTerm.trim());
              refetch();
            }}
            className="!w-auto rounded-l-none border-l-0 whitespace-nowrap px-5"
          >
            Search
          </Button>
        </div>
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="sm:hidden w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-svef-purple focus:ring-svef-purple"
        >
          <option value="all">All Districts</option>
          {districts.map(district => (
            <option key={district.id} value={district.id}>
              {district.name} ({district.code})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {!teachers || teachers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
          <p className="text-svef-gray text-lg">No teachers found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="w-[22%] sm:w-[18%] px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                  aria-sort={sortConfig.field === 'name' ? sortConfig.direction : undefined}
                >
                  Name
                  {sortConfig.field === 'name' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="w-[20%] sm:w-[15%] px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden sm:table-cell"
                  onClick={() => handleSort('username')}
                  aria-sort={sortConfig.field === 'username' ? sortConfig.direction : undefined}
                >
                  Username
                  {sortConfig.field === 'username' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="w-[20%] px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden lg:table-cell"
                  onClick={() => handleSort('email')}
                  aria-sort={sortConfig.field === 'email' ? sortConfig.direction : undefined}
                >
                  Email
                  {sortConfig.field === 'email' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="w-[22%] sm:w-[15%] px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                  onClick={() => handleSort('district_name')}
                  aria-sort={sortConfig.field === 'district_name' ? sortConfig.direction : undefined}
                >
                  District
                  {sortConfig.field === 'district_name' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="w-[15%] sm:w-[8%] px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('last_login')}
                  aria-sort={sortConfig.field === 'last_login' ? sortConfig.direction : undefined}
                >
                  Last Login
                  {sortConfig.field === 'last_login' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="w-[43%] sm:w-[28%] md:w-[22%] lg:w-[18%] px-2 sm:px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <tr key={teacher.username} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-2 sm:px-3 py-3">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {teacher.name}
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-3 hidden sm:table-cell">
                    <div className="text-sm text-gray-500 truncate">
                      {teacher.username}
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-3 hidden lg:table-cell">
                    <div className="text-sm text-gray-500 truncate">
                      {teacher.email}
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-3 hidden md:table-cell">
                    <select
                      value={teacher.district_id || ''}
                      onChange={async (e) => {
                        setError(null);
                        const { error } = await supabase.rpc('update_teacher_district', {
                          p_username: teacher.username,
                          p_district_id: e.target.value || null
                        });
                        if (error) {
                          console.error('Error updating district:', error);
                          setError('Failed to update district: ' + error.message);
                        } else {
                          refetch();
                        }
                      }}
                      className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                    >
                      <option value="">No District</option>
                      {districts.map(district => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 sm:px-3 py-3">
                    <div className="text-sm text-gray-500 truncate">
                      {teacher.last_login ? new Date(teacher.last_login).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="secondary"
                        onClick={() => handlePasswordVisibility(teacher.username)}
                        className="text-gray-600 hover:text-gray-900 relative !p-1.5"
                        aria-label="View password"
                      >
                        <div className="relative flex items-center">
                          {showPassword[teacher.username] ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              <div className="absolute right-6 top-0 z-50 bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[200px]">
                                {passwordData[teacher.username]?.isEditing ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={passwordData[teacher.username]?.newPassword || ''}
                                      onChange={(e) => setPasswordData(prev => ({
                                        ...prev,
                                        [teacher.username]: {
                                          ...prev[teacher.username],
                                          newPassword: e.target.value
                                        }
                                      }))}
                                      onClick={(e) => e.stopPropagation()}
                                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                                      placeholder="New password"
                                      minLength={8}
                                      required
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSavePassword(teacher.username);
                                      }}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-sm">{passwordData[teacher.username]?.password}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPassword(teacher.username);
                                      }}
                                      className="text-blue-600 hover:text-blue-700 text-sm"
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}
                                <span className="text-xs text-gray-500">{passwordData[teacher.username]?.info}</span>
                              </div>
                            </>
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </div>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleLockAccount(teacher.username, !teacher.account_locked)}
                        aria-label={teacher.account_locked ? "Unlock account" : "Lock account"}
                        className={cn(
                          "transition-colors !p-1.5",
                          teacher.account_locked
                            ? "text-red-600 hover:text-red-700"
                            : "text-green-600 hover:text-green-700"
                        )}
                      >
                        {teacher.account_locked ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleResetPassword(teacher.username)}
                        aria-label="Reset password"
                        className="text-blue-600 hover:text-blue-700 !p-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDeleteAccount(teacher.username)}
                        aria-label="Delete account"
                        className="text-red-600 hover:text-red-700 !p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {teachers?.length || 0} of {totalTeachers} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="min-w-[70px] sm:min-w-[100px] text-sm"
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!teachers?.length || teachers.length < pageSize || (page * pageSize >= totalTeachers)}
                  className="min-w-[70px] sm:min-w-[100px] text-sm"
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}