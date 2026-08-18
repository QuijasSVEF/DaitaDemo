import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Share2, Loader2, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { cn } from '../../utils/cn';
import { QuizTemplate } from '../../types/quiz';

interface Props {
  quiz: QuizTemplate;
  teacherUsername: string;
  onClose: () => void;
  onShared: () => void;
}

interface TeacherOption {
  username: string;
  name: string;
  email: string;
}

export function ShareAssessmentModal({ quiz, teacherUsername, onClose, onShared }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shareResults, setShareResults] = useState<{ username: string; success: boolean; message: string }[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery<TeacherOption[]>({
    queryKey: ['teachersForShare', teacherUsername],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('username, name, email')
        .neq('username', teacherUsername)
        .eq('account_status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map(t => ({
        username: t.username,
        name: t.name || t.username,
        email: t.email || ''
      }));
    }
  });

  const { data: shareHistory = [] } = useQuery({
    queryKey: ['shareHistory', quiz.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_assessments')
        .select('target_teacher_username, shared_at')
        .eq('source_quiz_id', quiz.id)
        .order('shared_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeacher = (username: string) => {
    setSelectedTeachers(prev =>
      prev.includes(username)
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const handleShare = async () => {
    if (selectedTeachers.length === 0) return;
    setSharing(true);
    const results: { username: string; success: boolean; message: string }[] = [];

    for (const targetUsername of selectedTeachers) {
      const { data, error } = await supabase.rpc('share_quiz_template', {
        p_source_quiz_id: quiz.id,
        p_source_teacher_username: teacherUsername,
        p_target_teacher_username: targetUsername
      });

      if (error) {
        results.push({ username: targetUsername, success: false, message: error.message });
      } else if (data && !data.success) {
        results.push({ username: targetUsername, success: false, message: data.message });
      } else {
        results.push({ username: targetUsername, success: true, message: 'Shared successfully' });
      }
    }

    setShareResults(results);
    setShowResults(true);
    setSharing(false);

    if (results.some(r => r.success)) {
      onShared();
    }
  };

  const alreadySharedWith = new Set(shareHistory.map(h => h.target_teacher_username));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Share Assessment</h3>
              <p className="text-sm text-gray-500 truncate max-w-[280px]">{quiz.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {showResults ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            <h4 className="font-medium text-gray-900">Share Results</h4>
            <div className="space-y-2">
              {shareResults.map((result) => {
                const teacher = teachers.find(t => t.username === result.username);
                return (
                  <div key={result.username} className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    result.success ? "bg-green-50" : "bg-red-50"
                  )}>
                    <span className="text-sm font-medium text-gray-700">
                      {teacher?.name || result.username}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      result.success ? "text-green-600" : "text-red-600"
                    )}>
                      {result.success ? 'Shared' : result.message}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teachers by name or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  autoFocus
                />
              </div>
              {selectedTeachers.length > 0 && (
                <p className="mt-2 text-xs text-blue-600 font-medium">
                  {selectedTeachers.length} teacher{selectedTeachers.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Teacher List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
              {loadingTeachers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  {searchTerm ? 'No teachers match your search' : 'No other teachers available'}
                </div>
              ) : (
                filteredTeachers.map((teacher) => {
                  const isSelected = selectedTeachers.includes(teacher.username);
                  const wasSharedBefore = alreadySharedWith.has(teacher.username);

                  return (
                    <button
                      key={teacher.username}
                      onClick={() => toggleTeacher(teacher.username)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all",
                        isSelected
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {teacher.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                          <p className="text-xs text-gray-500">@{teacher.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {wasSharedBefore && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            Shared before
                          </span>
                        )}
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Share History */}
            {shareHistory.length > 0 && !searchTerm && (
              <div className="px-4 pb-2 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 font-medium mb-1 flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>Previously shared with {shareHistory.length} teacher{shareHistory.length > 1 ? 's' : ''}</span>
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={selectedTeachers.length === 0 || sharing}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2",
                    selectedTeachers.length === 0 || sharing
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {sharing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Share{selectedTeachers.length > 0 ? ` (${selectedTeachers.length})` : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
