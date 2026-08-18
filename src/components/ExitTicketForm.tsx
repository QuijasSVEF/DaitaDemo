import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ClipboardCheck, AlertCircle, BarChart, GraduationCap } from 'lucide-react';
import { cn } from '../utils/cn';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase/config';
import { useQueryClient } from '@tanstack/react-query';
import { getLatestQuizAttempt, getQuizStandards, processQuizAnswersForAnalysis } from '../services/supabase/quizzes';
import { generateLessonPlan } from '../services/lessonPlanService';
import { automatedWorkflow } from '../services/assessment/automatedWorkflow';

interface ExitTicketFormData {
  struggledAreas: string;
  lastLesson?: string;
  score?: number;
  totalQuestions?: number;
}

interface Props {
  onSubmit: (data: ExitTicketFormData) => void;
  studentId: number;
  teacherUsername: string;
}

export function ExitTicketForm({ onSubmit, studentId, teacherUsername }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingLessonPlan, setIsGeneratingLessonPlan] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const queryClient = useQueryClient();
  const [isLoadingQuizAttempt, setIsLoadingQuizAttempt] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ExitTicketFormData>();

  // Fetch latest quiz attempt
  const { data: quizAttempt } = useQuery({
    queryKey: ['latestQuizAttempt', studentId, teacherUsername],
    queryFn: () => getLatestQuizAttempt(studentId, teacherUsername),
    staleTime: 60000, // 1 minute
    enabled: !!studentId && !!teacherUsername
  });

  // Fetch standards for quiz questions
  const { data: standards } = useQuery({
    queryKey: ['quizStandards', quizAttempt?.id],
    queryFn: () => quizAttempt ? getQuizStandards(quizAttempt.id) : null,
    enabled: !!quizAttempt,
    staleTime: 60000 // 1 minute
  });
  
  // Process quiz answers for analysis
  const { data: quizAnalysis } = useQuery({
    queryKey: ['quizAnalysis', quizAttempt?.id],
    queryFn: () => quizAttempt ? processQuizAnswersForAnalysis(quizAttempt.id) : null,
    enabled: !!quizAttempt,
    staleTime: 60000 // 1 minute
  });

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('grade_level')
          .eq('id', studentId)
          .eq('teacher_username', teacherUsername)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching student data:', error);
          // Use default grade level if student data not found
          setStudentData({ grade_level: '6' });
          return;
        }
        
        if (data) {
          setStudentData(data);
        } else {
          // If no student data found, use default grade level
          console.log('No student data found, using default grade level');
          setStudentData({ grade_level: '9' });
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
        // Use default grade level if error occurs
        setStudentData({ grade_level: '9' });
      }
    };
    
    fetchStudentData();
  }, [studentId, teacherUsername]);

  // When quiz attempt data is loaded, update the form data
  useEffect(() => {
    if (quizAttempt) {
      // Set the score and total questions from quiz attempt
      setValue('score', quizAttempt.score || 0);
      setValue('totalQuestions', quizAttempt.total_questions || quizAttempt.totalQuestions || 1);
    }
    
    // Set the struggled areas from quiz analysis
    if (quizAnalysis && quizAnalysis.struggleAreas) {
      setValue('struggledAreas', quizAnalysis.struggleAreas.join(', '));
    }
  }, [quizAttempt, quizAnalysis, setValue]);

  const handleFormSubmit = async (data: ExitTicketFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      console.log('Submitting exit ticket for student:', studentId);

      // Prepare the struggled areas
      const struggledAreas = Array.isArray(data.struggledAreas) 
        ? data.struggledAreas 
        : data.struggledAreas.split(',').map(s => s.trim()).filter(Boolean);
      
      console.log('Struggled areas:', struggledAreas);
      
      // Save exit ticket
      try {
        const { data: exitTicket, error: exitTicketError } = await supabase
          .from('exit_tickets')
          .insert({
            student_id: studentId,
            teacher_username: teacherUsername,
            score: data.score || 0,
            total_questions: data.totalQuestions || 1,
            struggled_areas: struggledAreas,
            last_lesson: data.lastLesson || 'Formative Assessment'
          })
          .select()
          .single();

        if (exitTicketError) {
          console.error('Error creating exit ticket:', exitTicketError);
          throw new Error('Failed to create exit ticket: ' + exitTicketError.message);
        }
        
        if (!exitTicket) {
          throw new Error('Failed to create exit ticket: No data returned');
        }

        console.log('Exit ticket created successfully with ID:', exitTicket.id);

        // Call onSubmit to move to the next step immediately
        onSubmit(data);
        
        // Trigger automated workflow for exit ticket processing
        setIsGeneratingLessonPlan(true);
        try {
          // Create a mock quiz attempt data structure for the workflow
          const mockAnswers = struggledAreas.map((area, index) => ({
            questionId: `exit_ticket_${index}`,
            questionText: `Question about ${area}`,
            questionSubtopic: area,
            answer: 'Incorrect',
            correct: false
          }));

          await automatedWorkflow.processAssessmentCompletion({
            studentId,
            teacherUsername,
            templateId: 'exit_ticket',
            score: data.score || 0,
            totalQuestions: data.totalQuestions || 1,
            answers: mockAnswers,
            gradeLevel: studentData?.grade_level || '6'
          });

          console.log('✅ Exit ticket workflow completed successfully');
        } catch (workflowError) {
          console.error('❌ Error in exit ticket workflow:', workflowError);
        } finally {
          setIsGeneratingLessonPlan(false);
        }

      } catch (insertError) {
        console.error('Error in exit ticket creation:', insertError);
        throw insertError;
      }
      
    } catch (error) {
      console.error('Error submitting exit ticket:', error);
      setError(error instanceof Error ? error.message : 'Failed to save exit ticket and lesson plan');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <ClipboardCheck className="w-6 h-6 text-svef-purple" />
          <h2 className="font-oswald text-2xl font-medium text-svef-gray">
            {quizAttempt ? 'Quiz Results & Areas of Struggle' : 'Student Areas of Struggle'}
          </h2>
        </div>

        {quizAttempt && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <BarChart className="w-6 h-6 text-svef-purple" />
                  <h3 className="font-medium text-svef-gray">Latest Assessment Results</h3>
                </div>
                {quizAttempt.completed_at && (
                  <p className="text-sm text-svef-gray mt-1">
                    Completed on {new Date(quizAttempt.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-oswald text-svef-purple">
                  {quizAttempt.score}/{quizAttempt.totalQuestions}
                </p>
                <p className="text-sm text-svef-gray">
                  {Math.round((quizAttempt.score / quizAttempt.totalQuestions) * 100)}% Score
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="font-medium text-svef-gray mb-3">Assessment Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-svef-gray">
                    <span className="font-medium">Title:</span> {quizAttempt.quiz_templates.title}
                  </p>
                  <p className="text-sm text-svef-gray mt-1">
                    <span className="font-medium">Topic:</span> {quizAttempt.quiz_templates.topic}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-svef-gray">
                    <span className="font-medium">Subtopics:</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {quizAttempt.quiz_templates.subtopics.map((subtopic, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-svef-beige/30 rounded-md text-xs text-svef-gray"
                      >
                        {subtopic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {quizAttempt.answers?.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h4 className="font-medium text-svef-gray mb-3">Question Analysis</h4>
                {quizAttempt.answers.some(answer => !answer.correct) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-red-800 mb-4">Incorrect Questions:</h5>
                        <ul className="space-y-4">
                          {quizAttempt.answers
                            .filter(answer => !answer.correct)
                            .map((answer, i) => (
                              <li key={i} className="bg-white rounded-lg p-3 shadow-sm">
                                <div className="flex items-start space-x-3">
                                  <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-sm text-red-700 mb-2">
                                      {answer.questionText}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md">
                                        {answer.questionSubtopic}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {quizAttempt.answers.some(answer => !answer.correct) && (
                  <div className="mt-4 bg-red-50 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-red-800 mb-2">Areas of Struggle:</h5>
                        {standards && standards.length > 0 && (
                          <>
                            {standards.map((standard, idx) => (
                              <div key={idx} className="flex items-center space-x-2 mb-2">
                                <GraduationCap className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-red-600">
                                  Standard: {standard.standardCode}
                                </span>
                              </div>
                            ))}
                          </>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {quizAnalysis && quizAnalysis.struggleAreas && 
                            quizAnalysis.struggleAreas.map((area, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-md"
                              >
                                {area}
                              </span>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="hidden"
            {...register('score')}
          />
          <input
            type="hidden"
            {...register('totalQuestions')}
          />
          {!quizAttempt && (
            <div>
              <label htmlFor="lastLesson" className="block font-open-sans text-sm font-medium text-svef-gray">
                Lesson Topic
              </label>
              <input
                type="text"
                {...register('lastLesson', {
                  required: !quizAttempt && 'Lesson topic is required'
                })}
                className={cn(
                  "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-green focus:border-svef-green",
                  errors.lastLesson ? "border-red-300" : "border-gray-300"
                )}
                placeholder="Enter the lesson topic..."
              />
              {errors.lastLesson && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>{errors.lastLesson.message}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="struggledAreas" className="block font-open-sans text-sm font-medium text-svef-gray">
              {quizAttempt ? 'Additional Areas of Struggle (Optional)' : 'Areas of Struggle'}
            </label>
            <textarea
              {...register('struggledAreas', {
                required: !quizAttempt,
                validate: value => {
                  if (!quizAttempt && !value?.trim()) {
                    return 'Please specify at least one area of struggle';
                  }
                  return true;
                }
              })}
              rows={3}
              className={cn(
                "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-green focus:border-svef-green",
                errors.struggledAreas ? "border-red-300" : "border-gray-300"
              )}
              placeholder="Enter any additional concepts or skills the student struggled with, separated by commas..."
            />
            {errors.struggledAreas && (
              <div className="mt-1 flex items-center text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span>{errors.struggledAreas.message}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm",
            "font-open-sans text-sm font-medium text-white",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-svef-green",
            isSubmitting
              ? "bg-svef-green/70 cursor-not-allowed"
              : "bg-svef-green hover:bg-svef-green/90"
          )}
        >
          {isSubmitting ? 'Generating...' : 'Generate UDL Lesson Plan'}
        </button>
      </form>
      
      {isGeneratingLessonPlan && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <p className="text-sm text-blue-700">
              Generating and saving lesson plan in the background. All data will be updated automatically.
            </p>
          </div>
        </div>
      )}
    </>
  );
}