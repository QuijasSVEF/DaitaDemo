import React, { useState, useEffect, useRef } from 'react';
import { User, Search, Trash2, Loader2, AlertCircle, ArrowLeft, GraduationCap, BarChart, FileText, X } from 'lucide-react';
import { Student, ExitTicketResult } from '../types';
import { StudentAnalytics } from './analytics/StudentAnalytics';
import { AssessmentResultsModal } from './student/AssessmentResultsModal';
import { supabase } from '../services/supabase/config';
import { calculateStudentAnalytics } from '../services/analyticsService';
import { deleteAllStudentData } from '../services/supabase/students';
import { Button } from './ui/Button';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { SessionLogsList } from './shared/SessionLogsList';

interface Props {
  students: Student[];
  exitTickets: ExitTicketResult[];
  teacherUsername: string;
}

export function StudentView({ students, exitTickets, teacherUsername }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [studentEmojis, setStudentEmojis] = useState<{[key: number]: string}>({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentData, setStudentData] = useState<Student[]>(students);
  const [selectedStudentAssessments, setSelectedStudentAssessments] = useState<any[]>([]);
  const [selectedStudentSessionLogs, setSelectedStudentSessionLogs] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [deletingAttemptId, setDeletingAttemptId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const queryClient = useQueryClient();

  useRealTimeUpdates({
    teacherUsername,
    onAssessmentCompleted: () => {
      queryClient.invalidateQueries(['studentsWithAssessments', teacherUsername]);
      queryClient.refetchQueries(['studentsWithAssessments', teacherUsername]);
    },
  });

  const { data: studentsWithAssessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['studentsWithAssessments', teacherUsername],
    queryFn: async () => {
      try {
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_attempts')
          .select(`
            student_id,
            completed_at,
            quiz_templates!inner (
              grade_level
            )
          `)
          .eq('teacher_username', teacherUsername)
          .order('completed_at', { ascending: false });

        if (quizError) throw quizError;
        if (!quizData || quizData.length === 0) return [];

        const studentMap = new Map();
        quizData.forEach(attempt => {
          if (!studentMap.has(attempt.student_id)) {
            studentMap.set(attempt.student_id, {
              id: attempt.student_id,
              gradeLevel: attempt.quiz_templates.grade_level,
              subject: 'Mathematics',
              teacherUsername,
              assessmentCount: 1,
              lastAssessmentDate: attempt.completed_at
            });
          } else {
            studentMap.get(attempt.student_id).assessmentCount += 1;
          }
        });

        const studentIds = Array.from(studentMap.keys());
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('students')
            .select('id, first_name, last_initial, emoji_password')
            .eq('teacher_username', teacherUsername)
            .in('id', studentIds);
          profiles?.forEach((p: any) => {
            const s = studentMap.get(p.id);
            if (s) {
              s.firstName = p.first_name || '';
              s.lastInitial = p.last_initial || '';
              s.emoji = p.emoji_password || '';
            }
          });
        }

        return Array.from(studentMap.values());
      } catch (error) {
        console.error('Error fetching students with assessments:', error);
        return [];
      }
    }
  });

  useEffect(() => {
    const fetchStudentEmojis = async () => {
      try {
        setIsLoadingStudents(true);
        const { data, error } = await supabase.rpc('get_teacher_students', {
          p_teacher_username: teacherUsername
        });
        if (error) throw error;
        const emojiMap: {[key: number]: string} = {};
        data?.forEach((student: any) => {
          if (student.emoji_password) {
            emojiMap[student.id] = student.emoji_password;
          }
        });
        setStudentEmojis(emojiMap);
      } catch (error) {
        console.error('Error fetching student emojis:', error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    if (teacherUsername) {
      fetchStudentEmojis();
    }
  }, [teacherUsername]);

  const displayStudents = studentsWithAssessments && studentsWithAssessments.length > 0
    ? studentsWithAssessments
    : Array.from(new Map(studentData.map(student => [student.id, student])).values());

  const filteredStudents = displayStudents.filter(student =>
    student.id.toString().includes(searchTerm) ||
    (student.firstName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const studentExitTickets = selectedStudent
    ? exitTickets.filter(ticket => ticket.studentId === selectedStudent.id)
    : [];

  const handleViewStudentDetails = async (student: Student) => {
    setSelectedStudent(student);

    try {
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quiz_templates (
            title,
            topic,
            grade_level,
            questions,
            processed_questions
          )
        `)
        .eq('student_id', student.id)
        .eq('teacher_username', teacherUsername)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      const enhancedAttempts = (attempts || []).map(attempt => {
        const questions = attempt.quiz_templates.processed_questions || attempt.quiz_templates.questions || [];
        const enhancedAnswers = (attempt.answers || []).map((answer: any) => {
          const question = questions.find((q: any) => q.id === answer.questionId);
          return {
            ...answer,
            correctAnswer: answer.correctAnswer || question?.correctAnswer || question?.correct_answer,
            questionText: answer.questionText || question?.questionText || question?.question_text,
            visual: answer.visual || question?.visual || undefined,
            explanation: answer.explanation || question?.explanation || ''
          };
        });
        return { ...attempt, answers: enhancedAnswers };
      });

      setSelectedStudentAssessments(enhancedAttempts);

      const { data: sessionLogs } = await supabase
        .from('student_session_logs')
        .select('*')
        .eq('student_id', student.id)
        .eq('teacher_username', teacherUsername)
        .order('session_date', { ascending: false })
        .limit(20);

      setSelectedStudentSessionLogs(sessionLogs || []);
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      await deleteAllStudentData(teacherUsername);

      queryClient.invalidateQueries(['studentsWithAssessments']);
      queryClient.invalidateQueries(['teacherStudents']);

      setStudentData([]);
      setStudentEmojis({});
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error deleting student data:', error);
      alert('Failed to delete student data. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAttempt = async (attemptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingAttemptId(attemptId);
      const { error } = await supabase
        .from('quiz_attempts')
        .delete()
        .eq('id', attemptId);
      if (error) throw error;
      setSelectedStudentAssessments(prev => prev.filter(a => a.id !== attemptId));
      setConfirmDeleteId(null);
      queryClient.invalidateQueries(['studentsWithAssessments']);
      queryClient.invalidateQueries(['teacherQuizzes']);
    } catch (error) {
      console.error('Error deleting attempt:', error);
      alert('Failed to delete assessment attempt.');
    } finally {
      setDeletingAttemptId(null);
    }
  };

  if (isLoadingStudents || isLoadingAssessments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-svef-purple"></div>
        <p className="ml-4 text-svef-gray">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-lg">Permanent Deletion</h3>
              </div>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <p className="font-medium text-red-700">
                This will permanently delete ALL of the following data:
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>All student assessment results</li>
                <li>All assessments you created</li>
                <li>All student records</li>
                <li>All lesson plans and groups</li>
              </ul>
              <p className="font-bold text-gray-900 pt-2">
                This action CANNOT be undone. Results cannot be recovered.
              </p>
              <div className="pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllStudents}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
      {!selectedStudent && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-oswald text-2xl font-medium text-svef-gray">
              Student Directory
            </h2>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || students.length === 0}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete All Student Data'}</span>
            </Button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-svef-purple focus:border-svef-purple"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => {
              const quizCount = student.assessmentCount || 0;
              const lastDate = student.lastAssessmentDate
                ? new Date(student.lastAssessmentDate).toLocaleDateString()
                : null;

              return (
                <button
                  key={`student-${student.id}`}
                  onClick={() => handleViewStudentDetails(student)}
                  className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <User className="w-6 h-6 text-svef-purple" />
                    <div className="flex-1">
                      <h3 className="font-medium text-svef-gray flex items-center">
                        {student.firstName ? `${student.firstName} ${student.lastInitial ? student.lastInitial.toUpperCase() + '.' : ''}`.trim() : 'Unnamed student'}
                        {(student.emoji || studentEmojis[student.id]) && (
                          <span className="text-xl ml-2" role="img" aria-label="Student Emoji">
                            {student.emoji || studentEmojis[student.id]}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-svef-gray">
                        Grade {student.gradeLevel}
                      </p>
                    </div>
                  </div>
                  {quizCount > 0 ? (
                    <div className="text-sm text-svef-gray">
                      <p>{quizCount} assessment{quizCount !== 1 ? 's' : ''} completed</p>
                      {lastDate && <p className="mt-1">Last assessment: {lastDate}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-svef-gray">No assessments yet</p>
                  )}
                </button>
              );
            })}

            {filteredStudents.length === 0 && !isLoadingStudents && (
              <div className="col-span-3 bg-white p-6 rounded-lg shadow-sm text-center">
                <p className="text-svef-gray">No students found. Students will appear here after they log in or complete assessments.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-oswald text-2xl font-medium text-svef-gray">
                {selectedStudent.firstName ? `${selectedStudent.firstName} ${selectedStudent.lastInitial ? selectedStudent.lastInitial.toUpperCase() + '.' : ''}`.trim() : 'Unnamed student'}
                {(selectedStudent.emoji || studentEmojis[selectedStudent.id]) && (
                  <span className="text-2xl ml-2" role="img" aria-label="Student Emoji">
                    {selectedStudent.emoji || studentEmojis[selectedStudent.id]}
                  </span>
                )}
              </h2>
              <p className="text-svef-gray">Grade {selectedStudent.gradeLevel}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedStudent(null);
                setSelectedStudentAssessments([]);
                setSelectedStudentSessionLogs([]);
              }}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Directory</span>
            </Button>
          </div>

          {/* Assessment Results */}
          {selectedStudentAssessments.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart className="w-6 h-6 text-svef-purple" />
                <h3 className="font-oswald text-xl font-medium text-svef-gray">Assessment Results</h3>
              </div>

              <div className="space-y-4">
                {selectedStudentAssessments.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="relative border border-gray-200 rounded-lg p-4 hover:border-svef-purple hover:bg-gray-50 transition-colors"
                  >
                    <button
                      onClick={() => setSelectedAssessment(attempt)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-svef-gray">
                            {attempt.quiz_templates?.title || 'Assessment'}
                          </h4>
                          <p className="text-sm text-svef-gray">
                            {attempt.quiz_templates?.topic} - Grade {attempt.quiz_templates?.grade_level}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-oswald text-svef-purple">
                            {attempt.score}/{attempt.total_questions}
                          </p>
                          <p className="text-sm text-svef-gray">
                            {Math.round((attempt.score / attempt.total_questions) * 100)}%
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-svef-gray">
                        Completed: {new Date(attempt.completed_at).toLocaleString()}
                      </p>
                      {(() => {
                        const wrongAreas = (attempt.answers || [])
                          .filter((a: any) => !a.correct && a.questionSubtopic)
                          .map((a: any) => a.questionSubtopic);
                        const uniqueAreas = [...new Set(wrongAreas)] as string[];
                        if (uniqueAreas.length === 0) return null;
                        return (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-red-600 mb-1">Struggle Areas:</p>
                            <div className="flex flex-wrap gap-1">
                              {uniqueAreas.map((area, i) => (
                                <span key={i} className="px-2 py-1 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </button>
                    {confirmDeleteId === attempt.id ? (
                      <div className="absolute top-2 right-2 bg-white border-2 border-red-500 rounded-lg p-3 shadow-lg z-10">
                        <p className="text-red-600 font-bold text-sm mb-2">
                          DELETE THIS ATTEMPT?
                        </p>
                        <p className="text-red-500 text-xs mb-3">
                          This cannot be undone. Student will retake.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleDeleteAttempt(attempt.id, e)}
                            disabled={deletingAttemptId === attempt.id}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 transition-colors flex items-center gap-1"
                          >
                            {deletingAttemptId === attempt.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Yes, Delete
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(attempt.id); }}
                        className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete attempt (allow retake)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-svef-purple/50" />
                </div>
                <h3 className="text-xl font-medium text-svef-gray">No assessments yet</h3>
                <p className="text-svef-gray max-w-md">
                  This student hasn't completed any assessments yet. Once they complete an assessment,
                  you'll see their results here and they'll be placed into weekly groups for lesson planning.
                </p>
              </div>
            </div>
          )}

          {/* Session Logs */}
          {selectedStudentSessionLogs.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-6 h-6 text-teal-600" />
                <h3 className="font-oswald text-xl font-medium text-svef-gray">Session Logs</h3>
                <span className="text-xs text-gray-400 ml-auto">{selectedStudentSessionLogs.length} logs</span>
              </div>
              <SessionLogsList
                logs={selectedStudentSessionLogs}
                emptyMessage="This student hasn't submitted any session logs yet."
              />
            </div>
          )}

          {/* Analytics from exit tickets */}
          {studentExitTickets.length > 0 && (
            <StudentAnalytics
              analytics={calculateStudentAnalytics(studentExitTickets)}
            />
          )}
        </div>
      )}

      <AssessmentResultsModal
        attempt={selectedAssessment}
        onClose={() => setSelectedAssessment(null)}
      />
    </div>
  );
}
