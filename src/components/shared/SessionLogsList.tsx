import React from 'react';
import { Calendar, Star, BookOpen, MessageSquare } from 'lucide-react';

interface SessionLog {
  id: string;
  session_date: string;
  topics_practiced: string[];
  self_reflection: string | null;
  confidence_rating: number | null;
  created_at: string;
}

interface Props {
  logs: SessionLog[];
  isLoading?: boolean;
  compact?: boolean;
  emptyMessage?: string;
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

export function SessionLogsList({ logs, isLoading, compact, emptyMessage }: Props) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{emptyMessage || 'No session logs yet.'}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-xs font-medium">
                {new Date(log.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <div className="flex flex-wrap gap-1">
                {(log.topics_practiced || []).slice(0, 2).map((topic, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {topic}
                  </span>
                ))}
                {(log.topics_practiced || []).length > 2 && (
                  <span className="text-xs text-gray-400">+{log.topics_practiced.length - 2}</span>
                )}
              </div>
            </div>
            {log.confidence_rating && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_COLORS[log.confidence_rating] || 'bg-gray-100 text-gray-600'}`}>
                {log.confidence_rating}/5
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="border border-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                CONFIDENCE_COLORS[log.confidence_rating] || 'bg-gray-100 text-gray-600'
              }`}>
                <Star className="w-3 h-3" />
                {CONFIDENCE_LABELS[log.confidence_rating] || `Level ${log.confidence_rating}`}
              </span>
            )}
          </div>

          {log.topics_practiced && log.topics_practiced.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Topics</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {log.topics_practiced.map((topic, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {log.self_reflection && (
            <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700 italic">"{log.self_reflection}"</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
