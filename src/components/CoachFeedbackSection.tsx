import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Target, Calendar } from 'lucide-react';
import { supabase } from '../services/supabase/config';

interface Props {
  teacherUsername: string;
}

export function CoachFeedbackSection({ teacherUsername }: Props) {
  const { data: notes = [] } = useQuery({
    queryKey: ['coachNotesForTeacher', teacherUsername],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_notes')
        .select('id, title, content, created_at, category')
        .eq('target_type', 'teacher')
        .eq('target_id', teacherUsername)
        .eq('visible_to_teacher', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) return [];
      return data || [];
    },
    enabled: !!teacherUsername
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['coachGoalsForTeacher', teacherUsername],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_goals')
        .select('id, title, description, status, due_date, created_at')
        .eq('target_type', 'teacher')
        .eq('target_id', teacherUsername)
        .eq('visible_to_teacher', true)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) return [];
      return data || [];
    },
    enabled: !!teacherUsername
  });

  if (notes.length === 0 && goals.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-teal-100 p-6">
        <h2 className="text-lg font-oswald font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-600" />
          Feedback from Your Coach
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-teal-500" />
                Goals
              </h3>
              <div className="space-y-2">
                {goals.map((goal: any) => (
                  <div
                    key={goal.id}
                    className={`p-3 rounded-lg border text-sm ${
                      goal.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-teal-50 border-teal-100'
                    }`}
                  >
                    <p className={`font-medium ${goal.status === 'completed' ? 'text-green-800 line-through' : 'text-teal-900'}`}>
                      {goal.title}
                    </p>
                    {goal.description && (
                      <p className="text-xs text-gray-600 mt-1">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {goal.status}
                      </span>
                      {goal.due_date && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(goal.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-500" />
                Notes
              </h3>
              <div className="space-y-2">
                {notes.map((note: any) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                    {note.title && (
                      <p className="font-medium text-gray-900 mb-1">{note.title}</p>
                    )}
                    <p className="text-gray-700">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
