import React, { useState } from 'react';
import {
  Calendar, Clock, CheckCircle, ChevronDown, ChevronUp,
  BookOpen, MessageSquare, Users, FileText
} from 'lucide-react';

interface Session {
  id: string;
  session_date: string;
  tutoring_minutes: number;
  used_lesson_plan: boolean;
  resource_used?: string;
  lesson_plan_comments?: string;
  curriculum_feedback?: string;
  attendance_notes?: string;
  timer_minutes?: number;
}

interface Student {
  id: number;
  name: string;
  grade: string;
  emoji_code: string;
}

interface Props {
  sessions: Session[];
  students: Student[];
  groupName: string;
}

export function SessionList({ sessions, students, groupName }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return <p className="text-gray-600 text-sm">No sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.slice(0, 10).map((session) => {
        const isExpanded = expandedId === session.id;
        const resourceLabel = session.resource_used === 'lesson_plan'
          ? 'D[ai]TA Lesson Plan'
          : session.resource_used === 'curriculum'
            ? 'Elevate Math Curriculum'
            : session.used_lesson_plan
              ? 'D[ai]TA Lesson Plan'
              : 'Elevate Math Curriculum';

        return (
          <div key={session.id} className="border border-gray-100 rounded-lg overflow-hidden transition-all">
            <button
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {new Date(session.session_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {session.tutoring_minutes} min
                    </span>
                    <span className={`flex items-center text-xs ${session.used_lesson_plan || session.resource_used === 'lesson_plan' ? 'text-green-600' : 'text-blue-600'}`}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {resourceLabel}
                    </span>
                    {session.timer_minutes != null && session.timer_minutes > 0 && session.timer_minutes !== session.tutoring_minutes && (
                      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Time adjusted
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              }
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">Resource Used</p>
                      <p className="text-sm text-gray-600">{resourceLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">Duration</p>
                      <p className="text-sm text-gray-600">
                        {session.tutoring_minutes} min (self-reported)
                        {session.timer_minutes != null && session.timer_minutes > 0 && (
                          <span className="text-gray-400 ml-1">/ {session.timer_minutes} min (timer)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {students.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Students in Group</p>
                      <div className="flex flex-wrap gap-1.5">
                        {students.map(s => (
                          <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs text-gray-700 border border-gray-200">
                            {s.emoji_code && <span>{s.emoji_code}</span>}
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {session.lesson_plan_comments && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">Lesson Plan Comments</p>
                      <p className="text-sm text-gray-600">{session.lesson_plan_comments}</p>
                    </div>
                  </div>
                )}

                {session.curriculum_feedback && (
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">Curriculum Feedback</p>
                      <p className="text-sm text-gray-600">{session.curriculum_feedback}</p>
                    </div>
                  </div>
                )}

                {session.attendance_notes && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">Attendance Notes</p>
                      <p className="text-sm text-gray-600">{session.attendance_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
