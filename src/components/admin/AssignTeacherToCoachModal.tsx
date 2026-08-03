import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { assignTeacherToCoach, unassignTeacherFromCoach } from '../../services/supabase/coaches';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface TeacherRecord {
  username: string;
  name: string;
  email: string;
  isAssigned: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  coachName: string;
  onSuccess: () => void;
}

export function AssignTeacherToCoachModal({ isOpen, onClose, coachId, coachName, onSuccess }: Props) {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingTeacher, setProcessingTeacher] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
    }
  }, [isOpen, coachId]);

  const loadTeachers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [teachersRes, assignmentsRes] = await Promise.all([
        supabase
          .from('teachers')
          .select('username, name, email')
          .eq('account_status', 'active')
          .eq('account_locked', false)
          .order('name'),
        supabase
          .from('coach_teacher_assignments')
          .select('teacher_username')
          .eq('coach_id', coachId)
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      const assignedUsernames = new Set(
        (assignmentsRes.data || []).map((a: any) => a.teacher_username)
      );

      setTeachers(
        (teachersRes.data || []).map((t: any) => ({
          username: t.username,
          name: t.name || t.username,
          email: t.email || '',
          isAssigned: assignedUsernames.has(t.username)
        }))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (teacher: TeacherRecord) => {
    setProcessingTeacher(teacher.username);
    setError(null);
    try {
      if (teacher.isAssigned) {
        await unassignTeacherFromCoach(coachId, teacher.username);
      } else {
        await assignTeacherToCoach(coachId, teacher.username);
      }
      setTeachers(prev =>
        prev.map(t =>
          t.username === teacher.username
            ? { ...t, isAssigned: !t.isAssigned }
            : t
        )
      );
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to update assignment');
    } finally {
      setProcessingTeacher(null);
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const assignedCount = teachers.filter(t => t.isAssigned).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Assign Teachers</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {coachName} -- {assignedCount} teacher{assignedCount !== 1 ? 's' : ''} assigned
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search teachers by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-svef-purple focus:border-svef-purple text-sm"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-svef-purple" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                {searchTerm ? 'No teachers match your search' : 'No active teachers found'}
              </div>
            ) : (
              filteredTeachers.map(teacher => (
                <div
                  key={teacher.username}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-colors",
                    teacher.isAssigned ? "bg-green-50 border border-green-100" : "hover:bg-gray-50 border border-transparent"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {teacher.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      @{teacher.username} {teacher.email && `-- ${teacher.email}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(teacher)}
                    disabled={processingTeacher === teacher.username}
                    className={cn(
                      "ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-shrink-0",
                      teacher.isAssigned
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                        : "bg-gray-100 text-gray-600 hover:bg-svef-purple hover:text-white",
                      processingTeacher === teacher.username && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {processingTeacher === teacher.username ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : teacher.isAssigned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Assigned
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
