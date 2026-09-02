import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertCircle, CheckCircle, UserCheck, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';

interface Props {
  mentorId: string;
  onClose: () => void;
}

export function AssignMentorToTeacherModal({ mentorId, onClose }: Props) {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: mentor } = useQuery({
    queryKey: ['mentor', mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('college_mentors')
        .select('*')
        .eq('id', mentorId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('username, name, email')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });


  const { data: currentAssignments = [] } = useQuery({
    queryKey: ['mentorAssignments', mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_teacher_assignments')
        .select(`
          id,
          teacher_username,
          assigned_at,
          status,
          notes
        `)
        .eq('mentor_id', mentorId);

      if (error) throw error;
      return data || [];
    }
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacher) {
        throw new Error('Please select a teacher');
      }

      const { error } = await supabase
        .from('mentor_teacher_assignments')
        .insert({
          mentor_id: mentorId,
          teacher_username: selectedTeacher,
          assigned_by: 'admin'
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This mentor is already assigned to this teacher');
        }
        throw error;
      }
    },
    onSuccess: () => {
      setSuccess(true);
      setSelectedTeacher('');
      queryClient.invalidateQueries({ queryKey: ['mentorAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['collegeMentors'] });
      setTimeout(() => setSuccess(false), 2000);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to assign mentor');
    }
  });

  const unassignMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('mentor_teacher_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['collegeMentors'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    assignMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-oswald font-bold text-gray-900">
              Assign Mentor to Teacher
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {mentor && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">{mentor.full_name}</div>
                  <div className="text-sm text-gray-600">{mentor.email}</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Mentor assigned successfully!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Teacher <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a teacher...</option>
                {teachers.map((teacher: any) => (
                  <option key={teacher.username} value={teacher.username}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600">
                The teacher will manage group assignments in their portal.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={assignMutation.isPending || !selectedTeacher}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign to Teacher'}
            </Button>
          </form>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Current Assignments
            </h3>
            {currentAssignments.length === 0 ? (
              <p className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
                This mentor is not currently assigned to any teachers.
              </p>
            ) : (
              <div className="space-y-3">
                {currentAssignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        Teacher: {assignment.teacher_username}
                      </div>
                      <div className="text-xs text-gray-500">
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </div>
                      {assignment.status === 'inactive' && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Remove this assignment?')) {
                          unassignMutation.mutate(assignment.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Remove assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
