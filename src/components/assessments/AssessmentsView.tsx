import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, AlertCircle, Trash2, Eye, Play, Pause, Calendar, BarChart3, Users, Loader2, CheckCircle, Share2 } from 'lucide-react';
import { QuizTemplate, QuizAttempt, QuizQuestion } from '../../types/quiz';
import { formatDate } from '../../utils/dateUtils';
import { QuizQuestions } from './QuizQuestions';
import { ShareAssessmentModal } from './ShareAssessmentModal';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase/config';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../../utils/cn';

interface Props {
  teacherUsername: string;
}

interface QuizWithAttempts extends QuizTemplate {
  attempts?: QuizAttempt[];
  questions?: any[];
  sharedFromTeacher?: string | null;
}

export function AssessmentsView({ teacherUsername }: Props) {
  const [selectedQuiz, setSelectedQuiz] = useState<QuizTemplate | null>(null);
  const [selectedQuizQuestions, setSelectedQuizQuestions] = useState<QuizQuestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [activatingQuizId, setActivatingQuizId] = useState<string | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [sharingQuiz, setSharingQuiz] = useState<QuizWithAttempts | null>(null);
  const queryClient = useQueryClient();

  // Fetch quizzes with their attempts
  const { data: quizzes = [], error: queryError, refetch } = useQuery<QuizWithAttempts[]>({
    queryKey: ['teacherQuizzes', teacherUsername],
    queryFn: async () => {
      try {
        console.log(`[AssessmentsView] Fetching quizzes for teacher: ${teacherUsername}`);
        
        const { data, error } = await supabase
          .from('quiz_templates')
          .select(`
            id,
            teacher_username,
            title,
            topic,
            subtopics,
            question_types,
            num_questions,
            grade_level,
            difficulty,
            is_active,
            created_at,
            questions,
            shared_from_teacher,
            quiz_attempts (
              id,
              student_id,
              score,
              total_questions,
              completed_at
            )
          `)
          .eq('teacher_username', teacherUsername)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`[AssessmentsView] Error fetching quizzes:`, error);
          throw error;
        }

        console.log(`[AssessmentsView] Successfully fetched ${data?.length || 0} quizzes`);

        return (data || []).map(quiz => ({
          id: quiz.id,
          teacherUsername: quiz.teacher_username,
          title: quiz.title,
          topic: quiz.topic,
          subtopics: quiz.subtopics,
          questionTypes: quiz.question_types,
          numQuestions: quiz.num_questions,
          gradeLevel: quiz.grade_level,
          difficulty: quiz.difficulty,
          isActive: quiz.is_active || false,
          createdAt: new Date(quiz.created_at),
          questions: quiz.questions || [],
          attempts: quiz.quiz_attempts || [],
          sharedFromTeacher: quiz.shared_from_teacher || null
        }));
      } catch (error) {
        console.error(`[AssessmentsView] Error in quiz fetch:`, error);
        throw error;
      }
    },
    enabled: !!teacherUsername,
    staleTime: 30000 // 30 seconds
  });

  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // DELETE FUNCTIONALITY - Using Supabase RPC function for safe deletion
  const handleDeleteQuiz = async (quizId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    console.log(`🗑️ [DELETE] Starting deletion for quiz: ${quizId}`);

    console.log(`[AssessmentsView] Delete button clicked for quiz: ${quizId}`);

    if (!confirm('Are you sure you want to delete this assessment? This will also delete all student attempts and cannot be undone.')) {
      console.log(`🗑️ [DELETE] User cancelled deletion`);
      console.log(`[AssessmentsView] Delete cancelled by user`);
      return;
    }

    try {
      setDeletingQuizId(quizId);
      setError(null);
      
      console.log(`🗑️ [DELETE] Calling Supabase RPC function delete_quiz_template`);
      
      console.log(`[AssessmentsView] Starting deletion process for quiz: ${quizId}`);

      const { data: deleteResult, error: deleteError } = await supabase
        .rpc('delete_quiz_template', {
        p_quiz_id: quizId,
        p_teacher_username: teacherUsername
      });

      if (deleteError) {
        console.error(`🗑️ [DELETE] Supabase RPC error:`, deleteError);
        console.error(`[AssessmentsView] Error deleting quiz:`, deleteError);
        throw new Error(`Failed to delete assessment: ${deleteError.message}`);
      }
      
      if (!deleteResult?.success) {
        console.error(`🗑️ [DELETE] RPC function returned failure:`, deleteResult);
        throw new Error(deleteResult?.message || 'Failed to delete assessment');
      }
      
      console.log(`🗑️ [DELETE] Quiz deleted successfully from database`);
      
      console.log(`[AssessmentsView] Quiz deleted successfully: ${quizId}`);
      
      // Refresh data
      console.log(`🗑️ [DELETE] Refreshing UI data...`);
      console.log(`[AssessmentsView] Refreshing quiz data...`);
      await refetch();
      await queryClient.invalidateQueries(['teacherQuizzes']);
      await queryClient.invalidateQueries(['activeQuiz']);
      
      console.log(`🗑️ [DELETE] Deletion process completed successfully`);
      
      console.log(`[AssessmentsView] Quiz deletion completed successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete assessment';
      console.error(`🗑️ [DELETE] Error during deletion:`, error);
      console.error(`[AssessmentsView] Error during deletion:`, error);
      setError(errorMessage);
    } finally {
      setDeletingQuizId(null);
    }
  };

  // ACTIVATE/DEACTIVATE FUNCTIONALITY - Using RPC functions for proper state management
  const handleActivateQuiz = async (quizId: string, currentActiveState: boolean, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    const newActiveState = !currentActiveState;
    console.log(`⚡ [ACTIVATE] ${newActiveState ? 'Activating' : 'Deactivating'} quiz: ${quizId}`);
    console.log(`[AssessmentsView] ${newActiveState ? 'Activating' : 'Deactivating'} quiz: ${quizId}`);

    try {
      setActivatingQuizId(quizId);
      setError(null);
      
      if (newActiveState) {
        console.log(`⚡ [ACTIVATE] Calling activate_quiz_template RPC function`);
        // Use RPC function to activate quiz
        const { data: activateResult, error: activateError } = await supabase.rpc('activate_quiz_template', {
          p_quiz_id: quizId,
          p_teacher_username: teacherUsername
        });

        if (activateError) {
          console.error(`⚡ [ACTIVATE] Supabase RPC error:`, activateError);
          console.error(`[AssessmentsView] Error activating quiz:`, activateError);
          throw new Error(`Failed to activate assessment: ${activateError.message}`);
        }
        
        if (!activateResult?.success) {
          console.error(`⚡ [ACTIVATE] RPC function returned failure:`, activateResult);
          throw new Error(activateResult?.message || 'Failed to activate assessment');
        }
        
        console.log(`⚡ [ACTIVATE] Quiz activated successfully`);
      } else {
        console.log(`⚡ [ACTIVATE] Calling deactivate_quiz_template RPC function`);
        // Use RPC function to deactivate quiz
        const { data: deactivateResult, error: deactivateError } = await supabase.rpc('deactivate_quiz_template', {
          p_quiz_id: quizId,
          p_teacher_username: teacherUsername
        });

        if (deactivateError) {
          console.error(`⚡ [ACTIVATE] Supabase RPC error:`, deactivateError);
          console.error(`[AssessmentsView] Error deactivating quiz:`, deactivateError);
          throw new Error(`Failed to deactivate assessment: ${deactivateError.message}`);
        }
        
        if (!deactivateResult?.success) {
          console.error(`⚡ [ACTIVATE] RPC function returned failure:`, deactivateResult);
          throw new Error(deactivateResult?.message || 'Failed to deactivate assessment');
        }
        
        console.log(`⚡ [ACTIVATE] Quiz deactivated successfully`);
      }

      console.log(`[AssessmentsView] Quiz ${newActiveState ? 'activated' : 'deactivated'} successfully`);

      // Refresh data
      console.log(`⚡ [ACTIVATE] Refreshing UI data...`);
      console.log(`[AssessmentsView] Refreshing quiz data after activation...`);
      await refetch();
      await queryClient.invalidateQueries(['teacherQuizzes']);
      await queryClient.invalidateQueries(['activeQuiz']);
      
      console.log(`⚡ [ACTIVATE] Activation process completed successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update assessment status';
      console.error(`⚡ [ACTIVATE] Error during activation:`, error);
      console.error(`[AssessmentsView] Error during activation:`, error);
      setError(errorMessage);
    } finally {
      setActivatingQuizId(null);
    }
  };

  // EDIT FUNCTIONALITY - Direct database operations
  const handleViewQuiz = async (quiz: QuizTemplate, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    console.log(`👁️ [EDIT] Opening quiz for editing: ${quiz.id}`);

    console.log(`[AssessmentsView] View/Edit button clicked for quiz: ${quiz.id}`);

    try {
      setLoadingQuizId(quiz.id);
      setError(null);
      
      console.log(`👁️ [EDIT] Loading questions from quiz_templates table...`);
      
      console.log(`[AssessmentsView] Loading questions from Supabase...`);
      
      // Force refresh the quiz data to get latest changes
      await queryClient.invalidateQueries(['teacherQuizzes']);
      
      // Get questions from the quiz template directly
      const { data: template, error: templateError } = await supabase
        .from('quiz_templates')
        .select('questions, processed_questions')
        .eq('id', quiz.id)
        .single();

      if (templateError) {
        console.error(`👁️ [EDIT] Error loading template:`, templateError);
        console.error(`[AssessmentsView] Error loading template:`, templateError);
        throw templateError;
      }
      
      // Use processed_questions if available, otherwise use questions
      const questionsData = template.processed_questions || template.questions || [];
      console.log(`👁️ [EDIT] Found ${questionsData.length} questions in template`);
      console.log(`[AssessmentsView] Found ${questionsData.length} questions in template`);
      
      const questions = questionsData.map((q: any, index: number) => ({
        id: q.id || `${quiz.id}-${index}`,
        templateId: quiz.id,
        questionText: q.questionText || '',
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        options: q.options || [],
        type: q.type || 'Multiple Choice',
        subtopic: q.subtopic || '',
        visual: q.visual || undefined,
        createdAt: new Date()
      }));
      
      console.log(`👁️ [EDIT] Processed ${questions.length} questions for editing`);
      
      console.log(`[AssessmentsView] Processed ${questions.length} questions for editing`);
      
      setSelectedQuizQuestions(questions);
      setSelectedQuiz(quiz);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load quiz questions';
      console.error(`👁️ [EDIT] Error loading quiz:`, error);
      console.error(`[AssessmentsView] Error loading quiz:`, error);
      setError(errorMessage);
    } finally {
      setLoadingQuizId(null);
    }
  };

  // SAVE FUNCTIONALITY - Direct Supabase updates
  const handleSaveQuizChanges = async (updatedQuestions: QuizQuestion[]) => {
    try {
      if (!selectedQuiz) {
        throw new Error('No quiz selected');
      }
      
      console.log(`💾 [SAVE] Saving ${updatedQuestions.length} questions to quiz_templates table for quiz: ${selectedQuiz.id}`);
      
      console.log(`[AssessmentsView] Saving ${updatedQuestions.length} updated questions to Supabase for quiz: ${selectedQuiz.id}`);
      
      // Format questions for database storage
      const formattedQuestions = updatedQuestions.map(q => ({
        id: q.id || uuidv4(),
        questionText: q.questionText || '',
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        options: Array.isArray(q.options) ? q.options : [],
        type: q.type || 'Multiple Choice',
        subtopic: q.subtopic || '',
        ...((q as any).visual ? { visual: (q as any).visual } : {})
      }));
      
      console.log(`💾 [SAVE] Formatted questions for database:`, formattedQuestions);
      
      const { error: saveError } = await supabase
        .from('quiz_templates')
        .update({
          questions: formattedQuestions,
          processed_questions: formattedQuestions,
          num_questions: formattedQuestions.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedQuiz.id);

      if (saveError) {
        console.error(`💾 [SAVE] Supabase update error:`, saveError);
        console.error(`[AssessmentsView] Error saving questions:`, saveError);
        throw saveError;
      }
      
      console.log(`💾 [SAVE] Questions saved successfully to database`);
      
      console.log(`[AssessmentsView] Questions saved successfully to Supabase`);
      
      setSelectedQuizQuestions(formattedQuestions);
      
      // Refresh data
      console.log(`💾 [SAVE] Refreshing UI data...`);
      console.log(`[AssessmentsView] Refreshing data after save...`);
      await refetch();
      await queryClient.invalidateQueries(['quizQuestions']);
      await queryClient.invalidateQueries(['teacherQuizzes']);
      
      console.log(`💾 [SAVE] Save process completed successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save quiz changes';
      console.error(`💾 [SAVE] Error saving quiz changes:`, error);
      console.error(`[AssessmentsView] Error saving quiz changes:`, error);
      setError(errorMessage);
      throw error;
    }
  };

  if (queryError) {
    console.error(`[AssessmentsView] Query error:`, queryError);
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>Failed to load assessments: {queryError instanceof Error ? queryError.message : 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-oswald font-medium text-svef-gray">
          Created Assessments
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-svef-purple focus:border-svef-purple"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {!filteredQuizzes.length ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments Found</h3>
          <p className="text-svef-gray">
            {searchTerm 
              ? 'No assessments match your search criteria.' 
              : 'Create your first assessment by clicking the "Create Assessment" tab.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="bg-svef-beige/30 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-svef-gray text-lg">
                    {quiz.title}
                  </h3>
                  <div className="flex items-center space-x-1.5">
                    {quiz.sharedFromTeacher && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md font-medium">
                        From @{quiz.sharedFromTeacher}
                      </span>
                    )}
                    {quiz.isActive && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-sm text-svef-gray space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(quiz.createdAt)}</span>
                  </div>
                  <span>Grade {quiz.gradeLevel}</span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-svef-gray mb-2">Topic</h4>
                  <p className="text-svef-gray">{quiz.topic}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-svef-gray mb-2">Subtopics</h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const questionSubtopics = (quiz.questions || [])
                        .map((q: any) => q.subtopic)
                        .filter((s: string) => s && s.trim());
                      const uniqueSubtopics = questionSubtopics.length > 0
                        ? [...new Set(questionSubtopics)] as string[]
                        : quiz.subtopics;
                      return uniqueSubtopics.map((subtopic, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-svef-beige/30 rounded-md text-xs text-svef-gray"
                        >
                          {subtopic}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-svef-purple font-medium">
                      {quiz.numQuestions} questions
                    </span>
                    {quiz.attempts && quiz.attempts.length > 0 && (
                      <div className="flex items-center space-x-1 text-svef-gray">
                        <Users className="w-4 h-4" />
                        <span>{quiz.attempts.length} attempts</span>
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium",
                    quiz.difficulty === 'easy' ? "bg-green-100 text-green-700" :
                    quiz.difficulty === 'medium' ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {quiz.difficulty}
                  </span>
                </div>

                {/* Action Buttons - Fixed with proper event handling */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  {/* VIEW & EDIT BUTTON */}
                  <Button
                    variant="secondary"
                    onClick={(e) => handleViewQuiz(quiz, e)}
                    disabled={loadingQuizId === quiz.id}
                    className="flex items-center space-x-2"
                  >
                    {loadingQuizId === quiz.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span>{loadingQuizId === quiz.id ? 'Loading...' : 'View & Edit'}</span>
                  </Button>

                  <div className="flex items-center space-x-2">
                    {/* ACTIVATE/DEACTIVATE BUTTON */}
                    <Button
                      variant={quiz.isActive ? "secondary" : "primary"}
                      onClick={(e) => handleActivateQuiz(quiz.id, quiz.isActive, e)}
                      disabled={activatingQuizId === quiz.id}
                      className={cn(
                        "flex items-center space-x-2",
                        quiz.isActive 
                          ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      )}
                    >
                      {activatingQuizId === quiz.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : quiz.isActive ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>
                        {activatingQuizId === quiz.id 
                          ? (quiz.isActive ? 'Deactivating...' : 'Activating...')
                          : (quiz.isActive ? 'Deactivate' : 'Activate')
                        }
                      </span>
                    </Button>

                    {/* SHARE BUTTON */}
                    <Button
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSharingQuiz(quiz); }}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </Button>

                    {/* DELETE BUTTON */}
                    <Button
                      variant="secondary"
                      onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                      disabled={deletingQuizId === quiz.id}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      {deletingQuizId === quiz.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>{deletingQuizId === quiz.id ? 'Deleting...' : 'Delete'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {selectedQuiz && (
        <QuizQuestions
          quiz={selectedQuiz}
          questions={selectedQuizQuestions}
          onSave={handleSaveQuizChanges}
          onClose={() => {
            console.log(`[AssessmentsView] Closing quiz editor modal`);
            setSelectedQuiz(null);
            setSelectedQuizQuestions([]);
            refetch();
          }}
        />
      )}

      {/* Share Modal */}
      {sharingQuiz && (
        <ShareAssessmentModal
          quiz={sharingQuiz}
          teacherUsername={teacherUsername}
          onClose={() => setSharingQuiz(null)}
          onShared={() => {
            queryClient.invalidateQueries(['teacherQuizzes']);
          }}
        />
      )}
    </div>
  );
}