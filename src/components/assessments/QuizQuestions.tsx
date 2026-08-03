import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { X, AlertCircle, CheckCircle2, CreditCard as Edit2, Save, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { supabase } from '../../services/supabase/config';
import { v4 as uuidv4 } from 'uuid';
import { renderMathContent, formatMathContent, detectTablePattern, inferTableFromContext, detectMultiTablePattern, detectDataVisualizationPattern } from '../../utils/mathUtils.tsx';
import { MathVisual } from '../quiz/MathVisual';

interface QuizTemplate {
  id: string;
  title: string;
  topic: string;
  gradeLevel: string;
  isActive: boolean;
  teacherUsername?: string;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  options: string[];
  type: string;
  subtopic: string;
}

interface Props {
  quiz: QuizTemplate;
  questions: QuizQuestion[];
  onClose: () => void;
  onSave?: (questions: QuizQuestion[]) => Promise<void>;
}

export function QuizQuestions({ quiz, questions, onClose, onSave }: Props) {
  const queryClient = useQueryClient();
  const [editedQuestions, setEditedQuestions] = useState<QuizQuestion[]>(questions || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Debug function
  const debugLog = (message: string) => {
    console.log(`[QuizQuestions] ${message}`);
    setDebugInfo(prev => `${prev}\n${new Date().toLocaleTimeString()}: ${message}`);
  };

  const handleQuestionEdit = (index: number, updates: Partial<QuizQuestion>) => {
    debugLog(`Editing question ${index + 1}: ${Object.keys(updates).join(', ')}`);
    const newQuestions = [...editedQuestions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setEditedQuestions(newQuestions);
  };

  const handleOptionEdit = (questionIndex: number, optionIndex: number, newValue: string) => {
    debugLog(`Editing option ${optionIndex + 1} for question ${questionIndex + 1}`);
    const newQuestions = [...editedQuestions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = formatMathContent(newValue);
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], options: newOptions };
    setEditedQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (questionIndex: number, newCorrectAnswer: string) => {
    debugLog(`Changing correct answer for question ${questionIndex + 1} to: ${newCorrectAnswer}`);
    const newQuestions = [...editedQuestions];
    newQuestions[questionIndex] = { 
      ...newQuestions[questionIndex], 
      correctAnswer: newCorrectAnswer
    };
    setEditedQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      debugLog(`Deleting question ${index + 1}`);
      const newQuestions = editedQuestions.filter((_, i) => i !== index);
      setEditedQuestions(newQuestions);
    }
  };

  const handleAddQuestion = () => {
    debugLog('Adding new question');
    const newQuestion: QuizQuestion = {
      id: uuidv4(),
      questionText: '',
      correctAnswer: '',
      explanation: '',
      options: ['', '', '', ''],
      type: 'Multiple Choice',
      subtopic: ''
    };
    setEditedQuestions([...editedQuestions, newQuestion]);
    setEditingIndex(editedQuestions.length);
  };

  // SAVE FUNCTIONALITY - Fixed to properly update Supabase
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      console.log(`[QuizQuestions] Starting save process for quiz ID: ${quiz.id} with ${editedQuestions.length} questions`);
      
      // Format questions for database
      const formattedQuestions = editedQuestions.map(q => ({
        id: q.id || uuidv4(),
        questionText: (q.questionText || '').trim(),
        correctAnswer: (q.correctAnswer || '').trim(),
        explanation: (q.explanation || '').trim(),
        options: Array.isArray(q.options) ? q.options.map(opt => (opt || '').trim()) : [],
        type: (q.type || 'Multiple Choice').trim(),
        subtopic: (q.subtopic || '').trim()
      }));
      
      console.log(`[QuizQuestions] Formatted ${formattedQuestions.length} questions for database`);

      // Use RPC function to bypass RLS issues while maintaining security
      const { data: updatedData, error: saveError } = await supabase.rpc(
        'update_quiz_template_questions',
        {
          p_quiz_id: quiz.id,
          p_teacher_username: quiz.teacherUsername,
          p_questions: formattedQuestions,
          p_num_questions: formattedQuestions.length
        }
      );

      if (saveError) {
        console.error(`[QuizQuestions] Supabase save error:`, saveError);
        throw new Error(`Failed to update quiz template: ${saveError.message}`);
      }
      
      if (!updatedData) {
        throw new Error('No data returned from save operation');
      }
      
      // The RPC function returns the data directly, no need to parse
      const parsedData = updatedData;
      await queryClient.invalidateQueries(['activeQuiz']);
      
      // Wait a moment for cache to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the save by fetching fresh data
      const { data: verifyData, error: verifyError } = await supabase
        .from('quiz_templates') 
        .select('questions, processed_questions, num_questions, updated_at, teacher_username')
        .eq('id', quiz.id)
        .single();
        
      if (verifyError) {
        throw new Error(`Failed to verify save: ${verifyError.message}`);
      }
        console.log('Save verification result:', {
          questionsLength: verifyData.questions?.length || 0,
          processedQuestionsLength: verifyData.processed_questions?.length || 0,
          numQuestions: verifyData.num_questions,
          updatedAt: verifyData.updated_at,
          teacher: verifyData.teacher_username
        });
        
        // Check if the data was actually updated
      const actualQuestionCount = verifyData.num_questions;
      if (actualQuestionCount !== formattedQuestions.length) {
        console.error(`Data mismatch: Expected ${formattedQuestions.length} questions, got ${actualQuestionCount}`);
        throw new Error(`Save failed: Database still shows ${actualQuestionCount} questions instead of ${formattedQuestions.length}`);
        }
        
      console.log('Save verification successful - data was properly updated via RPC');
      
      // Force cache invalidation after successful save
      await queryClient.invalidateQueries(['quizQuestions', quiz.id]);
      await queryClient.invalidateQueries(['teacherQuizzes']);
      await queryClient.invalidateQueries(['activeQuiz']);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      console.log(`[QuizQuestions] Save process completed successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      console.error(`[QuizQuestions] Save error:`, error);
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // ACTIVATE FUNCTIONALITY - Fixed to properly update Supabase
  const handleActivate = async () => {
    try {
      setIsActivating(true);
      setError(null);
      
      console.log(`[QuizQuestions] Starting activation process for quiz: ${quiz.id}`);
      
      // Validate questions before activation
      const invalidQuestions = editedQuestions.filter(q => 
        !q.questionText.trim() || 
        !q.correctAnswer.trim() || 
        !q.options.every(opt => opt.trim()) ||
        !q.options.includes(q.correctAnswer)
      );

      if (invalidQuestions.length > 0) {
        const errorMsg = 'Please complete all questions before activating';
        console.log(`[QuizQuestions] Activation validation failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Save questions first
      console.log(`[QuizQuestions] Saving questions before activation`);
      await handleSaveChanges();
      
      // Get teacher username from quiz template
      const { data: templateData, error: fetchError } = await supabase
        .from('quiz_templates')
        .select('teacher_username')
        .eq('id', quiz.id)
        .single();
        
      if (fetchError) {
        console.error(`[QuizQuestions] Error fetching teacher username:`, fetchError);
        throw fetchError;
      }
      
      if (!templateData?.teacher_username) {
        throw new Error('Could not determine teacher username');
      }
      
      // Use RPC function to activate quiz
      const { data: activateResult, error: activateError } = await supabase.rpc(
        'activate_quiz_template',
        {
          p_quiz_id: quiz.id,
          p_teacher_username: templateData.teacher_username
        }
      );
      
      if (activateError) {
        console.error(`[QuizQuestions] RPC activation error:`, activateError);
        throw new Error(`Failed to activate quiz: ${activateError.message}`);
      }
      
      console.log(`[QuizQuestions] Quiz activated successfully:`, activateResult);
      
      // Refresh data
      await queryClient.invalidateQueries(['quizQuestions', quiz.id]);
      await queryClient.invalidateQueries(['teacherQuizzes']);
      await queryClient.invalidateQueries(['activeQuiz']);
      
      // Close modal
      onClose();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to activate';
      console.error(`[QuizQuestions] Activation error:`, error);
      setError(errorMessage);
    } finally {
      setIsActivating(false);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 bg-svef-beige/30 flex items-center justify-between border-b border-gray-200">
            <div>
              <h2 className="font-oswald text-xl font-medium text-svef-gray">
                {quiz.title}
              </h2>
              <p className="text-sm text-svef-gray mt-1">
                {quiz.topic} • Grade {quiz.gradeLevel}
              </p>
            </div>
            <Button variant="secondary" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-svef-gray flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>No questions available for this assessment.</p>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 flex justify-end space-x-4">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 bg-svef-beige/30 flex items-center justify-between border-b border-gray-200">
          <div>
            <h2 className="font-oswald text-xl font-medium text-svef-gray">
              {quiz.title}
            </h2>
            <p className="text-sm text-svef-gray mt-1">
              {quiz.topic} • Grade {quiz.gradeLevel} • {editedQuestions.length} questions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {quiz.isActive ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
            ) : (
              <button
                onClick={handleActivate}
                disabled={isActivating || isSaving}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  "bg-green-600 text-white hover:bg-green-700",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
                  (isActivating || isSaving) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isActivating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isActivating ? 'Activating...' : 'Activate'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Debug Information Panel */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mx-4 mt-4 bg-gray-100 border border-gray-300 rounded-lg p-3">
            <h4 className="font-medium text-gray-700 mb-2 text-sm">Debug Log:</h4>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">
              {debugInfo}
            </pre>
            <button 
              onClick={() => setDebugInfo('')}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center text-green-600">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <p className="text-sm">Changes saved successfully!</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {editedQuestions.map((question, index) => (
              <div key={question.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <span className="bg-svef-purple text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-medium">
                    {index + 1}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        debugLog(`${editingIndex === index ? 'Stopping' : 'Starting'} edit for question ${index + 1}`);
                        setEditingIndex(editingIndex === index ? null : index);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(index)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingIndex === index ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Question Text
                      </label>
                      <textarea
                        value={question.questionText}
                        onChange={(e) => handleQuestionEdit(index, { questionText: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                        rows={3}
                        placeholder="Enter the question text..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Answer Options
                      </label>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <span className="text-sm font-medium w-6">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionEdit(index, optionIndex, e.target.value)}
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            />
                            <input
                              type="radio"
                              name={`correct-answer-${index}`}
                              checked={option === question.correctAnswer}
                              onChange={() => handleCorrectAnswerChange(index, option)}
                              className="h-4 w-4 text-svef-purple focus:ring-svef-purple border-gray-300"
                              title="Mark as correct answer"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-svef-gray mt-1">
                        Select the radio button next to the correct answer
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Explanation
                      </label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => handleQuestionEdit(index, { explanation: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                        rows={2}
                        placeholder="Explain why this is the correct answer..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-svef-gray mb-1">
                          Question Type
                        </label>
                        <input
                          type="text"
                          value={question.type}
                          onChange={(e) => handleQuestionEdit(index, { type: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                          placeholder="e.g., Multiple Choice"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-svef-gray mb-1">
                          Subtopic
                        </label>
                        <input
                          type="text"
                          value={question.subtopic}
                          onChange={(e) => handleQuestionEdit(index, { subtopic: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                          placeholder="e.g., Linear Equations"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => {
                          debugLog(`Cancelling edit for question ${index + 1}`);
                          setEditingIndex(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          debugLog(`Saving question ${index + 1} edit`);
                          setEditingIndex(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-svef-purple rounded-md hover:bg-svef-purple/90 flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Question</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-svef-gray mb-2">
                        {renderMathContent(question.questionText) || 'No question text'}
                      </h3>
                      {(question as any).visual ? (
                        <MathVisual visual={(question as any).visual} />
                      ) : detectTablePattern(question.questionText) ? (
                        <MathVisual visual={detectTablePattern(question.questionText)!} />
                      ) : inferTableFromContext(question.questionText, question.explanation) ? (
                        <MathVisual visual={inferTableFromContext(question.questionText, question.explanation)!} />
                      ) : detectMultiTablePattern(question.questionText, question.explanation, question.options) ? (
                        <MathVisual visual={detectMultiTablePattern(question.questionText, question.explanation, question.options)!} />
                      ) : detectDataVisualizationPattern(question.questionText, question.explanation, question.options) ? (
                        <MathVisual visual={detectDataVisualizationPattern(question.questionText, question.explanation, question.options)!} />
                      ) : null}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className={cn(
                              'p-3 rounded-lg border',
                              option === question.correctAnswer
                                ? 'border-green-200 bg-green-50'
                                : 'border-gray-200'
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>
                              <span className={
                                option === question.correctAnswer
                                  ? 'text-green-700 font-medium'
                                  : 'text-svef-gray'
                              }>
                                {renderMathContent(option) || 'Empty option'}
                              </span>
                              {option === question.correctAnswer && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <h4 className="font-medium text-svef-gray text-sm mb-2">
                        Explanation
                      </h4>
                      <p className="text-sm text-svef-gray">
                        {renderMathContent(question.explanation) || 'No explanation provided'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-svef-gray">
                      <span className="px-2 py-1 bg-svef-beige/30 rounded-md">
                        {question.type || 'No type'}
                      </span>
                      <span className="px-2 py-1 bg-svef-beige/30 rounded-md">
                        {question.subtopic || 'No subtopic'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Question Button */}
            <div className="text-center">
              <button
                onClick={handleAddQuestion}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-svef-gray">
            {editedQuestions.length} questions • Estimated time: {Math.ceil(editedQuestions.length * 2.5)} minutes
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                debugLog('Closing quiz editor');
                onClose();
              }}
              disabled={isSaving || isActivating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            
            <button
              onClick={handleSaveChanges}
              disabled={isSaving || isActivating || editingIndex !== null}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                "bg-svef-purple text-white hover:bg-svef-purple/90",
                "focus:outline-none focus:ring-2 focus:ring-svef-purple focus:ring-offset-2",
                (isSaving || isActivating || editingIndex !== null) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
            
            {!quiz.isActive && (
              <button
                onClick={handleActivate}
                disabled={isSaving || isActivating || editingIndex !== null}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  "bg-green-600 text-white hover:bg-green-700",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
                  (isSaving || isActivating || editingIndex !== null) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isActivating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isActivating ? 'Activating...' : 'Activate Assessment'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}