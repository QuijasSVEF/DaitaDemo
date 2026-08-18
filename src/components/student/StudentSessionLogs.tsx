import React from 'react';
import { ArrowLeft, Calendar, Star, BookOpen, Target } from 'lucide-react';
import { Logo } from '../Logo';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';

import { formatStudentIdentifier, StudentIdentity } from '../../utils/studentIdentifier';

interface Props {
  studentId: number;
  teacherUsername: string;
  student?: StudentIdentity & { emojiPassword?: string };
  onBack: () => void;
}

interface SessionLog {
  id: string;
  session_date: string;
  topics_practiced: string[];
  self_reflection: string | null;
  confidence_rating: number | null;
  next_steps: string[] | null;
  created_at: string;
}

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Not confident',
  2: 'A little confident',
  3: 'Somewhat confident',
  4: 'Confident',
  5: 'Very confident',
};

const CONFIDENCE_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-green-100 text-green-700',
  5: 'bg-emerald-100 text-emerald-700',
};

export function StudentSessionLogs({ studentId, teacherUsername, student, onBack }: Props) {
  const identifier = student
    ? formatStudentIdentifier({ ...student, emoji: student.emojiPassword || student.emoji })
    : `Student #${studentId}`;
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['studentSessionLogs', studentId, teacherUsername],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_session_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('teacher_username', teacherUsername)
        .order('session_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as SessionLog[];
    },
  });

  return (
    <div className="min-h-screen bg-svef-beige/30">
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-svef-gray" />
          </button>
          <Logo />
          <div className="ml-4 flex-1">
            <h1 className="font-oswald text-xl font-medium text-svef-gray">
              My Session History
            </h1>
            <p className="text-sm text-svef-gray">{identifier}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-svef-purple mx-auto" />
            <p className="mt-4 text-svef-gray">Loading your sessions...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Session Logs Yet
            </h3>
            <p className="text-gray-600 text-sm">
              After you log a session, it will appear here so you can track your
              progress.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(log.session_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {log.confidence_rating && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                        CONFIDENCE_COLORS[log.confidence_rating] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Star className="w-3 h-3" />
                      {CONFIDENCE_LABELS[log.confidence_rating] || `Level ${log.confidence_rating}`}
                    </span>
                  )}
                </div>

                {log.topics_practiced && log.topics_practiced.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Topics
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {log.topics_practiced.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {log.self_reflection && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 italic">
                      "{log.self_reflection}"
                    </p>
                  </div>
                )}

                {log.next_steps && log.next_steps.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Next Steps
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {log.next_steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-700 flex items-start gap-2"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
